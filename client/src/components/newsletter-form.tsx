import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertNewsletterSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeywordManager } from "./keyword-manager";
import { TweetFilters } from "./tweet-filters";
import { NarrativeSettings } from "./narrative-settings";
import { ScheduleDialog } from "./schedule-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Newsletter, Template, NarrativeSettings as NarrativeSettingsType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface NewsletterFormProps {
  onSuccess: () => void;
  newsletter?: Newsletter | null;
}

const defaultNarrativeSettings: NarrativeSettingsType = {
  style: 'professional',
  wordCount: 300,
  tone: 'formal',
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
      templateId: newsletter?.templateId || templates?.[0]?.id,
      keywords: newsletter?.keywords || [],
      scheduleTime: newsletter?.scheduleTime,
      tweetFilters: newsletter?.tweetFilters || {
        verifiedOnly: false,
        minFollowers: 0,
        excludeReplies: false,
        excludeRetweets: false,
        safeMode: true,
        newsOutlets: []
      },
      narrativeSettings: newsletter?.narrativeSettings || defaultNarrativeSettings
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const method = newsletter ? "PATCH" : "POST";
        const url = newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters";

        // Ensure narrative settings are properly structured
        const narrativeSettings = {
          style: data.narrativeSettings?.style || defaultNarrativeSettings.style,
          wordCount: Number(data.narrativeSettings?.wordCount || defaultNarrativeSettings.wordCount),
          tone: data.narrativeSettings?.tone || defaultNarrativeSettings.tone,
          paragraphCount: Number(data.narrativeSettings?.paragraphCount || defaultNarrativeSettings.paragraphCount)
        };

        const payload = {
          templateId: Number(data.templateId),
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          scheduleTime: data.scheduleTime,
          tweetFilters: {
            verifiedOnly: Boolean(data.tweetFilters?.verifiedOnly),
            minFollowers: Number(data.tweetFilters?.minFollowers || 0),
            excludeReplies: Boolean(data.tweetFilters?.excludeReplies),
            excludeRetweets: Boolean(data.tweetFilters?.excludeRetweets),
            safeMode: Boolean(data.tweetFilters?.safeMode),
            newsOutlets: Array.isArray(data.tweetFilters?.newsOutlets) ? data.tweetFilters.newsOutlets : []
          },
          narrativeSettings
        };

        const res = await apiRequest(method, url, payload);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to save newsletter');
        }
        return await res.json();
      } catch (error: any) {
        console.error('Newsletter mutation error:', error);
        throw new Error(error.message || 'Failed to save newsletter');
      }
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

  const onSubmit = form.handleSubmit((data) => createMutation.mutate(data));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
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
                    <NarrativeSettings
                      settings={field.value}
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

        <ScheduleDialog
          open={isScheduleOpen}
          onOpenChange={setIsScheduleOpen}
          onSchedule={(date) => {
            form.setValue("scheduleTime", date);
            setIsScheduleOpen(false);
          }}
        />
      </form>
    </Form>
  );
}