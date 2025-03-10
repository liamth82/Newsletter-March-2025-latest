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
      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, {
        keywords: ["technology"]
      });
      return res.json();
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

  let processedContent = template.content || '';

  // Add styling to the content
  const styleSheet = Object.entries(template.styles || {})
    .map(([selector, styles]) => {
      const styleRules = Object.entries(styles as Record<string, string>)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(" ");
      return `${selector} { ${styleRules} }`;
    })
    .join("\n");

  processedContent = `<style>${styleSheet}</style>${processedContent}`;

  // Replace newsletter title
  processedContent = processedContent.replace(/{{newsletter_title}}/g, newsletter.title || 'Newsletter');

  // Handle tweet content replacement
  if (Array.isArray(newsletter.tweetContent) && newsletter.tweetContent.length > 0) {
    console.log('Replacing tweets with:', newsletter.tweetContent);
    const tweetHtml = newsletter.tweetContent
      .map((tweet: any) => `
        <div class="tweet">
          <p>${tweet.text}</p>
          <div class="text-sm text-muted-foreground mt-2">
            ${new Date(tweet.created_at).toLocaleTimeString()}
            ${tweet.metrics ? ` • ${tweet.metrics.like_count} likes` : ''}
          </div>
        </div>
      `)
      .join("");

    processedContent = processedContent.replace(/{{tweets}}/g, tweetHtml);
  } else {
    console.log('No tweets found in newsletter content');
    processedContent = processedContent.replace(
      /{{tweets}}/g,
      `<div class="p-4 border rounded bg-muted">
        <p class="text-muted-foreground">No tweets found. Try updating your keywords or fetch tweets again.</p>
       </div>`
    );
  }

  // Handle logo placeholder if present
  if (template.logos && template.logos.length > 0) {
    const logoHtml = template.logos
      .map(logo => `<img src="${logo}" alt="Logo" class="logo" />`)
      .join("");
    processedContent = processedContent.replace(
      /{{#each logos}}.*?{{\/each}}/s,
      logoHtml
    );
  }

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
                <div dangerouslySetInnerHTML={{ __html: processedContent }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}