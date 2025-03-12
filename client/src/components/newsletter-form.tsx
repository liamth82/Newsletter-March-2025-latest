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
import { Newsletter, Template } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface NewsletterFormProps {
  onSuccess: () => void;
  newsletter?: Newsletter | null;
}

const defaultNarrativeSettings = {
  style: 'professional' as const,
  wordCount: 300,
  tone: 'formal' as const,
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
      templateId: newsletter?.templateId || undefined,
      keywords: newsletter?.keywords || [],
      scheduleTime: newsletter?.scheduleTime || null,
      tweetFilters: newsletter?.tweetFilters || {
        verifiedOnly: false,
        minFollowers: 0,
        excludeReplies: false,
        excludeRetweets: false,
        safeMode: true,
        newsOutlets: []
      },
      narrativeSettings: newsletter?.narrativeSettings || defaultNarrativeSettings
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        // Clean up the data before sending
        const payload = {
          templateId: data.templateId,
          keywords: data.keywords,
          scheduleTime: data.scheduleTime,
          tweetFilters: {
            verifiedOnly: Boolean(data.tweetFilters.verifiedOnly),
            minFollowers: Number(data.tweetFilters.minFollowers),
            excludeReplies: Boolean(data.tweetFilters.excludeReplies),
            excludeRetweets: Boolean(data.tweetFilters.excludeRetweets),
            safeMode: Boolean(data.tweetFilters.safeMode),
            newsOutlets: Array.isArray(data.tweetFilters.newsOutlets) ? data.tweetFilters.newsOutlets : []
          },
          narrativeSettings: {
            style: String(data.narrativeSettings.style),
            wordCount: Number(data.narrativeSettings.wordCount),
            tone: String(data.narrativeSettings.tone),
            paragraphCount: Number(data.narrativeSettings.paragraphCount)
          }
        };

        console.log('Submitting newsletter data:', payload);

        const res = await apiRequest(
          newsletter ? "PATCH" : "POST",
          newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters",
          payload
        );

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to save newsletter');
          } else {
            const text = await res.text();
            console.error('Server error response:', text);
            throw new Error(`Server error: ${res.status}`);
          }
        }

        const result = await res.json();
        console.log('Server response:', result);
        return result;
      } catch (error) {
        console.error('Newsletter operation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({
        title: "Success",
        description: `Newsletter ${newsletter ? 'updated' : 'created'} successfully`,
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

  const onSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="filters">Tweet Filters</TabsTrigger>
            <TabsTrigger value="narrative">Narrative Style</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
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

          <TabsContent value="filters" className="space-y-6">
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

          <TabsContent value="narrative" className="space-y-6">
            <FormField
              control={form.control}
              name="narrativeSettings"
              render={({ field }) => (
                <FormItem>
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
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {newsletter ? 'Update' : 'Create'} Newsletter
          </Button>
        </div>
      </form>

      <ScheduleDialog
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        onSchedule={(date) => {
          form.setValue("scheduleTime", date);
          setIsScheduleOpen(false);
        }}
      />
    </Form>
  );
}