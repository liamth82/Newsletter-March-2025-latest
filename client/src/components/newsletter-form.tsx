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
import { Template } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function NewsletterForm({ onSuccess }: { onSuccess: () => void }) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const { toast } = useToast();

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm({
    resolver: zodResolver(insertNewsletterSchema),
    defaultValues: {
      templateId: undefined,
      keywords: [],
      scheduleTime: null,
      status: 'draft',
      sentAt: null,
      totalRecipients: null,
      deliveryStatus: null,
      tweetFilters: {
        verifiedOnly: false,
        minFollowers: 0,
        excludeReplies: false,
        excludeRetweets: false,
        safeMode: true,
        newsOutlets: []
      },
      narrativeSettings: {
        style: 'professional',
        wordCount: 300,
        tone: 'formal',
        paragraphCount: 6
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Submitting newsletter data:', data);
      const res = await apiRequest("POST", "/api/newsletters", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create newsletter');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({
        title: "Success",
        description: "Newsletter created successfully",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      console.error('Newsletter creation error:', error);
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
            Create Newsletter
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