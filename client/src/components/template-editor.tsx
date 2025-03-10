import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertTemplateSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function TemplateEditor({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: "",
      content: `<div class="newsletter">
  <h1>{{newsletter_title}}</h1>
  
  <div class="intro">
    <p>Welcome to this week's newsletter!</p>
  </div>
  
  <div class="content">
    {{tweets}}
  </div>
  
  <div class="footer">
    <p>Thanks for reading!</p>
  </div>
</div>`,
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

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTML Template</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="font-mono h-[50vh]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending}>
            Save Template
          </Button>
        </div>
      </form>
    </Form>
  );
}
