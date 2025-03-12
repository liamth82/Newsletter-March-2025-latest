import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type NarrativeStyle = 'professional' | 'casual' | 'storytelling';
export type NarrativeTone = 'formal' | 'conversational';

export interface NarrativeSettings {
  style: NarrativeStyle;
  wordCount: number;
  tone: NarrativeTone;
  paragraphCount: number;
}

interface NarrativeSettingsProps {
  settings?: NarrativeSettings;
  onChange: (settings: NarrativeSettings) => void;
}

const defaultSettings: NarrativeSettings = {
  style: 'professional',
  wordCount: 300,
  tone: 'formal',
  paragraphCount: 6
};

export function NarrativeSettings({ settings = defaultSettings, onChange }: NarrativeSettingsProps) {
  const handleChange = (key: keyof NarrativeSettings, value: any) => {
    const currentSettings = { ...defaultSettings, ...settings };

    // Validate and transform the value based on the field
    let validatedValue: any = value;

    switch (key) {
      case 'style':
        // Ensure style is one of the allowed values
        validatedValue = ['professional', 'casual', 'storytelling'].includes(value)
          ? value
          : defaultSettings.style;
        break;
      case 'tone':
        // Ensure tone is one of the allowed values
        validatedValue = ['formal', 'conversational'].includes(value)
          ? value
          : defaultSettings.tone;
        break;
      case 'wordCount':
        // Ensure word count is within bounds
        validatedValue = Math.max(100, Math.min(1000, Number(value) || defaultSettings.wordCount));
        break;
      case 'paragraphCount':
        // Ensure paragraph count is within bounds
        validatedValue = Math.max(1, Math.min(10, Number(value) || defaultSettings.paragraphCount));
        break;
      default:
        validatedValue = value;
    }

    // Create new settings object with validated value
    const newSettings = {
      ...currentSettings,
      [key]: validatedValue
    };

    // Log the change for debugging
    console.log('Narrative settings change:', {
      key,
      value,
      validatedValue,
      newSettings
    });

    onChange(newSettings);
  };

  // Ensure we have valid settings by merging with defaults
  const safeSettings = { ...defaultSettings, ...settings };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={safeSettings.style}
            onValueChange={(value) => handleChange('style', value)}
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
            onValueChange={(value) => handleChange('tone', value)}
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
            onValueChange={(value) => handleChange('wordCount', value[0])}
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
            onValueChange={(value) => handleChange('paragraphCount', value[0])}
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