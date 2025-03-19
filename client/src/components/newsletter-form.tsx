import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertNewsletterSchema, type Newsletter, type Template } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeywordManager } from "./keyword-manager";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NewsletterFormProps {
  onSuccess: () => void;
  newsletter?: Newsletter | null;
}

export function NewsletterForm({ onSuccess, newsletter }: NewsletterFormProps) {
  const { toast } = useToast();

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm({
    resolver: zodResolver(insertNewsletterSchema),
    defaultValues: {
      templateId: newsletter?.templateId,
      keywords: newsletter?.keywords || [],
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const method = newsletter ? "PATCH" : "POST";
      const url = newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters";

      const payload = {
        templateId: parseInt(String(data.templateId)),
        keywords: data.keywords || [],
      };

      const res = await apiRequest(method, url, payload);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to save newsletter");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({
        title: "Success",
        description: newsletter ? "Newsletter updated successfully" : "Newsletter created successfully",
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

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {newsletter ? "Edit Newsletter" : "Create Newsletter"}
        </DialogTitle>
        <DialogDescription>
          Configure your newsletter settings
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="templateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template</FormLabel>
                <Select
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id.toString()}
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keywords</FormLabel>
                <FormControl>
                  <KeywordManager
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {newsletter ? "Update" : "Create"} Newsletter
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}