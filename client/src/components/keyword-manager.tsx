import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface KeywordManagerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function KeywordManager({ value, onChange }: KeywordManagerProps) {
  const [input, setInput] = useState("");

  const addKeyword = () => {
    if (input.trim() && !value.includes(input.trim())) {
      onChange([...value, input.trim()]);
      setInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    onChange(value.filter((k) => k !== keyword));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a keyword"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addKeyword();
            }
          }}
        />
        <Button type="button" onClick={addKeyword}>
          Add
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {value.map((keyword, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-sm py-1 px-2"
          >
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(keyword)}
              className="ml-1 hover:text-destructive focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
