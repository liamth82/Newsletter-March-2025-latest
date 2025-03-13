import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newsletter, Template, TweetFilters, NarrativeSettings } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';

// Update the fetch tweets mutation to use proper types
interface FetchTweetsPayload {
  keywords: string[];
  verifiedOnly: boolean;
  minFollowers: number;
  excludeReplies: boolean;
  excludeRetweets: boolean;
  safeMode: boolean;
  newsOutlets: string[];
}

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: [`/api/templates/${newsletter?.templateId}`],
    enabled: !!newsletter?.templateId,
  });

  const fetchTweetsMutation = useMutation({
    mutationFn: async () => {
      if (!newsletter) throw new Error('Newsletter not found');

      const filters: TweetFilters = newsletter.tweetFilters || {
        verifiedOnly: false,
        minFollowers: 0,
        excludeReplies: false,
        excludeRetweets: false,
        safeMode: true,
        newsOutlets: []
      };

      const requestData: FetchTweetsPayload = {
        keywords: newsletter.keywords,
        ...filters,
        newsOutlets: filters.newsOutlets.map((outlet: string) => {
          const match = outlet.match(/(?:x\.com\/|twitter\.com\/)([^\/]+)/);
          return match ? match[1] : outlet.replace(/^@/, '');
        })
      };

      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, requestData);
      if (!res.ok) {
        throw new Error('Failed to fetch tweets');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters/${id}`] });
      toast({
        title: "Success",
        description: "Newsletter content updated with latest tweets.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingNewsletter || loadingTemplate) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  if (!newsletter || !template) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <p>Newsletter or template not found</p>
          </div>
        </main>
      </div>
    );
  }

  // Generate tweet content before processing template
  const tweetContent = generateNarrativeSummary(
    newsletter.tweetContent,
    newsletter.narrativeSettings || {
      style: 'professional',
      wordCount: 300,
      tone: 'formal',
      paragraphCount: 6
    }
  );

  // Process template content with Handlebars-like replacements
  let processedContent = template.content;

  // Replace newsletter title
  processedContent = processedContent.replace(
    /{{newsletter_title}}/g,
    template.defaultTitle || 'Newsletter Preview'
  );

  // Replace tweets placeholder with generated content
  processedContent = processedContent.replace(/{{tweets}}/g, tweetContent);

  // Handle logos section
  if (template.logos?.length) {
    const logoHtml = template.logos
      .map(logo => `<img src="${logo}" alt="Logo" class="logo" />`)
      .join('');
    processedContent = processedContent.replace(
      /{{#each logos}}[\s\S]*?{{\/each}}/g,
      logoHtml
    );
  } else {
    // If no logos, remove the logo container
    processedContent = processedContent.replace(
      /<div class="logo-container">[\s\S]*?<\/div>/,
      ''
    );
  }

  // Apply styles
  const styles = `
    <style>
      .newsletter-content {
        font-family: ui-sans-serif, system-ui, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
      }
      .newsletter-section {
        padding: 1rem;
        margin-bottom: 1.5rem;
      }
      h1 {
        font-size: 2rem;
        font-weight: bold;
        color: hsl(var(--primary));
        margin-bottom: 1.5rem;
      }
      p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }
      .logo-container {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      .logo {
        max-height: 50px;
        width: auto;
      }
    </style>
  `;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Newsletter Preview</h1>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.history.back()}>
                Back
              </Button>
              <Button
                onClick={() => fetchTweetsMutation.mutate()}
                disabled={fetchTweetsMutation.isPending}
              >
                {fetchTweetsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Refresh Content
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div 
                className="preview-content newsletter-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(styles + processedContent)
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Helper function to generate narrative content from tweets
function generateNarrativeSummary(tweets: any[], settings: NarrativeSettings) {
  if (!tweets || tweets.length === 0) {
    return '<div class="newsletter-section"><p class="text-muted-foreground">No news content available. Try fetching tweets or adjusting your filters.</p></div>';
  }

  // Clean and sort tweets by date
  const cleanedTweets = tweets
    .map(tweet => ({
      author: tweet.author_username,
      text: tweet.text
        .replace(/RT @\w+: /, '')
        .replace(/https:\/\/t\.co\/\w+/g, '')
        .replace(/\n+/g, ' ')
        .trim(),
      date: new Date(tweet.created_at)
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const transitions: Record<NarrativeSettings['style'], string[]> = {
    professional: [
      "Furthermore, %author% indicates that",
      "According to %author%'s analysis,",
      "As reported by %author%,",
      "%author% emphasizes that"
    ],
    casual: [
      "Meanwhile, %author% says",
      "%author% chimes in with",
      "%author% also mentions that",
      "Adding to this, %author% points out"
    ],
    storytelling: [
      "The story continues as %author% reveals",
      "Adding to the narrative, %author% shares",
      "In an interesting twist, %author% notes",
      "The plot thickens when %author% explains"
    ]
  };

  const openings: Record<NarrativeSettings['style'], string> = {
    professional: "In recent developments, %author% reports that",
    casual: "Here's what's new: %author% tells us that",
    storytelling: "Our story begins as %author% reveals that"
  };

  const conclusions: Record<NarrativeSettings['style'], string> = {
    professional: "Finally, %author% concludes that",
    casual: "To wrap things up, %author% adds that",
    storytelling: "The story concludes as %author% shares that"
  };

  const getTransition = (style: NarrativeSettings['style'], index: number) => {
    return transitions[style][index % transitions[style].length];
  };

  const paragraphs = cleanedTweets
    .slice(0, settings.paragraphCount)
    .map((tweet, index) => {
      const sentence = tweet.text.charAt(0).toUpperCase() + tweet.text.slice(1);
      let paragraph = '';

      if (index === 0) {
        paragraph = openings[settings.style].replace('%author%', tweet.author) + ' ' + sentence;
      } else if (index === settings.paragraphCount - 1) {
        paragraph = conclusions[settings.style].replace('%author%', tweet.author) + ' ' + sentence;
      } else {
        const transition = getTransition(settings.style, index).replace('%author%', tweet.author);
        paragraph = `${transition} ${sentence}`;
      }

      const toneClass = settings.tone === 'formal' ? 'text-gray-800' : 'text-gray-700';
      return `<p class="mb-6 ${toneClass} leading-relaxed">${paragraph}</p>`;
    })
    .join('\n');

  return `
    <div class="narrative-content">
      <div class="prose max-w-none">
        <h2 class="text-2xl font-semibold mb-4">Latest Updates</h2>
        ${paragraphs}
        <div class="text-sm text-muted-foreground mt-8">
          Last updated: ${new Date().toLocaleString()}
        </div>
      </div>
    </div>
  `;
}