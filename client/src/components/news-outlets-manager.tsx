import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NewsOutletsManagerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function NewsOutletsManager({ value, onChange }: NewsOutletsManagerProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (!input.trim()) return;
    
    // Remove @ if present and trim whitespace
    const handle = input.trim().replace(/^@/, '');
    
    if (!value.includes(handle)) {
      onChange([...value, handle]);
    }
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Twitter handle (e.g. Reuters)"
        />
        <Button 
          type="button"
          variant="outline"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
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
      
      <p className="text-sm text-muted-foreground">
        Add Twitter handles of trusted news outlets to filter tweets
      </p>
    </div>
  );
}
