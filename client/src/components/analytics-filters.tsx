import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";

interface AnalyticsFiltersProps {
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

export interface AnalyticsFilters {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  category: string;
  minViews: number;
  minClicks: number;
}

export function AnalyticsFilters({ onFiltersChange }: AnalyticsFiltersProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      from: addDays(new Date(), -30),
      to: new Date(),
    },
    category: "all",
    minViews: 0,
    minClicks: 0,
  });

  const handleFilterChange = (updates: Partial<AnalyticsFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/40 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Date Range</Label>
          <DatePickerWithRange
            date={filters.dateRange}
            onSelect={(range) => handleFilterChange({ dateRange: range })}
          />
        </div>
        
        <div>
          <Label>Category</Label>
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange({ category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="tech">Technology</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Minimum Views</Label>
          <Input
            type="number"
            value={filters.minViews}
            onChange={(e) => handleFilterChange({ minViews: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>

        <div>
          <Label>Minimum Clicks</Label>
          <Input
            type="number"
            value={filters.minClicks}
            onChange={(e) => handleFilterChange({ minClicks: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}
