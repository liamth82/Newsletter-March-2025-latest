import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newsletter, Template } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TweetFilters } from "@/components/tweet-filters";
import { NarrativeSettings, type NarrativeSettings as NarrativeSettingsType } from "@/components/narrative-settings";
import { useState } from "react";

function generateNarrativeSummary(tweets: any[], settings: NarrativeSettingsType) {
  if (!tweets || tweets.length === 0) {
    return '<p class="text-muted-foreground">No news content available. Try fetching tweets or adjusting your filters.</p>';
  }

  // Clean and sort tweets by date
  const cleanedTweets = tweets.map(tweet => ({
    author: tweet.author_username,
    text: tweet.text
      .replace(/RT @\w+: /, '')
      .replace(/https:\/\/t\.co\/\w+/g, '')
      .replace(/\n+/g, ' ')
      .trim(),
    date: new Date(tweet.created_at)
  })).sort((a, b) => b.date.getTime() - a.date.getTime());

  // Get transition phrases based on style and tone
  const getTransitions = () => {
    if (settings.style === 'professional' && settings.tone === 'formal') {
      return [
        "Furthermore, %author% indicates that",
        "According to %author%'s analysis,",
        "As reported by %author%,",
        "%author% emphasizes that"
      ];
    } else if (settings.style === 'storytelling') {
      return [
        "The story continues as %author% reveals",
        "Adding to the narrative, %author% shares",
        "In an interesting twist, %author% notes",
        "The plot thickens when %author% explains"
      ];
    } else {
      return [
        "Meanwhile, %author% says",
        "%author% chimes in with",
        "%author% also mentions that",
        "Adding to this, %author% points out"
      ];
    }
  };

  // Create a narrative summary
  const narrative = `
    <div class="narrative-content">
      <div class="prose max-w-none">
        <h2 class="text-2xl font-semibold mb-4">Latest Updates</h2>

        ${cleanedTweets.reduce((content, tweet, index) => {
          // Only use the specified number of paragraphs
          if (index >= settings.paragraphCount) return content;

          const sentence = tweet.text.charAt(0).toUpperCase() + tweet.text.slice(1);
          let paragraph = '';

          // Add source attribution in a style-appropriate way
          if (index === 0) {
            const openings = {
              professional: `In recent developments, ${tweet.author} reports that`,
              casual: `Here's what's new: ${tweet.author} tells us that`,
              storytelling: `Our story begins as ${tweet.author} reveals that`
            };
            paragraph = `${openings[settings.style]} ${sentence}`;
          } else if (index === settings.paragraphCount - 1) {
            const conclusions = {
              professional: `Finally, ${tweet.author} concludes that`,
              casual: `To wrap things up, ${tweet.author} adds that`,
              storytelling: `The story concludes as ${tweet.author} shares that`
            };
            paragraph = `${conclusions[settings.style]} ${sentence}`;
          } else {
            const transitions = getTransitions();
            const transition = transitions[index % transitions.length].replace('%author%', tweet.author);
            paragraph = `${transition} ${sentence}`;
          }

          return content + `<p class="mb-6 text-gray-700 leading-relaxed">${paragraph}</p>`;
        }, '')}

        <div class="text-sm text-muted-foreground mt-8">
          Last updated: ${cleanedTweets[0].date.toLocaleString()}
        </div>
      </div>
    </div>
  `;

  return narrative;
}

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [narrativeSettings, setNarrativeSettings] = useState<NarrativeSettingsType>({
    style: 'professional',
    wordCount: 300,
    tone: 'formal',
    paragraphCount: 6
  });

  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
  });

  const { data: template } = useQuery<Template>({
    queryKey: [`/api/templates/${newsletter?.templateId}`],
    enabled: !!newsletter?.templateId,
  });

  const fetchTweetsMutation = useMutation({
    mutationFn: async (filters: any) => {
      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, {
        keywords: newsletter?.keywords || ["technology"],
        ...filters
      });
      if (!res.ok) {
        throw new Error('Failed to fetch tweets');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/newsletters/${id}`], data);
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

  // Base template
  const baseTemplate = `
    <div class="newsletter-content max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">{{newsletter_title}}</h1>
      {{tweets}}
    </div>
  `;

  // Add styling
  const styles = `
    <style>
      .newsletter-content {
        font-family: system-ui, -apple-system, sans-serif;
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
    </style>
  `;

  // Process the content
  const templateContent = template?.content || baseTemplate;
  let finalContent = templateContent.replace(/{{newsletter_title}}/g, 'Newsletter Preview');


  finalContent = finalContent.replace(/{{tweets}}/g, generateNarrativeSummary(newsletter?.tweetContent || [], narrativeSettings));


  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold">Newsletter Preview</h1>
            </div>
            <div className="space-y-4">
              <TweetFilters
                onFiltersChange={(filters) => fetchTweetsMutation.mutate(filters)}
              />
              <NarrativeSettings
                settings={narrativeSettings}
                onChange={setNarrativeSettings}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Back
                </Button>
                <Button
                  onClick={() => fetchTweetsMutation.mutate({})}
                  disabled={fetchTweetsMutation.isPending}
                >
                  {fetchTweetsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Fetch Tweets
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{
                  __html: styles + finalContent
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}