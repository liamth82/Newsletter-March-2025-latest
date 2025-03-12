import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface TweetFilters {
  verifiedOnly: boolean;
  minFollowers: number;
  excludeReplies: boolean;
  excludeRetweets: boolean;
  safeMode: boolean;
}

interface TweetFiltersProps {
  onFiltersChange: (filters: TweetFilters) => void;
}

export function TweetFilters({ onFiltersChange }: TweetFiltersProps) {
  const [filters, setFilters] = useState<TweetFilters>({
    verifiedOnly: false,
    minFollowers: 0,
    excludeReplies: false,
    excludeRetweets: false,
    safeMode: true,
  });

  const handleFilterChange = (key: keyof TweetFilters, value: boolean | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
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
        <div className="space-y-2">
          <Label>Minimum followers: {filters.minFollowers.toLocaleString()}</Label>
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
