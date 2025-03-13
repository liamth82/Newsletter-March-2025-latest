import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { type NarrativeSettings } from "@shared/schema";

interface NarrativeSettingsPanelProps {
  settings: NarrativeSettings;
  onChange: (settings: NarrativeSettings) => void;
}

const defaultSettings: NarrativeSettings = {
  style: "professional",
  wordCount: 300,
  tone: "formal",
  paragraphCount: 6
};

export function NarrativeSettingsPanel({ settings = defaultSettings, onChange }: NarrativeSettingsPanelProps) {
  const currentSettings = { ...defaultSettings, ...settings };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={currentSettings.style}
            onValueChange={(value) => 
              onChange({ ...currentSettings, style: value as NarrativeSettings['style'] })
            }
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
            value={currentSettings.tone}
            onValueChange={(value) => 
              onChange({ ...currentSettings, tone: value as NarrativeSettings['tone'] })
            }
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
          <Label>Target Word Count: {currentSettings.wordCount}</Label>
          <Slider
            value={[currentSettings.wordCount]}
            onValueChange={(value) => 
              onChange({ ...currentSettings, wordCount: value[0] })
            }
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
          <Label>Number of Paragraphs: {currentSettings.paragraphCount}</Label>
          <Slider
            value={[currentSettings.paragraphCount]}
            onValueChange={(value) => 
              onChange({ ...currentSettings, paragraphCount: value[0] })
            }
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