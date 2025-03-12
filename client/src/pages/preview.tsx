import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newsletter, Template } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NarrativeSettings as NarrativeSettingsType } from "@/components/narrative-settings";
import DOMPurify from 'dompurify';

function generateNarrativeSummary(tweets: any[], settings: NarrativeSettingsType) {
  if (!tweets || tweets.length === 0) {
    return '<p class="text-muted-foreground">No news content available. Try fetching tweets or adjusting your filters.</p>';
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

  const transitions = {
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

  const getTransition = (style: string, index: number) => {
    const styleTransitions = transitions[style as keyof typeof transitions] || transitions.professional;
    return styleTransitions[index % styleTransitions.length];
  };

  const paragraphs = cleanedTweets
    .slice(0, settings.paragraphCount)
    .map((tweet, index) => {
      const sentence = tweet.text.charAt(0).toUpperCase() + tweet.text.slice(1);
      let paragraph = '';

      if (index === 0) {
        const openings = {
          professional: `In recent developments, ${tweet.author} reports that`,
          casual: `Here's what's new: ${tweet.author} tells us that`,
          storytelling: `Our story begins as ${tweet.author} reveals that`
        };
        paragraph = `${openings[settings.style as keyof typeof openings] || openings.professional} ${sentence}`;
      } else if (index === settings.paragraphCount - 1) {
        const conclusions = {
          professional: `Finally, ${tweet.author} concludes that`,
          casual: `To wrap things up, ${tweet.author} adds that`,
          storytelling: `The story concludes as ${tweet.author} shares that`
        };
        paragraph = `${conclusions[settings.style as keyof typeof conclusions] || conclusions.professional} ${sentence}`;
      } else {
        const transition = getTransition(settings.style, index).replace('%author%', tweet.author);
        paragraph = `${transition} ${sentence}`;
      }

      return `<p class="mb-6 text-gray-700 leading-relaxed">${paragraph}</p>`;
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

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
  });

  const { data: template } = useQuery<Template>({
    queryKey: [`/api/templates/${newsletter?.templateId}`],
    enabled: !!newsletter?.templateId,
  });

  const fetchTweetsMutation = useMutation({
    mutationFn: async () => {
      const requestData = {
        keywords: newsletter?.keywords || [],
        verifiedOnly: newsletter?.tweetFilters?.verifiedOnly || false,
        minFollowers: newsletter?.tweetFilters?.minFollowers || 0,
        excludeReplies: newsletter?.tweetFilters?.excludeReplies || false,
        excludeRetweets: newsletter?.tweetFilters?.excludeRetweets || false,
        safeMode: newsletter?.tweetFilters?.safeMode || true,
        // Convert full URLs to just handles
        newsOutlets: (newsletter?.tweetFilters?.newsOutlets || []).map(outlet => {
          // Extract handle from URL or use as is if it's already a handle
          const match = outlet.match(/(?:x\.com\/|twitter\.com\/)([^\/]+)/);
          return match ? match[1] : outlet.replace(/^@/, '');
        })
      };

      console.log('Fetching tweets with:', requestData);

      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, requestData);

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to fetch tweets');
        } else {
          // Handle non-JSON error responses
          const text = await res.text();
          throw new Error(`Server error: ${res.status}`);
        }
      }

      const data = await res.json();
      console.log('Received tweet data:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Successfully updated newsletter with tweets:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters/${id}`] });
      toast({
        title: "Success",
        description: "Newsletter content updated with latest tweets.",
      });
    },
    onError: (error: Error) => {
      console.error('Error fetching tweets:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingNewsletter) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

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
      .narrative-content {
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
      }
      .prose {
        max-width: none;
      }
      .prose p {
        margin-bottom: 1.5rem;
        line-height: 1.8;
        color: #374151;
      }
      .prose h2 {
        color: #111827;
        margin-bottom: 1.5rem;
      }
      .newsletter-body {
        margin-top: 2rem;
      }
      h1 {
        font-size: 2rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 1.5rem;
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

  // Process the template content
  let processedContent = template?.content || '';

  // Handle logos if present
  if (template?.logos?.length) {
    const logoHtml = template.logos
      .map(logo => `<img src="${logo}" alt="Logo" class="logo" />`)
      .join('');
    processedContent = processedContent.replace(
      /{{#each logos}}[\s\S]*?{{\/each}}/g,
      logoHtml
    );
  } else {
    // Remove the logo section if no logos
    processedContent = processedContent.replace(
      /<div class="logo-container">[\s\S]*?<\/div>/,
      ''
    );
  }

  // Replace newsletter title
  processedContent = processedContent.replace(
    /{{newsletter_title}}/g,
    template?.defaultTitle || 'Newsletter Preview'
  );

  // Generate and insert tweet content
  const tweetContent = generateNarrativeSummary(
    newsletter?.tweetContent || [],
    newsletter?.narrativeSettings || {
      style: 'professional',
      wordCount: 300,
      tone: 'formal',
      paragraphCount: 6
    }
  );
  processedContent = processedContent.replace(/{{tweets}}/g, tweetContent);

  // Combine styles with content
  const finalContent = styles + processedContent;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Newsletter Preview</h1>
            </div>
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
                className="preview-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(finalContent)
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}