import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export interface NarrativeSettings {
  style: 'professional' | 'casual' | 'storytelling';
  wordCount: number;
  tone: 'formal' | 'conversational';
  paragraphCount: number;
}

interface NarrativeSettingsProps {
  settings: NarrativeSettings;
  onChange: (settings: NarrativeSettings) => void;
}

export function NarrativeSettings({ settings, onChange }: NarrativeSettingsProps) {
  const handleChange = (key: keyof NarrativeSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={settings.style}
            onValueChange={(value: 'professional' | 'casual' | 'storytelling') => 
              handleChange('style', value)
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
            value={settings.tone}
            onValueChange={(value: 'formal' | 'conversational') => 
              handleChange('tone', value)
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
          <Label>Target Word Count: {settings.wordCount}</Label>
          <Slider
            value={[settings.wordCount]}
            onValueChange={(value) => handleChange('wordCount', value[0])}
            min={100}
            max={500}
            step={50}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100</span>
            <span>500</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Number of Paragraphs: {settings.paragraphCount}</Label>
          <Slider
            value={[settings.paragraphCount]}
            onValueChange={(value) => handleChange('paragraphCount', value[0])}
            min={2}
            max={8}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2</span>
            <span>8</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
