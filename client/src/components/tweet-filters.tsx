import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewsOutletsManager } from "./news-outlets-manager";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sector } from "@shared/schema";

interface TweetFilters {
  verifiedOnly: boolean;
  minFollowers: number;
  excludeReplies: boolean;
  excludeRetweets: boolean;
  safeMode: boolean;
  newsOutlets: string[];
}

interface TweetFiltersProps {
  onFiltersChange: (filters: TweetFilters) => void;
  initialFilters?: TweetFilters;
}

export function TweetFilters({ onFiltersChange, initialFilters }: TweetFiltersProps) {
  const [filters, setFilters] = useState<TweetFilters>(initialFilters || {
    verifiedOnly: false,
    minFollowers: 0,
    excludeReplies: false,
    excludeRetweets: false,
    safeMode: true,
    newsOutlets: [],
  });

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const { data: sectors = [] } = useQuery<Sector[]>({
    queryKey: ["/api/sectors"],
  });

  const handleFilterChange = (key: keyof TweetFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleImportSector = (sectorId: string) => {
    const sector = sectors.find(s => s.id === parseInt(sectorId));
    if (sector) {
      // Merge existing handles with sector handles, removing duplicates
      const uniqueHandles = [...new Set([...filters.newsOutlets, ...sector.handles])];
      handleFilterChange('newsOutlets', uniqueHandles);
    }
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
          <Label className="text-base font-semibold">Trusted News Sources</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Add Twitter handles of trusted news outlets (e.g. Reuters, AP, BBCNews) to only receive content from these sources
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

        <div className="space-y-2">
          <Label className="text-base font-semibold">Minimum Followers</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Filter out accounts with fewer followers to focus on established sources
          </div>
          <Slider
            value={[filters.minFollowers]}
            onValueChange={(value) => handleFilterChange('minFollowers', value[0])}
            max={100000}
            step={1000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>100K</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}