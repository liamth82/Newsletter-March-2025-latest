import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type NarrativeSettings } from "@shared/schema";
import { BookText, Layout, Palette, Quote, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface Props {
  value: NarrativeSettings;
  onChange: (value: NarrativeSettings) => void;
}

// Extended narrative settings options
const styles = ["professional", "casual", "storytelling"] as const;
const tones = ["formal", "conversational", "enthusiastic", "analytical"] as const;
const formats = ["article", "newsletter", "report", "memo"] as const;
const themeStyles = ["minimal", "elegant", "bold", "modern"] as const;

// Descriptions for the different writing styles
const styleDescriptions: Record<typeof styles[number], string> = {
  professional: "Authoritative, factual, and precise with industry terminology appropriate for business audiences.",
  casual: "Friendly, relatable, and accessible with everyday language appropriate for general audiences.",
  storytelling: "Engaging, narrative-focused, and immersive with colorful language for captivating readers."
};

// Descriptions for different tones
const toneDescriptions: Record<typeof tones[number], string> = {
  formal: "Serious and structured with proper language, avoiding contractions and slang.",
  conversational: "Relaxed and approachable, using contractions and direct address to the reader.",
  enthusiastic: "Upbeat and positive, using energetic language with occasional exclamations.",
  analytical: "Thoughtful and detailed, focusing on data, trends, and reasoned explanations."
};

export function NarrativeSettingsControl({ value, onChange }: Props) {
  // Use internal state to track changes without immediately submitting
  const [settings, setSettings] = useState({
    style: value.style || "professional",
    tone: value.tone || "formal",
    wordCount: value.wordCount || 300,
    paragraphCount: value.paragraphCount || 6,
    format: value.format || "newsletter",
    themeStyle: value.themeStyle || "minimal",
    useQuotes: value.useQuotes || false,
    improveSentences: value.improveSentences || true,
    enhanceCohesion: value.enhanceCohesion || true,
    includeTransitions: value.includeTransitions || true
  });

  // Update local state when external value changes
  useEffect(() => {
    setSettings({
      style: value.style || "professional",
      tone: value.tone || "formal",
      wordCount: value.wordCount || 300, 
      paragraphCount: value.paragraphCount || 6,
      format: value.format || "newsletter",
      themeStyle: value.themeStyle || "minimal",
      useQuotes: value.useQuotes || false,
      improveSentences: value.improveSentences || true,
      enhanceCohesion: value.enhanceCohesion || true,
      includeTransitions: value.includeTransitions || true
    });
  }, [value]);

  // This now only updates the local state, not the parent component
  const handleChange = (key: keyof typeof settings, newValue: any) => {
    setSettings({
      ...settings,
      [key]: newValue
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookText className="h-5 w-5" />
          Content Generation Settings
        </CardTitle>
        <CardDescription>
          Configure how your newsletter content is generated from tweets
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="style">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="style" className="flex items-center gap-1">
              <BookText className="h-4 w-4" /> Style
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-1">
              <Layout className="h-4 w-4" /> Structure 
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-1">
              <Palette className="h-4 w-4" /> Theme
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> Advanced
            </TabsTrigger>
          </TabsList>

          {/* STYLE TAB */}
          <TabsContent value="style" className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Writing Style</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">About Writing Styles</h4>
                        <div className="space-y-2">
                          {Object.entries(styleDescriptions).map(([style, description]) => (
                            <div key={style} className="space-y-1">
                              <h5 className="font-medium text-xs">{style.charAt(0).toUpperCase() + style.slice(1)}</h5>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {styles.map((style) => (
                    <Button
                      key={style}
                      variant={settings.style === style ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => handleChange('style', style)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{style.charAt(0).toUpperCase() + style.slice(1)}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {styleDescriptions[style].split(' ').slice(0, 3).join(' ')}...
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Tone</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">About Tones</h4>
                        <div className="space-y-2">
                          {Object.entries(toneDescriptions).map(([tone, description]) => (
                            <div key={tone} className="space-y-1">
                              <h5 className="font-medium text-xs">{tone.charAt(0).toUpperCase() + tone.slice(1)}</h5>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tones.map((tone) => (
                    <Button
                      key={tone}
                      variant={settings.tone === tone ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => handleChange('tone', tone)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{tone.charAt(0).toUpperCase() + tone.slice(1)}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {toneDescriptions[tone].split(' ').slice(0, 3).join(' ')}...
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Format</Label>
                <Select
                  value={settings.format}
                  onValueChange={(newFormat) => handleChange('format', newFormat)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format.charAt(0).toUpperCase() + format.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-quotes">Include Direct Quotes</Label>
                  <Switch
                    id="use-quotes"
                    checked={settings.useQuotes}
                    onCheckedChange={(checked) => handleChange('useQuotes', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Include direct quotes from the original tweets to add authenticity
                </p>
              </div>
            </div>
          </TabsContent>

          {/* STRUCTURE TAB */}
          <TabsContent value="structure" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Target Word Count: {settings.wordCount}</Label>
                <Slider
                  value={[settings.wordCount]}
                  onValueChange={(values) => handleChange('wordCount', values[0])}
                  min={100}
                  max={1000}
                  step={50}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>100</span>
                  <span>1000</span>
                </div>
                <div className="flex gap-2 pt-1">
                  {[100, 250, 500, 750, 1000].map((count) => (
                    <Badge 
                      key={count} 
                      variant={settings.wordCount === count ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleChange('wordCount', count)}
                    >
                      {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Number of Paragraphs: {settings.paragraphCount}</Label>
                <Slider
                  value={[settings.paragraphCount]}
                  onValueChange={(values) => handleChange('paragraphCount', values[0])}
                  min={1}
                  max={12}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>12</span>
                </div>
                <div className="flex gap-2 pt-1">
                  {[3, 6, 9, 12].map((count) => (
                    <Badge 
                      key={count} 
                      variant={settings.paragraphCount === count ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleChange('paragraphCount', count)}
                    >
                      {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-transitions">Include Paragraph Transitions</Label>
                  <Switch
                    id="include-transitions"
                    checked={settings.includeTransitions}
                    onCheckedChange={(checked) => handleChange('includeTransitions', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add smooth transitions between paragraphs for better flow
                </p>
              </div>
            </div>
          </TabsContent>

          {/* THEME TAB */}
          <TabsContent value="theme" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Visual Theme</Label>
                <div className="grid grid-cols-2 gap-2">
                  {themeStyles.map((theme) => (
                    <Button
                      key={theme}
                      variant={settings.themeStyle === theme ? "default" : "outline"}
                      className="justify-start py-6 h-auto"
                      onClick={() => handleChange('themeStyle', theme)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                        <span className="text-xs text-muted-foreground">
                          {theme === 'minimal' && 'Clean and understated design'}
                          {theme === 'elegant' && 'Refined and sophisticated look'}
                          {theme === 'bold' && 'Strong, attention-grabbing style'}
                          {theme === 'modern' && 'Contemporary, sleek appearance'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="improve-sentences">Sentence Enhancement</Label>
                  <Switch
                    id="improve-sentences"
                    checked={settings.improveSentences}
                    onCheckedChange={(checked) => handleChange('improveSentences', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Improve sentence structure and grammar from original tweets
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enhance-cohesion">Enhance Topic Cohesion</Label>
                  <Switch
                    id="enhance-cohesion"
                    checked={settings.enhanceCohesion}
                    onCheckedChange={(checked) => handleChange('enhanceCohesion', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Group related topics together for more coherent content flow
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Add a save button at the bottom */}
        <div className="flex justify-end mt-6">
          <Button 
            onClick={() => onChange(settings)}
            className="bg-primary hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}