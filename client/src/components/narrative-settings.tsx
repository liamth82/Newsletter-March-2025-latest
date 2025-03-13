import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { type NarrativeSettings } from "@shared/schema";

interface Props {
  value: NarrativeSettings;
  onChange: (value: NarrativeSettings) => void;
}

const styles = ["professional", "casual", "storytelling"] as const;
const tones = ["formal", "conversational"] as const;

export function NarrativeSettingsControl({ value, onChange }: Props) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={value.style}
            onValueChange={(newStyle) => {
              onChange({
                ...value,
                style: newStyle as NarrativeSettings['style']
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              {styles.map((style) => (
                <SelectItem key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tone</Label>
          <Select
            value={value.tone}
            onValueChange={(newTone) => {
              onChange({
                ...value,
                tone: newTone as NarrativeSettings['tone']
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {tones.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Target Word Count: {value.wordCount}</Label>
          <Slider
            value={[value.wordCount]}
            onValueChange={(values) => {
              onChange({
                ...value,
                wordCount: values[0]
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
          <Label>Number of Paragraphs: {value.paragraphCount}</Label>
          <Slider
            value={[value.paragraphCount]}
            onValueChange={(values) => {
              onChange({
                ...value,
                paragraphCount: values[0]
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