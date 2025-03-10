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
    retry: 1, // Only retry once if the newsletter is not found
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: ["/api/templates", newsletter?.templateId],
    enabled: !!newsletter?.templateId,
  });

  const fetchTweetsMutation = useMutation({
    mutationFn: async () => {
      if (!newsletter?.keywords?.length) {
        throw new Error("No keywords specified");
      }
      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, {
        keywords: newsletter.keywords
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

  // Process tweet content for display
  const processedContent = template.content?.replace(
    "{{tweets}}",
    newsletter.tweetContent?.length
      ? newsletter.tweetContent
          .map((tweet: any) => `<div class="tweet">${tweet.text}</div>`)
          .join("")
      : "<p>No tweets added yet.</p>"
  ) || "No content available";

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
                disabled={fetchTweetsMutation.isPending || !newsletter.keywords?.length}
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