import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newsletter, Template } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  
  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: ["/api/templates", newsletter?.templateId],
    enabled: !!newsletter?.templateId,
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
          <div className="text-center text-muted-foreground">
            Newsletter not found
          </div>
        </main>
      </div>
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
              <Button variant="outline">Edit</Button>
              <Button>Schedule</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="prose prose-lg max-w-none">
                {/* Here we would inject the newsletter content with the tweets */}
                <div dangerouslySetInnerHTML={{ __html: template.content }} />
                
                {newsletter.tweetContent && (
                  <div className="mt-8 space-y-4">
                    <h2>Curated Tweets</h2>
                    {newsletter.tweetContent.map((tweet: any) => (
                      <div key={tweet.id} className="border p-4 rounded-lg">
                        {tweet.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
