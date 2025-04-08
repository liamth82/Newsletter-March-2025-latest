import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewsOutletsManager } from "./news-outlets-manager";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sector, type TweetFilters } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X } from "lucide-react";
import { PreDefinedSectorsDialog } from "./pre-defined-sectors-dialog";

interface Props {
  onFiltersChange: (filters: TweetFilters) => void;
  initialFilters?: TweetFilters;
}

const FOLLOWER_THRESHOLDS = {
  low: 1000,
  medium: 10000,
  high: 100000
} as const;

export function TweetFiltersControl({ onFiltersChange, initialFilters }: Props) {
  const [filters, setFilters] = useState<TweetFilters>({
    verifiedOnly: initialFilters?.verifiedOnly ?? false,
    minFollowers: initialFilters?.minFollowers ?? FOLLOWER_THRESHOLDS.low,
    excludeReplies: initialFilters?.excludeReplies ?? false,
    excludeRetweets: initialFilters?.excludeRetweets ?? false,
    safeMode: initialFilters?.safeMode ?? true,
    newsOutlets: initialFilters?.newsOutlets ?? [],
    followerThreshold: initialFilters?.followerThreshold ?? 'low',
    accountTypes: initialFilters?.accountTypes ?? [],
    sectorId: initialFilters?.sectorId
  });
  
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [showSectorSelection, setShowSectorSelection] = useState(!!filters.sectorId);
  const [showKeywordsSection, setShowKeywordsSection] = useState(!filters.sectorId);

  const { data: sectors = [] } = useQuery<Sector[]>({
    queryKey: ["/api/sectors"],
  });

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleFilterChange = <K extends keyof TweetFilters>(key: K, value: TweetFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleImportSector = async (sectorId: string) => {
    const sector = sectors.find(s => s.id === parseInt(sectorId));
    if (sector) {
      const uniqueHandles = Array.from(new Set([...filters.newsOutlets, ...sector.handles]));
      handleFilterChange('newsOutlets', uniqueHandles);
    }
  };
  
  const handleSectorSelect = async (sectorId: string) => {
    // If "none" is selected, clear the sector
    if (sectorId === "none") {
      handleFilterChange('sectorId', undefined);
      return;
    }
    
    const sectorIdNum = parseInt(sectorId);
    const sector = sectors.find(s => s.id === sectorIdNum);
    if (sector) {
      console.log(`Selected sector: ${sector.name} (ID: ${sector.id})`);
      
      // Set the sector ID in a separate update to ensure it's not lost
      const sectorUpdate = { ...filters, sectorId: sectorIdNum };
      setFilters(sectorUpdate);
      
      // Also apply the handles from this sector
      if (sector.handles && sector.handles.length > 0) {
        // Replace existing handles with sector handles for clarity
        const newFilters = { 
          ...sectorUpdate, 
          newsOutlets: [...sector.handles] 
        };
        
        setFilters(newFilters);
        onFiltersChange(newFilters);
      } else {
        // If no handles in sector, at least update the sectorId
        onFiltersChange(sectorUpdate);
      }
    }
  };

  const handleAccountTypeToggle = (type: 'news' | 'verified' | 'influencer') => {
    const currentTypes = filters.accountTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    handleFilterChange('accountTypes', newTypes);
  };

  return (
    <>
      <PreDefinedSectorsDialog
        open={sectorDialogOpen}
        onOpenChange={setSectorDialogOpen}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Content Filters</CardTitle>
          <CardDescription>
            Customize your news sources and filter settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xl font-semibold text-primary">Content Source Selection</Label>
          <div className="text-sm text-muted-foreground mb-4">
            Choose how you want to source tweets for your newsletter
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className={`border-2 ${!filters.sectorId ? 'border-primary' : 'border-muted'} cursor-pointer transition-all hover:shadow-md`}
              onClick={() => {
                // Clear sector ID
                handleFilterChange('sectorId', undefined);
                setShowKeywordsSection(true);
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {!filters.sectorId && <CheckCircle className="h-4 w-4 text-primary" />}
                  Use Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Search for tweets using specific keywords you provide, optionally filtered by trusted accounts.
                </p>
              </CardContent>
            </Card>
            
            <Card className={`border-2 ${filters.sectorId ? 'border-primary' : 'border-muted'} cursor-pointer transition-all hover:shadow-md`}
              onClick={() => {
                if (filters.sectorId) {
                  // If sector already selected, show the selection dialog to modify
                  setShowSectorSelection(true);
                } else {
                  // Otherwise, just show the sector selection
                  setShowSectorSelection(true);
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {filters.sectorId && <CheckCircle className="h-4 w-4 text-primary" />}
                  Use Industry Sector {filters.sectorId ? `(${sectors.find(s => s.id === filters.sectorId)?.name})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Follow specific Twitter accounts from a curated industry sector, with or without keywords.
                </p>
                {filters.sectorId && (
                  <div className="mt-2 text-xs text-primary-foreground">
                    <Badge variant="default" className="mr-1">Active</Badge>
                    Using {sectors.find(s => s.id === filters.sectorId)?.handles.length} handles from this sector
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {showSectorSelection && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4 mb-4 animate-in fade-in-50">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Select Industry Sector</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowSectorSelection(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col gap-2">
                {sectors.length > 0 ? (
                  <Select 
                    value={filters.sectorId?.toString() || "none"}
                    onValueChange={handleSectorSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (use keywords only)</SelectItem>
                      {sectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id.toString()}>
                          {sector.name} ({sector.handles.length} handles)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No sectors available. Create sectors in the Sectors page.
                  </div>
                )}
                
                {filters.sectorId && (
                  <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        Active: {sectors.find(s => s.id === filters.sectorId)?.name}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="mb-2">This sector includes {sectors.find(s => s.id === filters.sectorId)?.handles.length} trusted Twitter handles:</p>
                      <div className="flex flex-wrap gap-1">
                        {sectors.find(s => s.id === filters.sectorId)?.handles.slice(0, 5).map((handle, i) => (
                          <Badge key={i} variant="outline">@{handle}</Badge>
                        ))}
                        {(sectors.find(s => s.id === filters.sectorId)?.handles.length || 0) > 5 && (
                          <Badge variant="outline">+{(sectors.find(s => s.id === filters.sectorId)?.handles.length || 0) - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setShowSectorSelection(false);
                      setSectorDialogOpen(true);
                    }}
                  >
                    Browse Pre-defined Sectors
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="text-base font-semibold">Account Types</Label>
          <div className="flex flex-wrap gap-2">
            {(['news', 'verified', 'influencer'] as const).map((type) => (
              <Badge
                key={type}
                variant={filters.accountTypes?.includes(type) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleAccountTypeToggle(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {filters.accountTypes?.includes(type) && (
                  <CheckCircle className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Follower Threshold</Label>
          <Select
            defaultValue={filters.followerThreshold}
            onValueChange={(value) => {
              const typedValue = value as 'low' | 'medium' | 'high';
              handleFilterChange('followerThreshold', typedValue);
              handleFilterChange('minFollowers', FOLLOWER_THRESHOLDS[typedValue]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select follower threshold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (1K+)</SelectItem>
              <SelectItem value="medium">Medium (10K+)</SelectItem>
              <SelectItem value="high">High (100K+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Additional Twitter Handles</Label>
          <div className="text-sm text-muted-foreground mb-2">
            {filters.sectorId ? (
              <span>
                <span className="font-medium">Note:</span> Your selected sector handles are automatically included.
                Add any additional handles below if needed.
              </span>
            ) : (
              <span>Add specific Twitter handles to include in your search results</span>
            )}
          </div>
          {sectors.length > 0 && !filters.sectorId && (
            <div className="flex gap-2 mb-4">
              <Select onValueChange={handleImportSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Import handles from sector..." />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id.toString()}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <NewsOutletsManager
            value={filters.newsOutlets}
            onChange={(value) => handleFilterChange('newsOutlets', value)}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Additional Filters</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="verified-only">Verified accounts only</Label>
              <Switch
                id="verified-only"
                checked={filters.verifiedOnly}
                onCheckedChange={(checked) => handleFilterChange('verifiedOnly', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="exclude-replies">Exclude replies</Label>
              <Switch
                id="exclude-replies"
                checked={filters.excludeReplies}
                onCheckedChange={(checked) => handleFilterChange('excludeReplies', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="exclude-retweets">Exclude retweets</Label>
              <Switch
                id="exclude-retweets"
                checked={filters.excludeRetweets}
                onCheckedChange={(checked) => handleFilterChange('excludeRetweets', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="safe-mode">Safe mode (filter offensive content)</Label>
              <Switch
                id="safe-mode"
                checked={filters.safeMode}
                onCheckedChange={(checked) => handleFilterChange('safeMode', checked)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}