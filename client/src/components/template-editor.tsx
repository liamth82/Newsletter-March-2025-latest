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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SAMPLE_DATA = {
  newsletter_title: "Weekly Tech Roundup",
  tweets: `<div class="tweet">Sample Tweet #1</div><div class="tweet">Sample Tweet #2</div>`,
};

const VARIABLE_BUTTONS = [
  { label: "Newsletter Title", variable: "{{newsletter_title}}" },
  { label: "Tweets Content", variable: "{{tweets}}" },
];

export function TemplateEditor({ onSuccess }: { onSuccess: () => void }) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [showBasicEditor, setShowBasicEditor] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: "",
      content: `<h1>{{newsletter_title}}</h1>
<div class="content">
  <p>Welcome to our newsletter!</p>
  {{tweets}}
</div>`,
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
      newsletter_title: "Weekly Tech Roundup",
      tweets: `<div class="tweet">Sample Tweet #1</div><div class="tweet">Sample Tweet #2</div>`,
    }).forEach(([key, value]) => {
      previewContent = previewContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value
      );
    });
    setPreviewHtml(DOMPurify.sanitize(previewContent));
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

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Create Newsletter Template</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
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

          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { label: "Newsletter Title", variable: "{{newsletter_title}}" },
                { label: "Tweets Content", variable: "{{tweets}}" },
              ].map((btn) => (
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
          </div>

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