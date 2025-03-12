import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertNewsletterSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeywordManager } from "./keyword-manager";
import { TweetFilters } from "./tweet-filters";
import { NarrativeSettings, type NarrativeSettings as NarrativeSettingsType } from "./narrative-settings";
import { ScheduleDialog } from "./schedule-dialog";
import {  queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Newsletter, Template } from "@shared/schema";
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
    mutationFn: async (formData: any) => {
      try {
        const method = newsletter ? "PATCH" : "POST";
        const url = newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters";

        // Explicitly validate the narrative settings
        const narrativeSettings = {
          style: formData.narrativeSettings?.style || defaultNarrativeSettings.style,
          wordCount: Number(formData.narrativeSettings?.wordCount || defaultNarrativeSettings.wordCount),
          tone: formData.narrativeSettings?.tone || defaultNarrativeSettings.tone,
          paragraphCount: Number(formData.narrativeSettings?.paragraphCount || defaultNarrativeSettings.paragraphCount)
        };

        const validatedData = {
          templateId: Number(formData.templateId),
          keywords: Array.isArray(formData.keywords) ? formData.keywords : [],
          scheduleTime: formData.scheduleTime,
          tweetFilters: {
            verifiedOnly: Boolean(formData.tweetFilters?.verifiedOnly),
            minFollowers: Number(formData.tweetFilters?.minFollowers || 0),
            excludeReplies: Boolean(formData.tweetFilters?.excludeReplies),
            excludeRetweets: Boolean(formData.tweetFilters?.excludeRetweets),
            safeMode: Boolean(formData.tweetFilters?.safeMode),
            newsOutlets: Array.isArray(formData.tweetFilters?.newsOutlets) ? formData.tweetFilters.newsOutlets : []
          },
          narrativeSettings
        };

        console.log('Making request to:', url);
        console.log('Request data:', JSON.stringify(validatedData, null, 2));

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(validatedData)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (!response.ok) {
          try {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.message || 'Failed to save newsletter');
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            throw new Error('Server error - please try again');
          }
        }

        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing success response:', parseError);
          throw new Error('Invalid server response');
        }
      } catch (error: any) {
        console.error('Newsletter operation error:', error);
        throw new Error(error.message || 'Failed to save newsletter');
      }
    },
    onSuccess: () => {
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

  const onSubmit = form.handleSubmit((data) => createMutation.mutate(data));

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