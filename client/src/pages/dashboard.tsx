import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
import { NewsletterForm } from "@/components/newsletter-form";
import { Dialog } from "@/components/ui/dialog";
import { Newsletter } from "@shared/schema";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const isMobile = useIsMobile();

  const { data: newsletters, isLoading } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters"],
  });

  const handleEditComplete = () => {
    setEditingNewsletter(null);
    setDialogOpen(false);
  };

  const handleEdit = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingNewsletter(null);
    setDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <SidebarNav />
      <main className={`flex-1 p-4 md:p-6 ${isMobile ? 'mt-16' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Newsletters</h1>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Newsletter
          </Button>
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
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-ellipsis overflow-hidden">{newsletter.name}</span>
                    <Badge
                      variant={newsletter.status === "draft" ? "secondary" : "default"}
                      className="shrink-0"
                    >
                      {newsletter.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {newsletter.keywords.slice(0, isMobile ? 3 : 6).map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {newsletter.keywords.length > (isMobile ? 3 : 6) && (
                        <Badge variant="outline" className="text-xs">
                          +{newsletter.keywords.length - (isMobile ? 3 : 6)} more
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {newsletter.scheduleTime
                        ? `Scheduled: ${new Date(newsletter.scheduleTime).toLocaleDateString()}`
                        : "Not scheduled"}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(newsletter)}
                      >
                        <Edit className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
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
                        <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Refresh</span>
                      </Button>
                      <Link href={`/preview/${newsletter.id}`}>
                        <Button size="sm">
                          <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Preview</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <NewsletterForm
            onSuccess={handleEditComplete}
            newsletter={editingNewsletter}
          />
        </Dialog>
      </main>
    </div>
  );
}