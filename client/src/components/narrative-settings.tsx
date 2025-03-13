import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { type NarrativeSettings } from "@shared/schema";

const defaultNarrativeSettings: NarrativeSettings = {
  style: "professional",
  wordCount: 300,
  tone: "formal",
  paragraphCount: 6
};

interface Props {
  value: NarrativeSettings;
  onChange: (value: NarrativeSettings) => void;
}

export function NarrativeSettingsControl({ value, onChange }: Props) {
  const settings = { ...defaultNarrativeSettings, ...value };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={settings.style}
            onValueChange={(newValue: typeof settings.style) => {
              onChange({ ...settings, style: newValue });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="storytelling">Storytelling</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tone</Label>
          <Select
            value={settings.tone}
            onValueChange={(newValue: typeof settings.tone) => {
              onChange({ ...settings, tone: newValue });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Target Word Count: {settings.wordCount}</Label>
          <Slider
            value={[settings.wordCount]}
            onValueChange={(values) => {
              onChange({ ...settings, wordCount: values[0] });
            }}
            min={100}
            max={1000}
            step={50}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100</span>
            <span>1000</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Number of Paragraphs: {settings.paragraphCount}</Label>
          <Slider
            value={[settings.paragraphCount]}
            onValueChange={(values) => {
              onChange({ ...settings, paragraphCount: values[0] });
            }}
            min={1}
            max={10}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}