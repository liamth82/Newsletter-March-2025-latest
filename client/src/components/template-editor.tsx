import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertTemplateSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Editor } from '@tinymce/tinymce-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StylePanel } from "./style-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

const PREDEFINED_LAYOUTS = {
  custom: {
    name: "Custom Layout",
    content: `<h1>{{newsletter_title}}</h1>
<div class="newsletter-section">
  <p>Welcome to our newsletter!</p>
</div>
<div class="newsletter-section">
  {{tweets}}
</div>`,
  },
  classic: {
    name: "Classic Layout",
    content: `<div class="header">
  <div class="logo-container">
    {{#each logos}}
      <img src="{{this}}" alt="Logo" class="logo" />
    {{/each}}
  </div>
  <h1>{{newsletter_title}}</h1>
</div>
<div class="intro newsletter-section">
  <p>Welcome to our latest newsletter. Here's what's new this week.</p>
</div>
<div class="main-content newsletter-section">
  {{tweets}}
</div>
<div class="footer newsletter-section">
  <p>Thanks for reading!</p>
</div>`,
  },
  modern: {
    name: "Modern Two-Column",
    content: `<div class="header">
  <div class="logo-container">
    {{#each logos}}
      <img src="{{this}}" alt="Logo" class="logo" />
    {{/each}}
  </div>
  <h1>{{newsletter_title}}</h1>
</div>
<div class="intro newsletter-section">
  <p>Welcome to our latest update. Stay informed with our curated content.</p>
</div>
<div class="two-column-layout">
  <div class="column newsletter-section">
    <h2>Featured Stories</h2>
    {{tweets}}
  </div>
  <div class="column newsletter-section">
    <h2>Quick Updates</h2>
    <p>Stay tuned for more updates and announcements.</p>
  </div>
</div>`,
  },
  compact: {
    name: "Compact Summary",
    content: `<div class="compact-header">
  <div class="logo-container">
    {{#each logos}}
      <img src="{{this}}" alt="Logo" class="logo" />
    {{/each}}
  </div>
  <h1>{{newsletter_title}}</h1>
</div>
<div class="summary-section newsletter-section">
  <h2>Key Updates</h2>
  {{tweets}}
</div>`,
  },
  magazine: {
    name: "Magazine Style",
    content: `<div class="magazine-header">
  <div class="branding">
    <div class="logo-container">
      {{#each logos}}
        <img src="{{this}}" alt="Logo" class="logo" />
      {{/each}}
    </div>
    <h1>{{newsletter_title}}</h1>
  </div>
  <div class="issue-info newsletter-section">
    <p>Your Weekly Industry Insights</p>
  </div>
</div>
<div class="featured-story newsletter-section">
  <h2>Featured Story</h2>
  <div class="story-content">
    {{tweets.[0]}}
  </div>
</div>
<div class="stories-grid">
  <div class="newsletter-section">
    <h3>Industry News</h3>
    {{tweets.[1]}}
  </div>
  <div class="newsletter-section">
    <h3>Trending Topics</h3>
    {{tweets.[2]}}
  </div>
  <div class="newsletter-section">
    <h3>Expert Insights</h3>
    {{tweets.[3]}}
  </div>
</div>`,
  }
};

const DEFAULT_STYLES = {
  body: {
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontSize: "16px",
    color: "hsl(var(--foreground))",
  },
  h1: {
    fontSize: "2rem",
    color: "hsl(var(--primary))",
    marginBottom: "1rem",
  },
  ".newsletter-section": {
    padding: "1rem",
    marginBottom: "1.5rem",
  },
  ".tweet": {
    padding: "1rem",
    backgroundColor: "hsl(var(--muted))",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
  },
  ".logo-container": {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    marginBottom: "1rem",
  },
  ".logo": {
    maxHeight: "50px",
    width: "auto",
  },
  ".two-column-layout": {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
  },
  ".stories-grid": {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.5rem",
    marginTop: "2rem",
  },
};

