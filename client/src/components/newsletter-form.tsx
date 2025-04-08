import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertNewsletterSchema, type Newsletter, type Template, type TweetFilters } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { KeywordManager } from "./keyword-manager";
import { TweetFiltersControl } from "./tweet-filters";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PreDefinedSectorsDialog } from "./pre-defined-sectors-dialog";

interface NewsletterFormProps {
  onSuccess: () => void;
  newsletter?: Newsletter | null;
}

export function NewsletterForm({ onSuccess, newsletter }: NewsletterFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);

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
        accountTypes: [],
        sectorId: undefined
      }
    }
  });

  // This effect ensures we update the form when the newsletter prop changes
  useEffect(() => {
    if (newsletter) {
      const formValues = {
        templateId: newsletter.templateId,
        name: newsletter.name,
        keywords: newsletter.keywords || [],
        tweetFilters: newsletter.tweetFilters || {
          verifiedOnly: false,
          minFollowers: 0,
          excludeReplies: false,
          excludeRetweets: false,
          safeMode: true,
          newsOutlets: [],
          followerThreshold: 'low' as 'low' | 'medium' | 'high',
          accountTypes: [],
          sectorId: undefined
        }
      };
      
      // Store the form state in the query client so other components can access it
      queryClient.setQueryData(['newsletterFormState'], formValues);
      
      form.reset(formValues);
    }
  }, [newsletter, form, queryClient]);
  
  // Listen for changes to the newsletter form state from other components
  useEffect(() => {
    const formState = queryClient.getQueryData(['newsletterFormState']);
    if (formState) {
      console.log("Detected changes to form state:", formState);
      
      // Update the entire tweetFilters object to include everything
      if (formState.tweetFilters) {
        const currentFilters = form.getValues().tweetFilters || {};
        
        // Merge the existing filters with the new ones
        const mergedFilters = {
          ...currentFilters,
          ...formState.tweetFilters
        };
        
        console.log("Updating tweetFilters to:", mergedFilters);
        form.setValue('tweetFilters', mergedFilters);
      }
    }
  }, [form, queryClient]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = newsletter ? "PATCH" : "POST";
      const url = newsletter ? `/api/newsletters/${newsletter.id}` : "/api/newsletters";

      console.log("Saving newsletter with data:", data);

      // Make a deep copy of the form data for payload preparation
      const formData = { ...data };
      console.log("Form data before saving:", formData);
      
      // Ensure all the tweet filters have proper default values
      const tweetFilters = formData.tweetFilters || {};
      
      const payload = {
        templateId: parseInt(String(formData.templateId)),
        name: formData.name,
        keywords: formData.keywords || [],
        tweetFilters: {
          verifiedOnly: tweetFilters.verifiedOnly ?? false,
          minFollowers: tweetFilters.minFollowers ?? 0,
          excludeReplies: tweetFilters.excludeReplies ?? false,
          excludeRetweets: tweetFilters.excludeRetweets ?? false,
          safeMode: tweetFilters.safeMode ?? true,
          newsOutlets: tweetFilters.newsOutlets ?? [],
          followerThreshold: tweetFilters.followerThreshold ?? 'low',
          accountTypes: tweetFilters.accountTypes ?? [],
          sectorId: tweetFilters.sectorId !== undefined ? tweetFilters.sectorId : undefined
        }
      };
      
      console.log("Final payload for saving:", payload);

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
      // Invalidate the queries to ensure we get fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      
      if (newsletter) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/newsletters/${updatedNewsletter.id}`] 
        });
      }

      toast({
        title: "Success",
        description: newsletter ? "Newsletter updated successfully" : "Newsletter created successfully",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error saving newsletter:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DialogContent className={isMobile ? "w-[95vw] max-w-[625px] p-4" : "sm:max-w-[625px]"}>
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
              <div className="bg-accent/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Use Pre-defined Sectors</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse and add curated Twitter handles from industry sectors
                    </p>
                  </div>
                  <Button 
                    type="button"
                    onClick={() => setSectorDialogOpen(true)}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Globe size={18} />
                    Browse Sectors
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="tweetFilters"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TweetFiltersControl
                        onFiltersChange={(filters) => {
                          console.log("Tweet filters changed:", filters);
                          field.onChange(filters as TweetFilters);
                          
                          // Update the form state so other components can access it
                          const currentValues = form.getValues();
                          queryClient.setQueryData(['newsletterFormState'], {
                            ...currentValues,
                            tweetFilters: filters
                          });
                        }}
                        initialFilters={field.value as TweetFilters}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PreDefinedSectorsDialog
                open={sectorDialogOpen} 
                onOpenChange={setSectorDialogOpen}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
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