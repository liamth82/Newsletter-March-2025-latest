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
import DOMPurify from 'dompurify';
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const SAMPLE_DATA = {
  newsletter_title: "Weekly Tech Roundup",
  tweets: `
    <div class="tweet">
      <p>Sample Tweet #1: Exciting developments in AI!</p>
    </div>
    <div class="tweet">
      <p>Sample Tweet #2: New features launched!</p>
    </div>
  `,
};

const VARIABLE_BUTTONS = [
  { label: "Newsletter Title", variable: "{{newsletter_title}}" },
  { label: "Tweets Content", variable: "{{tweets}}" },
];

export function TemplateEditor({ onSuccess }: { onSuccess: () => void }) {
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: "",
      content: `
<div class="newsletter">
  <div class="header">
    <h1>{{newsletter_title}}</h1>
  </div>

  <div class="content">
    <div class="intro">
      <p>Welcome to this week's newsletter!</p>
    </div>

    <div class="tweets-section">
      {{tweets}}
    </div>
  </div>

  <div class="footer">
    <p>Thanks for reading!</p>
  </div>
</div>

<style>
.newsletter {
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.content {
  line-height: 1.6;
}

.tweets-section {
  margin: 20px 0;
}

.tweet {
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  background: #f8f8f8;
}

.footer {
  margin-top: 30px;
  text-align: center;
  color: #666;
}
</style>`,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      onSuccess();
    },
  });

  const handleEditorChange = (content: string) => {
    form.setValue("content", content);

    // Update preview with sample data
    let previewContent = content;
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      previewContent = previewContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value
      );
    });

    setPreviewHtml(DOMPurify.sanitize(previewContent));
  };

  const insertVariable = (variable: string) => {
    const editor = (window as any).tinymce.activeEditor;
    if (editor) {
      editor.insertContent(variable);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex gap-2">
            {VARIABLE_BUTTONS.map((btn) => (
              <Button
                key={btn.variable}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertVariable(btn.variable)}
              >
                Insert {btn.label}
              </Button>
            ))}
          </div>

          <Tabs defaultValue="edit">
            <TabsList>
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
                      <Editor
                        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                        init={{
                          height: 500,
                          menubar: true,
                          plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                          ],
                          toolbar: 'undo redo | blocks | ' +
                            'bold italic forecolor | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'removeformat | help',
                          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                        }}
                        value={field.value}
                        onEditorChange={handleEditorChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="preview">
              <Card className="p-6">
                <div 
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending}>
            Save Template
          </Button>
        </div>
      </form>
    </Form>
  );
}