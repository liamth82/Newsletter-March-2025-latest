import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertNewsletterSchema, type Newsletter, type Template, type NarrativeSettings } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeywordManager } from "./keyword-manager";
import { TweetFilters } from "./tweet-filters";
import { NarrativeSettingsControl } from "./narrative-settings";
import { ScheduleDialog } from "./schedule-dialog";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NewsletterFormProps {
  onSuccess: () => void;
  newsletter?: Newsletter | null;
}

const defaultNarrativeSettings: NarrativeSettings = {
  style: "professional",
  wordCount: 300,
  tone: "formal",
  paragraphCount: 6
};

export function NewsletterForm({ onSuccess, newsletter }: NewsletterFormProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const { toast } = useToast();

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm({
    resolver: zodResolver(insertNewsletterSchema),
    defaultValues: {
      templateId: newsletter?.templateId,
      keywords: newsletter?.keywords || [],
      scheduleTime: newsletter?.scheduleTime,
      tweetFilters: {
        verifiedOnly: newsletter?.tweetFilters?.verifiedOnly ?? false,
        minFollowers: newsletter?.tweetFilters?.minFollowers ?? 0,
        excludeReplies: newsletter?.tweetFilters?.excludeReplies ?? false,
        excludeRetweets: newsletter?.tweetFilters?.excludeRetweets ?? false,
        safeMode: newsletter?.tweetFilters?.safeMode ?? true,
        newsOutlets: newsletter?.tweetFilters?.newsOutlets ?? []
      },
      narrativeSettings: newsletter?.narrativeSettings ?? defaultNarrativeSettings
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const method = newsletter ? "PATCH" : "POST";
      const url = newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters";

      const payload = {
        templateId: parseInt(String(data.templateId)),
        keywords: data.keywords || [],
        scheduleTime: data.scheduleTime,
        tweetFilters: {
          verifiedOnly: Boolean(data.tweetFilters?.verifiedOnly),
          minFollowers: Number(data.tweetFilters?.minFollowers || 0),
          excludeReplies: Boolean(data.tweetFilters?.excludeReplies),
          excludeRetweets: Boolean(data.tweetFilters?.excludeRetweets),
          safeMode: Boolean(data.tweetFilters?.safeMode),
          newsOutlets: data.tweetFilters?.newsOutlets || []
        },
        narrativeSettings: data.narrativeSettings
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
    <DialogContent className="sm:max-w-[625px]">
      <DialogHeader>
        <DialogTitle>
          {newsletter ? "Edit Newsletter" : "Create Newsletter"}
        </DialogTitle>
        <DialogDescription>
          Configure your newsletter settings and content filters
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
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

                <FormField
                  control={form.control}
                  name="narrativeSettings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Narrative Style</FormLabel>
                      <FormControl>
                        <NarrativeSettingsControl
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
                        <TweetFilters
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleOpen(true)}
              >
                Schedule
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {newsletter ? "Update" : "Create"} Newsletter
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <ScheduleDialog
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        onSchedule={(date) => {
          form.setValue("scheduleTime", date);
          setIsScheduleOpen(false);
        }}
      />
    </DialogContent>
  );
}