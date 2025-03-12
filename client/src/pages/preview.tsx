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

function generateNarrativeSummary(tweets: any[]) {
  if (!tweets || tweets.length === 0) {
    return '<p class="text-muted-foreground">No news content available. Try fetching tweets or adjusting your filters.</p>';
  }

  // Group tweets by source/topic
  const sections = tweets.reduce((acc: any, tweet: any) => {
    const source = tweet.author_username || 'Unknown Source';
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(tweet);
    return acc;
  }, {});

  console.log('Grouped tweets by source:', sections);

  // Generate narrative paragraphs
  let narrative = '';
  Object.entries(sections).forEach(([source, sourceTweets]: [string, any]) => {
    const tweets = sourceTweets as any[];
    if (tweets.length > 0) {
      narrative += `
        <div class="narrative-section mb-6">
          <h3 class="text-lg font-semibold mb-2">Updates from @${source}</h3>
          <div class="prose">
            ${tweets.map(tweet => `
              <p class="mb-4">${tweet.text}</p>
            `).join('')}
          </div>
          <div class="text-sm text-muted-foreground">
            Last updated: ${new Date(tweets[0].created_at).toLocaleString()}
          </div>
        </div>
      `;
    }
  });

  console.log('Generated narrative length:', narrative.length);
  return narrative;
}

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
    retry: 1,
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: [`/api/templates/${newsletter?.templateId}`],
    enabled: !!newsletter?.templateId,
  });

  console.log('Newsletter data:', newsletter);
  console.log('Template data:', template);

  const fetchTweetsMutation = useMutation({
    mutationFn: async (filters: any) => {
      console.log('Fetching tweets with keywords and filters:', {
        keywords: newsletter?.keywords,
        filters
      });
      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, {
        keywords: newsletter?.keywords || ["technology"],
        ...filters
      });
      if (!res.ok) {
        throw new Error('Failed to fetch tweets');
      }
      const data = await res.json();
      console.log('Received response from tweet fetch:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/newsletters/${id}`], data);
      toast({
        title: "Tweets fetched successfully",
        description: "The newsletter content has been updated with new tweets.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to fetch tweets",
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
    console.log('Newsletter or template missing:', { newsletter, template });
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The newsletter or template could not be found. Please try again.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Ensure template content exists and is a string
  if (!template.content || typeof template.content !== 'string') {
    console.error('Invalid template content:', template.content);
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Template</h1>
            <p className="text-muted-foreground mb-8">
              The template content appears to be invalid. Please check the template configuration.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  console.log('Template Content:', {
    id: template.id,
    content: template.content,
    newsletterId: newsletter.id
  });

  // Process the template content
  let processedContent = template.content;

  // Add base styling
  const styles = `
    <style>
      .preview-content {
        font-family: system-ui, -apple-system, sans-serif;
      }
      .narrative-section {
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 1.5rem;
      }
      .narrative-section:last-child {
        border-bottom: none;
      }
      .narrative-section p {
        line-height: 1.6;
        margin-bottom: 1rem;
      }
      .no-tweets-message {
        padding: 2rem;
        text-align: center;
        background-color: #f8fafc;
        border-radius: 0.5rem;
        color: #64748b;
      }
    </style>
  `;

  // Replace newsletter title
  processedContent = processedContent.replace(/{{newsletter_title}}/g, 'Newsletter Preview');

  // Process tweets
  if (Array.isArray(newsletter.tweetContent) && newsletter.tweetContent.length > 0) {
    console.log('Processing tweets:', newsletter.tweetContent);
    const narrativeContent = generateNarrativeSummary(newsletter.tweetContent);
    console.log('Generated narrative content:', narrativeContent);
    processedContent = processedContent.replace(/{{tweets}}/g, narrativeContent);
  } else {
    console.log('No tweets found in newsletter');
    processedContent = processedContent.replace(
      /{{tweets}}/g,
      `<div class="no-tweets-message">
        <p>No tweets available. Click "Fetch Tweets" to load content.</p>
       </div>`
    );
  }

  const finalContent = styles + processedContent;
  console.log('Final content length:', finalContent.length);

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
                className="preview-content prose max-w-none"
                dangerouslySetInnerHTML={{ __html: finalContent }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}