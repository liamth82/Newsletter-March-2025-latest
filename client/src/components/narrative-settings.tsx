import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { NarrativeSettings as NarrativeSettingsType } from "@shared/schema";

interface NarrativeSettingsProps {
  settings?: NarrativeSettingsType;
  onChange: (settings: NarrativeSettingsType) => void;
}

const defaultSettings: NarrativeSettingsType = {
  style: 'professional',
  wordCount: 300,
  tone: 'formal',
  paragraphCount: 6
};

type Style = 'professional' | 'casual' | 'storytelling';
type Tone = 'formal' | 'conversational';

export function NarrativeSettings({ settings = defaultSettings, onChange }: NarrativeSettingsProps) {
  const safeSettings = { ...defaultSettings, ...settings };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={safeSettings.style}
            onValueChange={(value) => {
              onChange({
                ...safeSettings,
                style: value as Style
              });
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
            value={safeSettings.tone}
            onValueChange={(value) => {
              onChange({
                ...safeSettings,
                tone: value as Tone
              });
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
          <Label>Target Word Count: {safeSettings.wordCount}</Label>
          <Slider
            value={[safeSettings.wordCount]}
            onValueChange={(value) => {
              onChange({
                ...safeSettings,
                wordCount: value[0]
              });
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
          <Label>Number of Paragraphs: {safeSettings.paragraphCount}</Label>
          <Slider
            value={[safeSettings.paragraphCount]}
            onValueChange={(value) => {
              onChange({
                ...safeSettings,
                paragraphCount: value[0]
              });
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