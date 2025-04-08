import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewsOutletsManager } from "./news-outlets-manager";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sector, type TweetFilters } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

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
    accountTypes: initialFilters?.accountTypes ?? []
  });

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
      
      // Set the sector ID
      handleFilterChange('sectorId', sectorIdNum);
      
      // Also apply the handles from this sector
      if (sector.handles && sector.handles.length > 0) {
        // Merge with existing handles to preserve manual additions
        const uniqueHandles = Array.from(new Set([...filters.newsOutlets, ...sector.handles]));
        handleFilterChange('newsOutlets', uniqueHandles);
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
    <Card>
      <CardHeader>
        <CardTitle>Content Filters</CardTitle>
        <CardDescription>
          Customize your news sources and filter settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Industry Sector</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Select a specific industry sector to use curated Twitter handles
          </div>
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
          <Label className="text-base font-semibold">Trusted News Sources</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Add Twitter handles of trusted news outlets or import from a sector
          </div>
          {sectors.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Select onValueChange={handleImportSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Import from sector..." />
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
  );
}