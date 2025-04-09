import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newsletter, type Tweet, type NarrativeSettings, type Template } from "@shared/schema";
import { Loader2, Settings, Edit, FileEdit, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TweetFiltersControl } from "@/components/tweet-filters";
import { NarrativeSettingsControl } from "@/components/narrative-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import DOMPurify from 'dompurify';

// Update the fetch tweets mutation to use proper types
interface FetchTweetsPayload {
  keywords: string[];
  verifiedOnly: boolean;
  minFollowers: number;
  excludeReplies: boolean;
  excludeRetweets: boolean;
  safeMode: boolean;
  newsOutlets: string[];
  followerThreshold?: 'low' | 'medium' | 'high';
  accountTypes?: ('news' | 'verified' | 'influencer')[];
  sectorId?: number;
}

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("preview");

  const { data: newsletter, isLoading: loadingNewsletter } = useQuery<Newsletter>({
    queryKey: [`/api/newsletters/${id}`],
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: [`/api/templates/${newsletter?.templateId}`],
    enabled: !!newsletter?.templateId,
  });

  // Mutation for updating narrative settings
  const updateNarrativeSettingsMutation = useMutation({
    mutationFn: async (narrativeSettings: NarrativeSettings) => {
      if (!newsletter) throw new Error('Newsletter not found');
      
      const payload = {
        ...newsletter,
        narrativeSettings
      };
      
      const res = await apiRequest("PATCH", `/api/newsletters/${id}`, payload);
      
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Failed to update narrative settings');
        } catch {
          throw new Error(errorText || 'Failed to update narrative settings');
        }
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Narrative settings have been saved. Refreshing content...",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters/${id}`] });
      
      // Automatically refresh the content with the new settings
      setActiveTab('preview');
      
      // Use a small delay to ensure state has been updated
      setTimeout(() => {
        fetchTweetsMutation.mutate({});
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchTweetsMutation = useMutation({
    mutationFn: async (payload?: any) => {
      if (!newsletter) throw new Error('Newsletter not found');

      const filters = newsletter.tweetFilters || {
        verifiedOnly: false,
        minFollowers: 0,
        excludeReplies: false,
        excludeRetweets: false,
        safeMode: true,
        newsOutlets: [],
        followerThreshold: 'low',
        accountTypes: [],
        sectorId: undefined
      };

      // If we have a sectorId, fetch the sector handles
      if (filters.sectorId) {
        try {
          console.log(`Fetching handles for sector ID: ${filters.sectorId}`);
          const sectorResponse = await fetch(`/api/sectors/${filters.sectorId}`);
          if (sectorResponse.ok) {
            const sectorData = await sectorResponse.json();
            console.log("Fetched sector data:", sectorData);
            
            if (sectorData.handles && sectorData.handles.length > 0) {
              console.log(`Found ${sectorData.handles.length} handles for sector`);
              // Always use sector handles, they take priority
              filters.newsOutlets = sectorData.handles;
            } else {
              console.warn("No handles found for sector");
            }
          } else {
            console.error("Failed to fetch sector data:", await sectorResponse.text());
          }
        } catch (error) {
          console.error("Error fetching sector handles:", error);
        }
      } else {
        console.log("No sector ID specified in filters");
      }

      const requestData: FetchTweetsPayload = {
        keywords: newsletter.keywords,
        ...filters,
        newsOutlets: (filters.newsOutlets || []).map(outlet => {
          const match = outlet.match(/(?:x\.com\/|twitter\.com\/)([^\/]+)/);
          return match ? match[1] : outlet.replace(/^@/, '');
        })
      };

      const res = await apiRequest("POST", `/api/newsletters/${id}/tweets`, requestData);
      
      if (!res.ok) {
        // Check if we got a 404 (no tweets found) with a message
        if (res.status === 404) {
          const data = await res.json();
          throw new Error(data.message || 'No tweets found with current search criteria');
        }
        
        // Handle API authentication errors (500)
        if (res.status === 500) {
          const errorText = await res.text();
          try {
            const errorJson = JSON.parse(errorText);
            
            // Check if this is a Twitter authentication error
            if (errorJson.message && (
                errorJson.message.includes('authentication failed') || 
                errorJson.message.includes('credentials') ||
                errorJson.message.includes('401')
              )) {
              console.error("Twitter API authentication error:", errorJson.message);
              throw new Error(`Twitter API authentication failed. Please contact support to update API credentials.`);
            }
            
            throw new Error(errorJson.message || 'Failed to fetch tweets');
          } catch (e) {
            throw new Error(errorText || 'Failed to fetch tweets');
          }
        }
        
        // Other error case
        const errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Failed to fetch tweets');
        } catch {
          throw new Error(errorText || 'Failed to fetch tweets');
        }
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters/${id}`] });
      
      // Check if we got any tweet content
      if (data.tweetContent && data.tweetContent.length > 0) {
        toast({
          title: "Success",
          description: `Newsletter updated with ${data.tweetContent.length} tweets.`,
        });
      } else {
        toast({
          title: "Warning",
          description: "No tweets were found. Try adjusting your keywords or filters.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      // Check if this is a Twitter API authentication error
      const isAuthError = error.message?.includes('authentication failed') || 
                          error.message?.includes('API credentials') ||
                          error.message?.includes('Twitter API');
      
      if (isAuthError) {
        toast({
          title: "Twitter API Connection Issue",
          description: "We're currently experiencing difficulties connecting to Twitter/X. Our team has been notified and is working on a fix.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Criteria Issue",
          description: error.message || "Failed to find tweets. Try using broader keywords or fewer filters.",
          variant: "destructive",
        });
      }
    },
  });

  if (loadingNewsletter || loadingTemplate) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  if (!newsletter || !template || !template.content) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <p>Newsletter or template not found</p>
          </div>
        </main>
      </div>
    );
  }

  // Generate tweet content before processing template
  const tweetContent = newsletter.tweetContent && Array.isArray(newsletter.tweetContent) && newsletter.tweetContent.length > 0
    ? generateNarrativeSummary(
        newsletter.tweetContent as Tweet[],
        newsletter.narrativeSettings || {
          style: 'professional',
          tone: 'formal',
          wordCount: 300,
          paragraphCount: 6
        }
      )
    : `<div class="newsletter-section">
        <div class="bg-muted p-6 rounded-lg text-center">
          <h3 class="text-xl font-semibold mb-3">No Content Available</h3>
          <p class="text-muted-foreground mb-4">We couldn't find any tweets matching your current search criteria.</p>
          <div class="space-y-2 text-left mx-auto max-w-md">
            <h4 class="font-medium">Try the following:</h4>
            <ul class="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Use broader or more common keywords</li>
              <li>Reduce follower count requirements (currently ${newsletter.tweetFilters?.minFollowers || 0})</li>
              <li>Turn off some filters, like "verified only" or "exclude replies"</li>
              <li>Try selecting an industry sector with trusted accounts</li>
              <li>Add more news sources to your trusted sources list</li>
            </ul>
          </div>
          <p class="mt-4 text-sm text-muted-foreground">Click the "Refresh Content" button after adjusting your newsletter settings</p>
        </div>
       </div>`;

  // Process template content with Handlebars-like replacements
  let processedContent = template.content;

  // Replace newsletter title
  processedContent = processedContent.replace(
    /{{newsletter_title}}/g,
    newsletter.name || 'Newsletter Preview'
  );

  // Replace tweets placeholder with generated content
  processedContent = processedContent.replace(/{{tweets}}/g, tweetContent);

  // Handle logos section
  if (template.logos && Array.isArray(template.logos) && template.logos.length > 0) {
    const logoHtml = template.logos
      .map(logo => {
        const logoUrl = typeof logo === 'string' ? logo : '';
        return `<img src="${logoUrl}" alt="Logo" class="logo" />`;
      })
      .join('');
    processedContent = processedContent.replace(
      /{{#each logos}}[\s\S]*?{{\/each}}/g,
      logoHtml
    );
  }

  const styles = `
    <style>
      .newsletter-content {
        font-family: ui-sans-serif, system-ui, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
      }
      .newsletter-section {
        padding: 1rem;
        margin-bottom: 1.5rem;
      }
      h1 {
        font-size: 2rem;
        font-weight: bold;
        color: hsl(var(--primary));
        margin-bottom: 1.5rem;
      }
      p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }
      .logo-container {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      .logo {
        max-height: 50px;
        width: auto;
      }
      .prose {
        max-width: none;
      }
    </style>
  `;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Newsletter Preview</h1>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLocation('/')}>
                <FileText className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="content-settings" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Content Settings
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Tweet Filters
              </TabsTrigger>
            </TabsList>

            {/* PREVIEW TAB */}
            <TabsContent value="preview" className="space-y-4">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={() => {
                  const updatedFilters = {
                    ...newsletter.tweetFilters,
                    useSampleData: true
                  };
                  
                  // Update newsletter with the sample data flag
                  const payload = {
                    ...newsletter,
                    tweetFilters: updatedFilters
                  };
                  
                  // Call the mutation with the updated payload
                  fetchTweetsMutation.mutate(payload);
                }}
                disabled={fetchTweetsMutation.isPending}
                >
                  {fetchTweetsMutation.isPending && newsletter.tweetFilters?.useSampleData && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Use Sample Data
                </Button>
                <Button
                  onClick={() => {
                    // Ensure useSampleData is set to false
                    const updatedFilters = {
                      ...newsletter.tweetFilters,
                      useSampleData: false
                    };
                    
                    // Update newsletter with the flag turned off
                    const payload = {
                      ...newsletter,
                      tweetFilters: updatedFilters
                    };
                    
                    // Call the mutation with the updated payload
                    fetchTweetsMutation.mutate(payload);
                  }}
                  disabled={fetchTweetsMutation.isPending}
                >
                  {fetchTweetsMutation.isPending && !newsletter.tweetFilters?.useSampleData && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Refresh Content
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <div 
                    className="preview-content newsletter-content"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(styles + processedContent)
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* CONTENT SETTINGS TAB */}
            <TabsContent value="content-settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Generation Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <NarrativeSettingsControl 
                    value={newsletter.narrativeSettings || {
                      style: 'professional',
                      tone: 'formal',
                      wordCount: 300,
                      paragraphCount: 6,
                      format: 'newsletter',
                      themeStyle: 'minimal',
                      useQuotes: false,
                      improveSentences: true,
                      enhanceCohesion: true,
                      includeTransitions: true
                    }}
                    onChange={(updatedSettings) => {
                      console.log('Narrative settings update requested:', updatedSettings);
                      updateNarrativeSettingsMutation.mutate(updatedSettings);
                    }}
                  />
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    // Make sure we're using the latest narrative settings
                    if (newsletter && newsletter.narrativeSettings) {
                      console.log('Applying narrative settings and refreshing content:', 
                        JSON.stringify(newsletter.narrativeSettings, null, 2));
                    }
                    setActiveTab('preview');
                    fetchTweetsMutation.mutate({
                      narrativeSettings: newsletter.narrativeSettings
                    });
                  }}
                  disabled={updateNarrativeSettingsMutation.isPending}
                >
                  {updateNarrativeSettingsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Apply Settings & Refresh Content
                </Button>
              </div>
            </TabsContent>

            {/* TWEET FILTERS TAB */}
            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tweet Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <TweetFiltersControl 
                    onFiltersChange={(filters) => {
                      const payload = {
                        ...newsletter,
                        tweetFilters: filters
                      };
                      
                      // Update newsletter with new filters
                      apiRequest("PATCH", `/api/newsletters/${id}`, payload)
                        .then(() => {
                          toast({
                            title: "Filters Updated",
                            description: "Tweet filters have been saved successfully.",
                          });
                          queryClient.invalidateQueries({ queryKey: [`/api/newsletters/${id}`] });
                        })
                        .catch((error) => {
                          toast({
                            title: "Failed to Update Filters",
                            description: error.message,
                            variant: "destructive",
                          });
                        });
                    }}
                    initialFilters={newsletter.tweetFilters || undefined}
                  />
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    console.log('Applying filters and refreshing content');
                    setActiveTab('preview');
                    fetchTweetsMutation.mutate({
                      narrativeSettings: newsletter.narrativeSettings
                    });
                  }}
                  disabled={fetchTweetsMutation.isPending}
                >
                  {fetchTweetsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Apply Filters & Refresh Content
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Helper function to generate narrative content from tweets
function generateNarrativeSummary(tweets: Tweet[], settings: NarrativeSettings): string {
  // Debug logging to ensure settings are being applied
  console.log('Generating narrative summary with settings:', JSON.stringify(settings, null, 2));
  if (!tweets || tweets.length === 0) {
    return `<div class="newsletter-section">
      <p class="text-muted-foreground">No news content available. Here are some suggestions:</p>
      <ul class="list-disc pl-6 mt-2 text-muted-foreground">
        <li>Try fetching tweets again</li>
        <li>Adjust your keywords to be more general</li>
        <li>Create predefined sectors from the Sectors page for curated content sources</li>
        <li>Add news outlets or select an industry sector from the filter options</li>
      </ul>
    </div>`;
  }

  // Clean and sort tweets by date
  const cleanedTweets = tweets
    .map(tweet => ({
      author: tweet.author_username,
      text: tweet.text
        .replace(/RT @\w+: /, '')
        .replace(/https:\/\/t\.co\/\w+/g, '')
        .replace(/\n+/g, ' ')
        .replace(/&amp;/g, '&') // Fix HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/@\w+/g, '') // Remove @mentions
        .replace(/^\W+/, '') // Remove leading non-word characters
        .trim(),
      date: new Date(tweet.created_at),
      metrics: tweet.public_metrics
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Group tweets by topic using simple keyword clustering
  interface TopicGroup {
    topic: string;
    tweets: typeof cleanedTweets;
    score: number;
  }

  // Extract potential topics from tweet text
  const extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'that', 'this', 'these', 'those', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can'];
    return words.filter(word => 
      word.length > 3 && 
      !stopWords.includes(word) && 
      !/^\d+$/.test(word)
    );
  };

  // Count keyword frequency across all tweets
  const keywordCounts: Record<string, number> = {};
  cleanedTweets.forEach(tweet => {
    const keywords = extractKeywords(tweet.text);
    keywords.forEach(word => {
      keywordCounts[word] = (keywordCounts[word] || 0) + 1;
    });
  });

  // Get the top keywords
  const topKeywords = Object.entries(keywordCounts)
    .filter(([_, count]) => count >= 2) // Only consider keywords that appear in at least 2 tweets
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Take top 5 keywords as topic candidates
    .map(([word]) => word);

  // Group tweets by these keywords
  const topicGroups: TopicGroup[] = topKeywords.map(keyword => {
    const relevantTweets = cleanedTweets.filter(tweet => 
      tweet.text.toLowerCase().includes(keyword)
    );
    
    // Calculate a score for this topic based on number of tweets and engagement
    const score = relevantTweets.length * 10 + 
      relevantTweets.reduce((sum, tweet) => 
        sum + (tweet.metrics?.like_count || 0) + (tweet.metrics?.retweet_count || 0) * 2, 
      0);
    
    return {
      topic: keyword,
      tweets: relevantTweets,
      score
    };
  });

  // Sort topic groups by score
  topicGroups.sort((a, b) => b.score - a.score);

  // Enhanced transition phrases that sound more professional and varied
  const professionalTransitions = [
    "According to %author%, %topic% insights reveal that",
    "In a recent analysis, %author% explains that",
    "Industry expert %author% points out that",
    "%author%'s latest report indicates that",
    "Research from %author% shows that",
    "Market analysis by %author% suggests that",
    "In %author%'s assessment,",
    "Notable insights from %author% reveal that",
    "Based on data compiled by %author%,",
    "%author% presents compelling evidence that"
  ];

  const casualTransitions = [
    "%author% recently shared that",
    "According to %author%'s latest update,",
    "%author% highlights an interesting point:",
    "In a recent post, %author% mentioned that",
    "%author% brings up the fact that",
    "As %author% points out,",
    "%author% notes in a recent discussion,",
    "Adding another perspective, %author% states that",
    "%author% brings attention to",
    "In %author%'s own words,"
  ];

  const storytellingTransitions = [
    "The narrative shifts as %author% reveals that",
    "%author% adds a new chapter to the story, stating that",
    "The plot evolves with %author%'s revelation that",
    "Adding a twist to the tale, %author% shares that",
    "%author% continues the story by noting that",
    "In an interesting development, %author% relates that",
    "The story unfolds further as %author% explains that",
    "%author% builds on this narrative by adding that",
    "The chronicle continues with %author%'s observation that",
    "As the story develops, %author% points out that"
  ];

  // More professional and context-aware openings
  const enhancedOpenings: Record<NarrativeSettings['style'], string[]> = {
    professional: [
      "Recent developments in %topic% show significant changes. According to %author%,",
      "The latest analysis of %topic% trends reveals new insights. %author% reports that",
      "Important updates have emerged regarding %topic%. %author% notes that",
      "Industry experts are closely monitoring developments in %topic%. %author% explains that",
      "New research published on %topic% has garnered attention. %author% points out that"
    ],
    casual: [
      "Here's what's new with %topic% this week: %author% shares that",
      "Exciting updates about %topic% are making waves. %author% tells us that",
      "The buzz around %topic% continues to grow. %author% mentions that",
      "People are talking about the latest in %topic%. According to %author%,",
      "There's been some interesting movement in the %topic% space. %author% notes that"
    ],
    storytelling: [
      "The story of %topic% continues to unfold in fascinating ways. %author% reveals that",
      "A new chapter in the %topic% narrative is being written. %author% shares that",
      "The journey through the evolving landscape of %topic% continues. %author% explains that",
      "The %topic% saga takes an interesting turn this week. %author% relates that",
      "Following the thread of %topic% leads to new discoveries. %author% points out that"
    ]
  };

  // More professional and insightful conclusions
  const enhancedConclusions: Record<NarrativeSettings['style'], string[]> = {
    professional: [
      "To conclude this analysis, %author% emphasizes that",
      "Summarizing these developments, %author% notes that",
      "Looking ahead, %author% projects that",
      "The implications of these findings are significant. %author% concludes that",
      "This analysis would be incomplete without mentioning that %author% indicates"
    ],
    casual: [
      "Wrapping things up, %author% adds that",
      "Before we finish, it's worth noting that %author% mentions",
      "One final point from %author% is that",
      "To put it all in perspective, %author% reminds us that",
      "Let's not forget what %author% pointed out:"
    ],
    storytelling: [
      "As this chapter closes, %author% leaves us with the thought that",
      "The story reaches a turning point as %author% reveals that",
      "This part of the journey concludes with %author%'s observation that",
      "The narrative comes full circle when %author% shares that",
      "To bring this tale to its conclusion, %author% imparts that"
    ]
  };

  // Build cohesive paragraphs grouped by topic
  // Add a style-specific header to make it obvious which style is being used
  let headerHtml = '';
  let headerBgColor = '';
  let headerTitle = '';
  let headerFont = '';
  
  // Set style-specific header properties
  switch(settings.style) {
    case 'professional':
      headerBgColor = 'bg-blue-700';
      headerTitle = 'Market Analysis';
      headerFont = 'font-serif'; // Georgia
      break;
    case 'casual':
      headerBgColor = 'bg-green-600';
      headerTitle = "What's New";
      headerFont = 'font-sans'; // Arial
      break;
    case 'storytelling':
      headerBgColor = 'bg-purple-700';
      headerTitle = 'The Latest Chapter';
      headerFont = 'font-serif italic'; // Palatino-like
      break;
  }
  
  // Create the header with style and tone indicators
  headerHtml = `
    <div class="${headerBgColor} text-white p-4 rounded-t-lg mb-6">
      <h2 class="text-xl ${headerFont} font-bold">${headerTitle}</h2>
      <div class="flex gap-2 mt-2">
        <span class="text-xs bg-white/20 px-2 py-1 rounded">${settings.style}</span>
        <span class="text-xs bg-white/20 px-2 py-1 rounded">${settings.tone}</span>
      </div>
    </div>
  `;
  
  let contentHtml = headerHtml;
  let usedTweetIds = new Set<string>();
  
  // Add a properly formatted introduction
  const introTweet = cleanedTweets[0];
  const mainTopic = topicGroups.length > 0 ? topicGroups[0].topic : '';
  
  if (introTweet) {
    usedTweetIds.add(introTweet.text);
    
    const openingTemplates = enhancedOpenings[settings.style];
    const openingTemplate = openingTemplates[Math.floor(Math.random() * openingTemplates.length)];
    
    const opening = openingTemplate
      .replace('%topic%', mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1))
      .replace('%author%', introTweet.author);
    
    const toneClass = settings.tone === 'formal' ? 'text-gray-800 font-medium' : 'text-gray-700';
    const introText = introTweet.text.charAt(0).toUpperCase() + introTweet.text.slice(1);
    
    contentHtml += `<p class="mb-6 ${toneClass} leading-relaxed text-lg">${opening} ${introText}</p>`;
  }
  
  // Process each topic group to create cohesive content sections
  const usedTopics = new Set<string>();
  
  // Limit to the requested paragraph count, accounting for intro and conclusion
  const remainingParagraphs = settings.paragraphCount - 2;
  let paragraphCount = 0;
  
  topicGroups.forEach(group => {
    if (paragraphCount >= remainingParagraphs || usedTopics.has(group.topic)) return;
    
    const topicTweets = group.tweets.filter(t => !usedTweetIds.has(t.text)).slice(0, 2);
    if (topicTweets.length === 0) return;
    
    usedTopics.add(group.topic);
    
    // Create a paragraph for this topic using 1-2 related tweets
    let topicHtml = '';
    
    topicTweets.forEach((tweet, idx) => {
      usedTweetIds.add(tweet.text);
      
      let transitionList;
      switch (settings.style) {
        case 'professional': transitionList = professionalTransitions; break;
        case 'casual': transitionList = casualTransitions; break;
        case 'storytelling': transitionList = storytellingTransitions; break;
      }
      
      const transition = transitionList[Math.floor(Math.random() * transitionList.length)]
        .replace('%author%', tweet.author)
        .replace('%topic%', group.topic);
      
      const tweetText = tweet.text.charAt(0).toUpperCase() + tweet.text.slice(1);
      const toneClass = settings.tone === 'formal' ? 'text-gray-800' : 'text-gray-700';
      
      topicHtml += `<p class="mb-4 ${toneClass} leading-relaxed">${transition} ${tweetText}</p>`;
      paragraphCount++;
    });
    
    if (topicHtml) {
      const topicTitle = group.topic.charAt(0).toUpperCase() + group.topic.slice(1);
      contentHtml += `
      <div class="mb-8">
        <h3 class="text-lg font-medium mb-3 text-primary">${topicTitle} Insights</h3>
        ${topicHtml}
      </div>`;
    }
  });
  
  // Add a conclusion
  const remainingTweets = cleanedTweets.filter(t => !usedTweetIds.has(t.text));
  if (remainingTweets.length > 0) {
    const conclusionTweet = remainingTweets[0];
    usedTweetIds.add(conclusionTweet.text);
    
    const conclusionTemplates = enhancedConclusions[settings.style];
    const conclusionTemplate = conclusionTemplates[Math.floor(Math.random() * conclusionTemplates.length)];
    
    const conclusion = conclusionTemplate.replace('%author%', conclusionTweet.author);
    const conclusionText = conclusionTweet.text.charAt(0).toUpperCase() + conclusionTweet.text.slice(1);
    
    const toneClass = settings.tone === 'formal' ? 'text-gray-800' : 'text-gray-700';
    contentHtml += `<p class="mt-8 ${toneClass} leading-relaxed">${conclusion} ${conclusionText}</p>`;
  }
  
  // Create dramatically different styling for each style setting
  let styleClass;
  let additionalStyles = '';
  
  switch(settings.style) {
    case 'professional':
      styleClass = 'prose-headings:text-blue-800 prose-p:text-gray-800 prose-strong:text-blue-700';
      additionalStyles = `
        <style>
          .narrative-content { 
            font-family: 'Georgia', serif;
            border-left: 3px solid blue;
            padding-left: 1rem;
          }
          .narrative-content h2 {
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.5rem;
          }
          .topic-section { margin-bottom: 1.5rem; }
        </style>
      `;
      break;
    case 'casual':
      styleClass = 'prose-headings:text-green-500 prose-p:text-gray-700';
      additionalStyles = `
        <style>
          .narrative-content { 
            font-family: 'Arial', sans-serif;
          }
          .narrative-content h2 {
            color: #22c55e !important; 
            font-weight: 600;
          }
          .topic-section { 
            margin-bottom: 1.5rem; 
            background-color: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
          }
        </style>
      `;
      break;
    case 'storytelling':
      styleClass = 'prose-p:text-gray-700 prose-headings:text-purple-600 prose-headings:italic';
      additionalStyles = `
        <style>
          .narrative-content { 
            font-family: 'Palatino', serif;
            line-height: 1.8;
            background-color: #fdfdf9;
            padding: 1.5rem;
            border-radius: 8px;
          }
          .narrative-content h2 {
            font-style: italic;
            text-align: center;
            margin-bottom: 1.5rem;
          }
          .narrative-content p:first-of-type:first-letter {
            font-size: 2.5em;
            font-weight: bold;
            float: left;
            margin-right: 0.1em;
            line-height: 0.9;
          }
          .topic-section { margin-bottom: 2rem; }
        </style>
      `;
      break;
    default:
      styleClass = 'prose-headings:text-primary prose-p:text-gray-800 prose-strong:text-primary';
      additionalStyles = '';
  }

  // Set the title based on the style and main topic
  let title;
  if (topicGroups.length > 0 && topicGroups[0].topic) {
    const topicName = topicGroups[0].topic.charAt(0).toUpperCase() + topicGroups[0].topic.slice(1);
    
    // Create very distinct titles based on the style
    switch(settings.style) {
      case 'professional':
        title = `${topicName} Market Analysis & Insights`;
        break;
      case 'casual':
        title = `What's New with ${topicName}? Latest Updates!`;
        break;
      case 'storytelling':
        title = `The Unfolding Story of ${topicName}`;
        break;
      default:
        title = `${topicName} Update`;
    }
  } else {
    title = 'Latest Industry Developments';
  }

  // Add style-specific labels at the top to make it obvious which style is being used
  const styleLabel = `
    <div class="style-indicator p-2 mb-4 text-white text-center text-sm rounded" 
         style="background-color: ${settings.style === 'professional' ? '#1e40af' : 
                                    settings.style === 'casual' ? '#059669' : 
                                    '#7e22ce'}">
      ${settings.style === 'professional' ? 'PROFESSIONAL STYLE' : 
        settings.style === 'casual' ? 'CASUAL STYLE' : 
        'STORYTELLING STYLE'} - ${settings.tone.toUpperCase()} TONE
    </div>
  `;

  return `
    ${additionalStyles}
    <div class="narrative-content">
      ${styleLabel}
      <div class="prose max-w-none ${styleClass}">
        <h2 class="text-2xl font-semibold mb-5">${title}</h2>
        ${contentHtml}
        <div class="text-sm text-muted-foreground mt-8 pt-4 border-t border-muted">
          <p>Last updated: ${new Date().toLocaleString()}</p>
          <p class="text-xs text-muted-foreground mt-1">
            Generated with: ${settings.paragraphCount} paragraphs, ${settings.wordCount} word target, 
            ${settings.style} style, ${settings.tone} tone
          </p>
        </div>
      </div>
    </div>
  `;
}