import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertNewsletterSchema, type Newsletter, type Template } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { KeywordManager } from "./keyword-manager";
import { TweetFiltersControl } from "./tweet-filters";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      templateId: newsletter?.templateId || undefined,
      name: newsletter?.name || 'Untitled Newsletter',
      keywords: newsletter?.keywords || [],
      tweetFilters: newsletter?.tweetFilters || {
        verifiedOnly: false,
        minFollowers: 0,
        excludeReplies: false,
        excludeRetweets: false,
        safeMode: true,
        newsOutlets: [],
        followerThreshold: 'low',
        accountTypes: []
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = newsletter ? "PATCH" : "POST";
      const url = newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters";

      const payload = {
        templateId: parseInt(String(data.templateId)),
        name: data.name,
        keywords: data.keywords || [],
        tweetFilters: {
          verifiedOnly: data.tweetFilters.verifiedOnly ?? false,
          minFollowers: data.tweetFilters.minFollowers ?? 0,
          excludeReplies: data.tweetFilters.excludeReplies ?? false,
          excludeRetweets: data.tweetFilters.excludeRetweets ?? false,
          safeMode: data.tweetFilters.safeMode ?? true,
          newsOutlets: data.tweetFilters.newsOutlets ?? [],
          followerThreshold: data.tweetFilters.followerThreshold ?? 'low',
          accountTypes: data.tweetFilters.accountTypes ?? []
        }
      };

      const res = await apiRequest(method, url, payload);

      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || "Failed to save newsletter");
        } catch (e) {
          throw new Error(errorText || "Failed to save newsletter");
        }
      }

      return await res.json();
    },
    onSuccess: (updatedNewsletter) => {
      // Update both the list and individual newsletter queries
      queryClient.setQueryData(["/api/newsletters"], (oldData: Newsletter[] = []) => {
        if (newsletter) {
          return oldData.map(n => n.id === updatedNewsletter.id ? updatedNewsletter : n);
        } else {
          return [...oldData, updatedNewsletter];
        }
      });
      queryClient.setQueryData([`/api/newsletters/${updatedNewsletter.id}`], updatedNewsletter);

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
    <DialogContent className="sm:max-w-[625px]">
      <DialogHeader>
        <DialogTitle>{newsletter ? "Edit Newsletter" : "Create Newsletter"}</DialogTitle>
        <DialogDescription>
          Configure your newsletter settings and filters
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Newsletter Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter newsletter name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <FormField
                control={form.control}
                name="tweetFilters"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TweetFiltersControl
                        onFiltersChange={field.onChange}
                        initialFilters={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

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