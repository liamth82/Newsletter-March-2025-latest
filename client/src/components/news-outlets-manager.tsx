import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface NewsOutletsManagerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function NewsOutletsManager({ value, onChange }: NewsOutletsManagerProps) {
  const [input, setInput] = useState("");
  const [bulkInput, setBulkInput] = useState(false);

  const handleAdd = () => {
    if (!input.trim()) return;

    // Split input by commas, newlines, or spaces and process each handle
    const handles = input
      .split(/[\n,\s]+/)
      .map(handle => handle.trim().replace(/^@/, ''))
      .filter(handle => handle.length > 0);

    // Add only unique handles that don't already exist
    const uniqueHandles = [...new Set([...value, ...handles])];
    onChange(uniqueHandles);
    setInput("");
  };

  const handleRemove = (handle: string) => {
    onChange(value.filter((h) => h !== handle));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const suggestedSources = [
    "Reuters", "AP", "BBCNews", "WSJ", "Bloomberg", "CNBCnow", "BBCBusiness", "FT", "TheEconomist"
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {bulkInput ? (
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter multiple handles separated by commas, spaces, or new lines&#13;&#10;Example: Reuters, AP, BBCNews"
              className="flex-1 min-h-[100px]"
            />
          ) : (
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter news outlet handle (e.g. Reuters, BBCNews)"
              className="flex-1"
            />
          )}
          <div className="flex flex-col gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={handleAdd}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkInput(!bulkInput)}
              className="shrink-0 text-xs"
            >
              {bulkInput ? "Single" : "Bulk"}
            </Button>
          </div>
        </div>
      </div>

      {value.length === 0 && (
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Suggested trusted sources:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSources.map((source) => (
              <Badge
                key={source}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  if (!value.includes(source)) {
                    onChange([...value, source]);
                  }
                }}
              >
                @{source}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((handle) => (
            <Badge
              key={handle}
              variant="secondary"
              className="group flex items-center gap-1"
            >
              @{handle}
              <button
                type="button"
                onClick={() => handleRemove(handle)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {bulkInput ? 
          "Add multiple handles at once by separating them with commas, spaces, or new lines" :
          "Add trusted news outlet handles to filter tweets from specific sources"
        }
      </p>
    </div>
  );
}