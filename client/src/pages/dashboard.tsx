import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
import { NewsletterForm } from "@/components/newsletter-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Newsletter } from "@shared/schema";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);

  const { data: newsletters, isLoading } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters"],
  });

  const handleEditComplete = () => {
    setEditingNewsletter(null);
    setIsCreateOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Newsletters</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {editingNewsletter ? "Edit Newsletter" : "Create Newsletter"}
              </Button>
            </DialogTrigger>
            <NewsletterForm 
              onSuccess={handleEditComplete}
              newsletter={editingNewsletter}
            />
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsletters?.map((newsletter) => (
              <Card key={newsletter.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Newsletter #{newsletter.id}
                    <Badge
                      variant={newsletter.status === "draft" ? "secondary" : "default"}
                    >
                      {newsletter.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {newsletter.keywords.map((keyword, i) => (
                        <Badge key={i} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Scheduled for:{" "}
                      {newsletter.scheduleTime
                        ? new Date(newsletter.scheduleTime).toLocaleString()
                        : "Not scheduled"}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingNewsletter(newsletter);
                          setIsCreateOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Refreshing tweets...",
                            description: "Fetching latest content based on keywords",
                          });
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.href = `/preview/${newsletter.id}`;
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}