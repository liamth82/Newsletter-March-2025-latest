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
  value?: NarrativeSettings;
  onChange: (value: NarrativeSettings) => void;
}

export function NarrativeSettingsControl({ value = defaultNarrativeSettings, onChange }: Props) {
  const settings = { ...defaultNarrativeSettings, ...value };

  const handleStyleChange = (newStyle: NarrativeSettings['style']) => {
    onChange({ ...settings, style: newStyle });
  };

  const handleToneChange = (newTone: NarrativeSettings['tone']) => {
    onChange({ ...settings, tone: newTone });
  };

  const handleWordCountChange = (values: number[]) => {
    onChange({ ...settings, wordCount: values[0] });
  };

  const handleParagraphCountChange = (values: number[]) => {
    onChange({ ...settings, paragraphCount: values[0] });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select value={settings.style} onValueChange={handleStyleChange}>
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
          <Select value={settings.tone} onValueChange={handleToneChange}>
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
            onValueChange={handleWordCountChange}
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
            onValueChange={handleParagraphCountChange}
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