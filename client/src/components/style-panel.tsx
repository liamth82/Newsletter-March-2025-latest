import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, X } from "lucide-react";

interface StylePanelProps {
  styles: Record<string, any>;
  onStylesChange: (styles: Record<string, any>) => void;
}

export function StylePanel({ styles, onStylesChange }: StylePanelProps) {
  const [selectedElement, setSelectedElement] = useState<string>("body");

  const updateStyle = (property: string, value: string) => {
    onStylesChange({
      ...styles,
      [selectedElement]: {
        ...styles[selectedElement],
        [property]: value,
      },
    });
  };

  const colorOptions = [
    { label: "Primary", value: "hsl(var(--primary))" },
    { label: "Secondary", value: "hsl(var(--secondary))" },
    { label: "Muted", value: "hsl(var(--muted))" },
    { label: "Custom", value: "custom" },
  ];

  const fontOptions = [
    { label: "Sans Serif", value: "ui-sans-serif, system-ui, sans-serif" },
    { label: "Serif", value: "ui-serif, Georgia, serif" },
    { label: "Monospace", value: "ui-monospace, monospace" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label>Element</Label>
        <Select
          value={selectedElement}
          onValueChange={setSelectedElement}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select element to style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="body">Body</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value=".newsletter-section">Newsletter Section</SelectItem>
            <SelectItem value=".tweet">Tweet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Font Family</Label>
          <Select
            value={styles[selectedElement]?.fontFamily || fontOptions[0].value}
            onValueChange={(value) => updateStyle("fontFamily", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font family" />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Font Size</Label>
          <Input
            type="text"
            value={styles[selectedElement]?.fontSize || ""}
            onChange={(e) => updateStyle("fontSize", e.target.value)}
            placeholder="e.g., 16px, 1.2rem"
          />
        </div>

        <div>
          <Label>Color</Label>
          <Select
            value={styles[selectedElement]?.color || colorOptions[0].value}
            onValueChange={(value) => updateStyle("color", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Background Color</Label>
          <Select
            value={styles[selectedElement]?.backgroundColor || "transparent"}
            onValueChange={(value) => updateStyle("backgroundColor", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select background color" />
            </SelectTrigger>
            <SelectContent>
              {[
                { label: "None", value: "transparent" },
                ...colorOptions,
              ].map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Padding</Label>
          <Input
            type="text"
            value={styles[selectedElement]?.padding || ""}
            onChange={(e) => updateStyle("padding", e.target.value)}
            placeholder="e.g., 1rem, 10px 20px"
          />
        </div>
      </div>
    </div>
  );
}
