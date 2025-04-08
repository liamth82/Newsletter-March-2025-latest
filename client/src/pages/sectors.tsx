import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, List, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { NewsOutletsManager } from "@/components/news-outlets-manager";
import { PreDefinedSectorsDialog } from "@/components/pre-defined-sectors-dialog";
import { Sector } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SidebarNav } from "@/components/sidebar-nav";

export default function SectorsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPredefinedDialogOpen, setIsPredefinedDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [handles, setHandles] = useState<string[]>([]);

  const { data: sectors = [], isLoading } = useQuery<Sector[]>({
    queryKey: ["/api/sectors"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; handles: string[] }) => {
      const res = await apiRequest("POST", "/api/sectors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Sector created successfully",
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
  
  // Create default sectors mutation
  const createDefaultSectorsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sectors/create-defaults");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      toast({
        title: "Success",
        description: "Default sectors created successfully",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Sector> }) => {
      const res = await apiRequest("PATCH", `/api/sectors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Sector updated successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sectors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      toast({
        title: "Success",
        description: "Sector deleted successfully",
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setHandles([]);
    setEditingSector(null);
  };

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector);
    setName(sector.name);
    setDescription(sector.description || "");
    setHandles(sector.handles);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, description, handles };

    if (editingSector) {
      updateMutation.mutate({ id: editingSector.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex-1 container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sectors</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPredefinedDialogOpen(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Browse & Customize Sectors
            </Button>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Sector
            </Button>
          </div>
        </div>
        
        {sectors.length === 0 && (
          <div className="bg-muted p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-2">Get Started with Pre-made Sectors</h2>
            <p className="text-muted-foreground mb-4">
              Sectors allow you to organize Twitter handles by industry for better content filtering. 
              Add pre-made sectors with curated Twitter handles for popular industries like Tech, Finance, Healthcare, and more.
            </p>
            <Button 
              onClick={() => setIsPredefinedDialogOpen(true)}
              className="mt-2"
            >
              Browse & Add Pre-made Sectors
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((sector) => (
            <Card key={sector.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{sector.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(sector)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(sector.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {sector.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sector.handles.map((handle) => (
                    <span
                      key={handle}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                    >
                      @{handle}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSector ? "Edit Sector" : "Create New Sector"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter sector name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter sector description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter Handles</Label>
                  <NewsOutletsManager
                    value={handles}
                    onChange={setHandles}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSector ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Pre-defined sectors dialog */}
        <PreDefinedSectorsDialog
          open={isPredefinedDialogOpen}
          onOpenChange={setIsPredefinedDialogOpen}
        />
      </div>
    </div>
  );
}