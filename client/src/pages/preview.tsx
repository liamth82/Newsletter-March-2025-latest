import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newsletter, Template } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
    retry: 1,
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: ["/api/templates", newsletter?.templateId],
    enabled: !!newsletter?.templateId,
  });

  const fetchTweetsMutation = useMutation({
    mutationFn: async () => {
      console.log('Fetching tweets with keywords:', newsletter?.keywords);
      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, {
        keywords: newsletter?.keywords || ["technology"]
      });
      if (!res.ok) {
        throw new Error('Failed to fetch tweets');
      }
      const data = await res.json();
      console.log('Received response from tweet fetch:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Updating newsletter data with tweets:', data);
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
    console.log('Newsletter or template not found');
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Newsletter Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The newsletter you're looking for could not be found. It may have been deleted or the ID might be incorrect.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  console.log('Current newsletter state:', newsletter);
  console.log('Current template state:', template);

  // Generate the preview content
  let finalContent = template.content;
  console.log('Starting template content:', finalContent);

  // Replace newsletter title
  const title = "Newsletter Preview";
  finalContent = finalContent.replace(/{{newsletter_title}}/g, title);
  console.log('After title replacement:', finalContent);

  // Process tweets
  let tweetSection = '';
  if (Array.isArray(newsletter.tweetContent) && newsletter.tweetContent.length > 0) {
    console.log('Processing tweets:', newsletter.tweetContent.length, 'tweets found');
    tweetSection = newsletter.tweetContent
      .map(tweet => `
        <div class="tweet">
          <div class="tweet-content">
            <p>${tweet.text}</p>
            <div class="tweet-metadata">
              <span>${new Date(tweet.created_at).toLocaleString()}</span>
              ${tweet.metrics ? `
                <span>•</span>
                <span>${tweet.metrics.like_count} likes</span>
                <span>•</span>
                <span>${tweet.metrics.retweet_count} retweets</span>
              ` : ''}
            </div>
          </div>
        </div>
      `)
      .join('');
  } else {
    console.log('No tweets found in newsletter');
    tweetSection = `
      <div class="no-tweets-message">
        <p>No tweets available. Click "Fetch Tweets" to load content.</p>
      </div>
    `;
  }

  // Replace tweets placeholder
  finalContent = finalContent.replace(/{{tweets}}/g, tweetSection);
  console.log('After tweet replacement:', finalContent);

  // Add styling
  const styles = `
    <style>
      .tweet {
        border: 1px solid #e2e8f0;
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 0.5rem;
        background-color: white;
      }
      .tweet-content p {
        margin-bottom: 0.5rem;
        line-height: 1.5;
      }
      .tweet-metadata {
        color: #64748b;
        font-size: 0.875rem;
        display: flex;
        gap: 0.5rem;
        align-items: center;
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

  finalContent = styles + finalContent;
  console.log('Final content length:', finalContent.length);

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Newsletter Preview</h1>
            <div className="space-x-2">
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
                Fetch Tweets
              </Button>
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