export function TemplateEditor({ onSuccess }: { onSuccess: () => void }) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [showBasicEditor, setShowBasicEditor] = useState(false);
  const [styles, setStyles] = useState<Record<string, any>>(DEFAULT_STYLES);

  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: "",
      category: "general",
      defaultTitle: "My Newsletter",
      content: PREDEFINED_LAYOUTS.classic.content,
      styles: styles,
      sections: [],
      variables: [
        { name: "newsletter_title", type: "text", default: "My Newsletter" },
        { name: "tweets", type: "content", default: "" },
      ],
      logos: [],
      layout: "classic",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/templates", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditorChange = (content: string) => {
    form.setValue("content", content);
    // Update preview with sample data
    let previewContent = content;
    Object.entries({
      newsletter_title: form.getValues("defaultTitle"),
      tweets: `<div class="tweet">Sample Tweet #1</div><div class="tweet">Sample Tweet #2</div>`,
      logos: form.getValues("logos"),
    }).forEach(([key, value]) => {
      if (key === "logos") {
        // Handle the logos array
        const logoHtml = (value as string[])
          .map((logo) => `<img src="${logo}" alt="Logo" class="logo" />`)
          .join("");
        previewContent = previewContent.replace(
          /{{#each logos}}.*?{{\/each}}/s,
          logoHtml
        );
      } else {
        previewContent = previewContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          value as string
        );
      }
    });
    setPreviewHtml(DOMPurify.sanitize(previewContent));
  };

  const handleLayoutChange = (layout: string) => {
    const selectedLayout = PREDEFINED_LAYOUTS[layout as keyof typeof PREDEFINED_LAYOUTS];
    if (selectedLayout) {
      form.setValue("layout", layout);
      form.setValue("content", selectedLayout.content);
      handleEditorChange(selectedLayout.content);
    }
  };

  const insertVariable = (variable: string) => {
    if (!isEditorReady && !showBasicEditor) {
      toast({
        title: "Error",
        description: "Editor not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const editor = (window as any).tinymce?.activeEditor;
    if (editor) {
      editor.insertContent(variable);
      handleEditorChange(editor.getContent());
    }
  };

  const handleEditorError = () => {
    setShowBasicEditor(true);
    toast({
      title: "Editor Initialization Failed",
      description: "Switched to basic editor mode",
      variant: "destructive",
    });
  };

  const handleStylesChange = (newStyles: Record<string, any>) => {
    setStyles(newStyles);
    form.setValue("styles", newStyles);

    // Update preview with new styles
    const styleSheet = Object.entries(newStyles)
      .map(([selector, styles]) => {
        const styleRules = Object.entries(styles)
          .map(([prop, value]) => `${prop}: ${value};`)
          .join(" ");
        return `${selector} { ${styleRules} }`;
      })
      .join("\n");

    const htmlWithStyles = `
      <style>${styleSheet}</style>
      ${form.getValues("content")}
    `;

    setPreviewHtml(DOMPurify.sanitize(htmlWithStyles));
  };

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Create Newsletter Template</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="layout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Layout Style</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleLayoutChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a layout" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PREDEFINED_LAYOUTS).map(([key, layout]) => (
                        <SelectItem key={key} value={key}>
                          {layout.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <p className="text-sm text-muted-foreground">
                  Choose a pre-made layout for your newsletter
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter template name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="defaultTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Newsletter Title</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="Enter default newsletter title"
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      handleEditorChange(form.getValues("content"));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Logos</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {field.value.map((logo: string, index: number) => (
                        <div key={index} className="relative group">
                          <img
                            src={logo}
                            alt={`Logo ${index + 1}`}
                            className="h-12 w-12 object-contain border rounded p-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newLogos = [...field.value];
                              newLogos.splice(index, 1);
                              field.onChange(newLogos);
                              handleEditorChange(form.getValues("content"));
                            }}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hidden group-hover:block"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="logo-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                const newLogos = [...field.value, event.target.result];
                                field.onChange(newLogos);
                                handleEditorChange(form.getValues("content"));
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                          // Reset the input
                          e.target.value = '';
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-12 w-12"
                          onClick={() => {
                            document.getElementById('logo-upload')?.click();
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-12 flex-shrink-0"
                          onClick={() => {
                            const url = window.prompt("Enter logo URL");
                            if (url) {
                              field.onChange([...field.value, url]);
                              handleEditorChange(form.getValues("content"));
                            }
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          URL
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload logos from your computer or add them via URL
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            {VARIABLE_BUTTONS.map((btn) => (
              <Button
                key={btn.variable}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertVariable(btn.variable)}
                disabled={!isEditorReady && !showBasicEditor}
              >
                Insert {btn.label}
              </Button>
            ))}
          </div>

          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={60}>
              <Tabs defaultValue="edit">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="edit">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative min-h-[400px] border rounded-md">
                            {!isEditorReady && !showBasicEditor && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
                                <Loader2 className="h-8 w-8 animate-spin" />
                              </div>
                            )}
                            {showBasicEditor ? (
                              <textarea
                                className="w-full h-[400px] p-4 font-mono"
                                value={field.value}
                                onChange={(e) => handleEditorChange(e.target.value)}
                              />
                            ) : (
                              <Editor
                                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                                onInit={(_, editor) => {
                                  setIsEditorReady(true);
                                }}
                                init={{
                                  height: 400,
                                  menubar: false,
                                  plugins: [
                                    'link', 'lists', 'code'
                                  ],
                                  toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | code',
                                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                  branding: false,
                                  resize: false,
                                  statusbar: false,
                                  setup: (editor) => {
                                    editor.on('init', (e) => {
                                      if (!e.target.initialized) {
                                        handleEditorError();
                                      }
                                    });
                                  }
                                }}
                                value={field.value}
                                onEditorChange={handleEditorChange}
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="preview">
                  <Card className="p-6">
                    <div 
                      className="preview-content prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </Card>
                </TabsContent>
              </Tabs>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={40}>
              <div className="p-4 border-l h-full">
                <h3 className="text-lg font-semibold mb-4">Style Customization</h3>
                <StylePanel
                  styles={styles}
                  onStylesChange={handleStylesChange}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

const VARIABLE_BUTTONS = [
  { label: "Newsletter Title", variable: "{{newsletter_title}}" },
  { label: "Tweets Content", variable: "{{tweets}}" },
];