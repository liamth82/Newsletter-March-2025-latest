import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Plus, Minus, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PreDefinedSectorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define structure of a pre-defined sector
interface PreDefinedSector {
  name: string;
  description: string;
  handles: string[];
  isEditing?: boolean;
}

export function PreDefinedSectorsDialog({
  open,
  onOpenChange,
}: PreDefinedSectorsDialogProps) {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("tech-news");
  const [preDefinedSectors, setPreDefinedSectors] = useState<PreDefinedSector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add local state for edited handles
  const [newHandle, setNewHandle] = useState<string>("");
  
  // Mutation to create selected sectors
  const createSectorsMutation = useMutation({
    mutationFn: async (sectors: PreDefinedSector[]) => {
      const results = [];
      for (const sector of sectors) {
        const res = await apiRequest("POST", "/api/sectors", {
          name: sector.name,
          description: sector.description,
          handles: sector.handles
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (createdSectors) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      
      // If we created sectors successfully, use the first one as the active sector
      if (createdSectors && createdSectors.length > 0) {
        // Get the current form values for newsletters if we're on the newsletter form
        const currentFormState = queryClient.getQueryData(['newsletterFormState']);
        const createdSector = createdSectors[0];
        
        console.log("Created sector:", createdSector);
        
        if (currentFormState) {
          // Update the newsletter form state with the new sector ID
          const updatedFormState = {
            ...currentFormState,
            tweetFilters: {
              ...(currentFormState.tweetFilters || {}),
              sectorId: createdSector.id,
              // Use only the handles from the sector
              newsOutlets: [...createdSector.handles]
            }
          };
          
          console.log("Updating newsletter form state with sector:", updatedFormState);
          
          queryClient.setQueryData(['newsletterFormState'], updatedFormState);
          
          // Force a rerender to make sure the sector selection dropdown updates
          // This is needed because the newsletter form might not detect the change
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['newsletterFormState'] });
          }, 100);
        }
      }
      
      toast({
        title: "Success!",
        description: "Selected sectors have been added to your account",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create sectors: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fetch pre-defined sectors from the API
  useEffect(() => {
    const fetchPreDefinedSectors = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest("GET", "/api/sectors/pre-defined");
        const data = await response.json();
        setPreDefinedSectors(
          data.map((sector: PreDefinedSector) => ({
            ...sector,
            isEditing: false,
          }))
        );
      } catch (error) {
        // If the endpoint isn't available yet, use hardcoded data
        // This will be removed once the endpoint is implemented
        const hardcodedSectors: PreDefinedSector[] = [
          {
            name: "Tech News",
            description: "Major technology news outlets and tech journalists",
            handles: [
              "WIRED", "TechCrunch", "TheVerge", "engadget", "mashable", 
              "CNET", "techreview", "FastCompany", "ForbesTech", "BBCTech"
            ],
            isEditing: false
          },
          {
            name: "Finance",
            description: "Financial news, markets, and economic analysis",
            handles: [
              "Bloomberg", "WSJ", "BusinessInsider", "FT", "Forbes", 
              "TheEconomist", "ReutersBiz", "CNNBusiness", "YahooFinance"
            ],
            isEditing: false
          },
          {
            name: "Healthcare",
            description: "Healthcare news, medical research, and health policy",
            handles: [
              "NEJM", "TheLancet", "statnews", "KHNews", "Reuters_Health",
              "CDCgov", "WHO", "NIH", "HarvardHealth", "MayoClinic"
            ],
            isEditing: false
          },
          {
            name: "Sports",
            description: "Sports news, analysis, and updates across major leagues",
            handles: [
              "espn", "SportsCenter", "NBA", "NFL", "MLB", 
              "NHL", "FIFAcom", "BBCSport", "SInow", "CBSSports"
            ],
            isEditing: false
          },
          {
            name: "Entertainment",
            description: "Movies, TV, music, and celebrity news",
            handles: [
              "Variety", "THR", "EW", "ETonline", "usweekly", 
              "vulture", "RottenTomatoes", "IMDb", "BBCEntertain", "MTV"
            ],
            isEditing: false
          },
          {
            name: "Politics",
            description: "Political news and analysis",
            handles: [
              "politico", "thehill", "axios", "NPR", "BBCPolitics", 
              "FoxNews", "MSNBC", "CBSPolitics", "ABCPolitics", "CNNPolitics"
            ],
            isEditing: false
          },
          {
            name: "Science",
            description: "Scientific discoveries, research, and environmental news",
            handles: [
              "ScienceMagazine", "NatureMagazine", "sciam", "NewScientist", "NASA", 
              "NOAAClimate", "NatGeo", "PopSci", "DiscoverMag", "ScienceDaily"
            ],
            isEditing: false
          },
          {
            name: "AI & ML",
            description: "Artificial intelligence, machine learning, and data science",
            handles: [
              "DeepMind", "OpenAI", "GoogleAI", "AndrewYNg", "facebookai", 
              "NvidiaAI", "Stanford_AI", "MIT_CSAIL", "TensorFlow", "PyTorch"
            ],
            isEditing: false
          },
        ];
        setPreDefinedSectors(hardcodedSectors);
        console.error("Error fetching pre-defined sectors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchPreDefinedSectors();
    }
  }, [open]);

  // Handle toggling edit mode for a sector
  const toggleEditMode = (index: number) => {
    setPreDefinedSectors(
      preDefinedSectors.map((sector, i) => 
        i === index ? { ...sector, isEditing: !sector.isEditing } : sector
      )
    );
  };

  // Handle adding a new handle to a sector
  const addHandle = (sectorIndex: number) => {
    if (!newHandle.trim()) return;
    
    setPreDefinedSectors(
      preDefinedSectors.map((sector, i) => 
        i === sectorIndex 
          ? { 
              ...sector, 
              handles: [...sector.handles, newHandle.trim()] 
            } 
          : sector
      )
    );
    setNewHandle("");
  };

  // Handle removing a handle from a sector
  const removeHandle = (sectorIndex: number, handleIndex: number) => {
    setPreDefinedSectors(
      preDefinedSectors.map((sector, i) => 
        i === sectorIndex 
          ? { 
              ...sector, 
              handles: sector.handles.filter((_, hIndex) => hIndex !== handleIndex) 
            } 
          : sector
      )
    );
  };

  // Get index of selected sector based on tab
  const getSelectedSectorIndex = () => {
    return preDefinedSectors.findIndex(
      sector => sector.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === selectedTab
    );
  };

  // Handle creating selected sectors
  const handleCreateSectors = () => {
    const selectedSectors = preDefinedSectors.filter((_, index) => index === getSelectedSectorIndex());
    createSectorsMutation.mutate(selectedSectors);
  };

  // Create tab IDs from sector names
  const getTabId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pre-defined Twitter Handle Sets</DialogTitle>
          <DialogDescription>
            Browse and customize pre-defined collections of Twitter handles by industry before adding them to your account.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs 
              defaultValue={selectedTab} 
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="h-full flex flex-col"
            >
              <div className="border-b">
                <ScrollArea className="w-full whitespace-nowrap" dir="ltr">
                  <TabsList className="w-max">
                    {preDefinedSectors.map((sector) => (
                      <TabsTrigger 
                        key={getTabId(sector.name)} 
                        value={getTabId(sector.name)}
                        className="min-w-[120px]"
                      >
                        {sector.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              </div>

              {preDefinedSectors.map((sector, index) => {
                const tabId = getTabId(sector.name);
                return (
                  <TabsContent key={tabId} value={tabId} className="flex-1 overflow-auto">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex justify-between items-center">
                          <span>{sector.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEditMode(index)}
                          >
                            {sector.isEditing ? (
                              <X className="h-4 w-4 mr-2" />
                            ) : (
                              <Pencil className="h-4 w-4 mr-2" />
                            )}
                            {sector.isEditing ? "Cancel" : "Edit Handles"}
                          </Button>
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">{sector.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Twitter Handles ({sector.handles.length})</Label>
                          <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto p-2 border rounded-md">
                            {sector.handles.map((handle, handleIndex) => (
                              <Badge 
                                key={`${handle}-${handleIndex}`}
                                variant={sector.isEditing ? "outline" : "secondary"}
                                className="flex items-center gap-1"
                              >
                                @{handle}
                                {sector.isEditing && (
                                  <button 
                                    onClick={() => removeHandle(index, handleIndex)}
                                    className="ml-1 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {sector.isEditing && (
                          <div className="flex items-center gap-2">
                            <Input 
                              placeholder="Add new handle (without @)"
                              value={newHandle}
                              onChange={(e) => setNewHandle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addHandle(index);
                                }
                              }}
                            />
                            <Button 
                              variant="outline" 
                              onClick={() => addHandle(index)}
                              disabled={!newHandle.trim()}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center mt-6">
          <div className="text-sm text-muted-foreground">
            You can customize these lists before adding them to your account.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSectors}
              disabled={createSectorsMutation.isPending}
            >
              {createSectorsMutation.isPending 
                ? "Creating..." 
                : `Add ${preDefinedSectors[getSelectedSectorIndex()]?.name || "Selected"} Sector`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}