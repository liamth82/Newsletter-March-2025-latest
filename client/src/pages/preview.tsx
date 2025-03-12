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

  // Add base styling
  const baseStyles = `
    <style>
      .tweet {
        border: 1px solid hsl(var(--border));
        transition: all 0.2s ease-in-out;
        margin-bottom: 1rem;
        padding: 1rem;
        background-color: hsl(var(--card));
        border-radius: 0.5rem;
      }
      .tweet:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .tweet-content {
        word-break: break-word;
      }
      .tweet-metadata {
        border-top: 1px solid hsl(var(--border));
        padding-top: 0.5rem;
        margin-top: 0.5rem;
        color: hsl(var(--muted-foreground));
      }
      .newsletter-section {
        margin-bottom: 2rem;
      }
    </style>
  `;

  // Add custom template styles
  const templateStyles = Object.entries(template.styles || {})
    .map(([selector, styles]) => {
      const styleRules = Object.entries(styles as Record<string, string>)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(" ");
      return `${selector} { ${styleRules} }`;
    })
    .join("\n");

  // Start with base template content
  let processedContent = template.content || '';

  // Replace newsletter title
  processedContent = processedContent.replace(
    /{{newsletter_title}}/g, 
    newsletter.title || 'Newsletter'
  );

  // Process tweet content
  let tweetContent = '<div class="p-4 border rounded bg-muted"><p class="text-muted-foreground">No tweets available</p></div>';

  if (Array.isArray(newsletter.tweetContent) && newsletter.tweetContent.length > 0) {
    console.log('Processing tweets:', newsletter.tweetContent);
    tweetContent = newsletter.tweetContent
      .map((tweet: any) => `
        <div class="tweet">
          <div class="tweet-content">
            <p class="text-base">${tweet.text}</p>
            <div class="tweet-metadata flex items-center gap-2 text-sm">
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
      .join("\n");
  }

  // Replace tweet placeholder with actual content
  processedContent = processedContent.replace(/{{tweets}}/g, tweetContent);

  // Handle logos if present
  if (template.logos && template.logos.length > 0) {
    const logoHtml = template.logos
      .map(logo => `<img src="${logo}" alt="Logo" class="logo" />`)
      .join("");
    processedContent = processedContent.replace(
      /{{#each logos}}.*?{{\/each}}/s,
      logoHtml
    );
  }

  // Combine all styles and content
  const finalContent = `
    ${baseStyles}
    <style>${templateStyles}</style>
    ${processedContent}
  `;

  console.log('Final processed content:', finalContent);

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Newsletter Preview</h1>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
              <Button 
                onClick={() => fetchTweetsMutation.mutate()}
                disabled={fetchTweetsMutation.isPending}
              >
                {fetchTweetsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Fetch Tweets
              </Button>
              <Button>Schedule</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="prose prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: finalContent }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}