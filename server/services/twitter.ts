import { TwitterApi } from 'twitter-api-v2';

console.log('Initializing Twitter client with credentials:', {
  appKey: process.env.TWITTER_API_KEY ? 'present' : 'missing',
  appSecret: process.env.TWITTER_API_SECRET ? 'present' : 'missing',
});

interface TweetFilters {
  verifiedOnly?: boolean;
  minFollowers?: number;
  excludeReplies?: boolean;
  excludeRetweets?: boolean;
  safeMode?: boolean;
  newsOutlets?: string[];
  followerThreshold?: 'low' | 'medium' | 'high';
  accountTypes?: ('news' | 'verified' | 'influencer')[];
  sectorId?: number;
}

if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
  console.error('Missing Twitter API credentials');
  throw new Error('Twitter API credentials are required');
}

// Enhanced Twitter client configuration with better logging
console.log('Initializing Twitter client with credentials:', {
  appKey: process.env.TWITTER_API_KEY ? 'present' : 'missing',
  appSecret: process.env.TWITTER_API_SECRET ? 'present' : 'missing',
  accessToken: process.env.TWITTER_ACCESS_TOKEN ? 'present' : 'missing',
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET ? 'present' : 'missing'
});

// Use both app and user authentication for better access
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// Quality score calculation function - defined outside any blocks for strict mode compatibility
const calculateQualityScore = (tweet: any, author: any): number => {
  let score = 0;
  
  // Engagement metrics
  if (tweet.public_metrics) {
    score += Math.min(tweet.public_metrics.like_count / 10, 30); // Up to 30 points for likes
    score += Math.min(tweet.public_metrics.retweet_count * 2, 20); // Up to 20 points for retweets
    score += Math.min(tweet.public_metrics.quote_count * 3, 15); // Up to 15 points for quotes
  }
  
  // Author credibility
  if (author.verified) {
    score += 20; // Verified accounts get a significant boost
  }
  
  if (author.public_metrics?.followers_count) {
    score += Math.min(Math.log(author.public_metrics.followers_count) * 2, 25); // Up to 25 points based on followers (logarithmic scale)
  }
  
  // Content quality signals
  const tweetText = tweet.text.toLowerCase();
  
  // Prefer tweets with links
  if (tweet.entities?.urls?.length) {
    score += 10;
  }
  
  // Prefer tweets without too many hashtags (often promotional)
  const hashtagCount = (tweet.entities?.hashtags?.length || 0);
  if (hashtagCount <= 2) {
    score += 5;
  } else if (hashtagCount >= 5) {
    score -= 10; // Penalize hashtag stuffing
  }
  
  // Prefer longer, more substantial tweets
  if (tweetText.length > 100) {
    score += 5;
  }
  
  // Penalize common clickbait phrases
  const clickbaitPhrases = ['you won\'t believe', 'shocking', 'mind blown', 'mind-blown', '!!!', 'jaw-dropping'];
  if (clickbaitPhrases.some(phrase => tweetText.includes(phrase))) {
    score -= 15;
  }
  
  // Professional and formal content bonus
  const professionalPhrases = ['analysis', 'report', 'study', 'research', 'data', 'statistics', 'announced', 'published'];
  if (professionalPhrases.some(phrase => tweetText.includes(phrase))) {
    score += 10; 
  }
  
  // News source bonus based on description
  const authorDesc = author.description ? author.description.toLowerCase() : '';
  if (authorDesc) {
    const newsIndicators = ['news', 'journalist', 'reporter', 'editor', 'correspondent', 'analyst', 'official', 'verified'];
    if (newsIndicators.some(indicator => authorDesc.includes(indicator))) {
      score += 15;
    }
  }
  
  return score;
};

export async function searchTweets(keywords: string[], filters: TweetFilters = {}) {
  try {
    console.log('Starting tweet search with:', { keywords, filters, sectorId: filters.sectorId });

    // If a sector is selected, we should use its handles by default
    let sectorHandles: string[] = [];
    if (filters.sectorId) {
      console.log(`Prioritizing sector ID: ${filters.sectorId}`);
      
      // We'll use any handles that were passed from the frontend/database
      if (filters.newsOutlets && filters.newsOutlets.length > 0) {
        sectorHandles = [...filters.newsOutlets];
        console.log(`Using ${sectorHandles.length} handles from sector`);
        
        // Make sure newsOutlets is set properly for downstream processing
        filters.newsOutlets = sectorHandles;
      } else {
        console.warn(`Sector ID ${filters.sectorId} was provided but no handles were found. This should never happen.`);
        
        // Since we have a sectorId but no handles, this is likely a data integrity issue
        // Let's log this as a critical error to help with debugging
        console.error(`CRITICAL: Sector ID ${filters.sectorId} has no associated handles in the filters`);
        
        // Return early to avoid showing incorrect results
        throw new Error(`Sector ID ${filters.sectorId} has no associated handles. Please edit the sector or try again.`);
      }
    }

    // Log the state of both keywords and handles
    console.log('Search state:', {
      hasKeywords: keywords && keywords.length > 0, 
      hasHandles: sectorHandles.length > 0 || (filters.newsOutlets && filters.newsOutlets.length > 0)
    });

    // Check if we have enough search criteria
    if (!keywords || keywords.length === 0) {
      console.log('No keywords provided for search');
      
      // Even with no keywords, we can still search for content from specific handles
      const hasValidHandles = sectorHandles.length > 0 || (filters.newsOutlets && filters.newsOutlets.length > 0);
      
      if (!hasValidHandles) {
        console.log('No keywords and no handles - returning empty results');
        return [];
      } else {
        console.log('No keywords but we have handles - continuing with handle-only search');
        // If we only have handles, we'll do a broader search using an empty string
        // The Twitter API will just return recent tweets from these handles
        keywords = [''];
      }
    }

    // Try different authentication methods
    let appClient;
    try {
      // First try user authentication if we have user tokens
      if (process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_TOKEN_SECRET) {
        // Use the client directly with user authentication
        appClient = client;
        console.log('Using Twitter API with user authentication');
      } else {
        // Fall back to app-only authentication
        appClient = await client.appLogin();
        console.log('Using Twitter API with app-only authentication');
      }
      console.log('Successfully authenticated with Twitter API');
    } catch (error) {
      console.error('Failed to authenticate with Twitter API:', error);
      if (error instanceof Error) {
        throw new Error(`Twitter API authentication failed: ${error.message}`);
      } else {
        throw new Error(`Twitter API authentication failed: Unknown error`);
      }
    }

    // Process and prepare keywords more effectively
    // Split multi-word phrases if enclosed in quotes
    const processedKeywords = keywords.flatMap(keyword => {
      // Check if this is a quoted string with multiple keywords
      const matchQuotes = keyword.match(/^"([^"]+)"$/);
      if (matchQuotes) {
        return matchQuotes[1]; // Return just the content inside the quotes
      }
      
      // If it contains multiple quoted phrases, extract them
      if (keyword.includes('"')) {
        const quotedPhrases = [];
        const regex = /"([^"]+)"/g;
        let match;
        
        while ((match = regex.exec(keyword)) !== null) {
          quotedPhrases.push(match[1]);
        }
        
        if (quotedPhrases.length > 0) {
          return quotedPhrases;
        }
      }
      
      return keyword;
    });
    
    // Build a more effective query string
    // Initialize array for query parts
    const queryParts = [];
    
    // Handle keywords if we have them
    if (keywords.length > 0 && keywords[0] !== '') {
      const keywordQuery = processedKeywords.length > 1 
        ? `(${processedKeywords.join(' OR ')})`
        : processedKeywords[0];
      queryParts.push(keywordQuery);
    }
    
    // Simplify the query structure for handles-only searches
    // Filter by news outlets if provided - this is critical for sector-based searches
    if (filters.newsOutlets?.length) {
      // Clean up handles format - important for Twitter API
      const cleanHandles = filters.newsOutlets.map(handle => 
        handle.replace(/^@/, '').replace(/https?:\/\/(x|twitter)\.com\//, '')
      );
      
      console.log(`Using ${cleanHandles.length} handles for search:`, cleanHandles.slice(0, 5));
      
      // For sector-only searches, we need a simpler query structure
      if (keywords.length === 0 || keywords[0] === '') {
        // If we have no keywords, use a simpler query with just the "from:" operators
        // Use only first 5 handles to avoid query length limits
        const simplifiedHandles = cleanHandles.slice(0, 5);
        const fromQueries = simplifiedHandles.map(handle => `from:${handle}`);
        
        // For handle-only searches, this is the entire query
        queryParts.push(`(${fromQueries.join(' OR ')})`);
        console.log("Using simplified handle-only search with first 5 handles");
      } else {
        // If we have keywords, combine with handles
        const fromQueries = cleanHandles.slice(0, 10).map(handle => `from:${handle}`);
        queryParts.push(`(${fromQueries.join(' OR ')})`);
      }
    }
    
    // Empty query check - must have at least one search term
    if (queryParts.length === 0) {
      throw new Error("Cannot create a valid search query: no keywords or handles provided");
    }
    
    // Quality filters - keep these to a minimum for better results
    queryParts.push('has:links'); // Prefer tweets with links (usually more informative)

    // High quality signals
    if (filters.verifiedOnly) queryParts.push('is:verified');
    if (filters.excludeReplies) queryParts.push('-is:reply');
    if (filters.excludeRetweets) queryParts.push('-is:retweet');
    
    // Make safe mode less restrictive
    queryParts.push('lang:en'); // Always limit to English for now
    
    // Only apply these restrictions if safe mode is on
    if (filters.safeMode !== false) { // Default to safe mode if not explicitly set to false
      queryParts.push('-has:mentions'); // Avoid tweets mentioning others (often conversations)
    }

    // Set appropriate follower threshold based on the setting
    if (filters.followerThreshold) {
      let minFollowerCount;
      switch (filters.followerThreshold) {
        case 'high':
          minFollowerCount = 100000;
          break;
        case 'medium':
          minFollowerCount = 10000;
          break;
        case 'low':
        default:
          minFollowerCount = 1000;
          break;
      }
      // Override minFollowers if followerThreshold is specified
      filters.minFollowers = minFollowerCount;
    }

    const query = queryParts.join(' ');
    console.log('Final Twitter API query:', query);

    // Fetch tweets with an increased max_results for better chances of finding relevant content
    const response = await appClient.v2.search(query, {
      max_results: 100, // Increased to get more quality options
      expansions: ['author_id'],
      'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'context_annotations', 'entities'],
      'user.fields': ['verified', 'public_metrics', 'username', 'description'],
    });

    console.log('Raw Twitter API response:', response);

    if (!response.data?.data) {
      console.log('No tweets found for query');
      return [];
    }

    const tweets = response.data.data;
    const users = response.data.includes?.users || [];

    // Filter tweets
    let filteredTweets = tweets.filter(tweet => {
      const author = users.find(u => u.id === tweet.author_id);
      if (!author) {
        console.log(`No author found for tweet ${tweet.id}`);
        return false;
      }

      // Enforce minimum follower count
      if (filters.minFollowers && author.public_metrics?.followers_count) {
        if (author.public_metrics.followers_count < filters.minFollowers) {
          return false;
        }
      }

      // Content filtering
      if (filters.safeMode !== false) { // Default to true
        const lowercaseText = tweet.text.toLowerCase();
        
        // Filter out profanity and controversial content
        const profanityList = ['fuck', 'shit', 'damn', 'ass', 'crap', 'bitch', 'sex', 'porn'];
        if (profanityList.some(word => lowercaseText.includes(word))) {
          return false;
        }
        
        // Filter out potentially promotional content
        if (/buy|subscribe|offer|deal|discount|limited time|sign up|join now/i.test(lowercaseText)) {
          return false;
        }
        
        // Filter out low value content
        if (/check out my|follow me|subscribe to my|latest video|watch now|click here/i.test(lowercaseText)) {
          return false;
        }
        
        // Avoid tweets that are too short as they often lack context
        if (tweet.text.length < 50 && !tweet.entities?.urls?.length) {
          return false;
        }
      }

      // Additional account type filtering based on accountTypes setting
      if (filters.accountTypes?.length) {
        let isRightType = false;
        
        if (filters.accountTypes.includes('verified') && author.verified) {
          isRightType = true;
        }
        
        // Safe check for news accounts
        if (filters.accountTypes.includes('news') && author.description) {
          const authorDesc = author.description;
          const newsTerms = ['news', 'media', 'journalist', 'editor', 'reporter', 'correspondent'];
          if (newsTerms.some(term => authorDesc.toLowerCase().includes(term))) {
            isRightType = true;
          }
        }
        
        // Safe check for influencer accounts
        if (filters.accountTypes.includes('influencer') && 
            author.public_metrics && 
            typeof author.public_metrics.followers_count === 'number' && 
            author.public_metrics.followers_count > 50000) {
          isRightType = true;
        }
        
        if (!isRightType) {
          return false;
        }
      }

      return true;
    });

    // Assign quality scores to each tweet
    const scoredTweets = filteredTweets.map(tweet => {
      const author = users.find(u => u.id === tweet.author_id)!;
      const qualityScore = calculateQualityScore(tweet, author);
      
      return {
        tweet,
        author,
        qualityScore
      };
    });
    
    // Sort by quality score (high to low)
    scoredTweets.sort((a, b) => b.qualityScore - a.qualityScore);
    
    // Take the top 70% for quality
    const topTweets = scoredTweets.slice(0, Math.max(Math.ceil(scoredTweets.length * 0.7), 10));
    
    // Process tweets
    const processedTweets = topTweets.map(item => {
      const { tweet, author } = item;
      
      // Clean up tweet text
      let cleanText = tweet.text
        .replace(/https:\/\/t\.co\/\w+/g, '') // Remove t.co links
        .replace(/&amp;/g, '&') // Decode HTML entities
        .replace(/RT @[^:]+: /, '') // Remove retweet prefixes
        .trim();
        
      return {
        id: tweet.id,
        text: cleanText,
        author_username: author.username,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: tweet.public_metrics || {
          retweet_count: 0,
          reply_count: 0,
          like_count: 0,
          quote_count: 0
        }
      };
    });

    // Now sort by date (recent first)
    processedTweets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`Found ${processedTweets.length} high-quality tweets out of ${tweets.length} total`);
    return processedTweets;

  } catch (error) {
    console.error('Twitter API error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      // Check for specific API errors
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes('401')) {
        throw new Error('Twitter API authentication failed. Please check API credentials.');
      } else if (error.message.includes('429')) {
        throw new Error('Twitter API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('403')) {
        throw new Error('Twitter API access forbidden. Your credentials may not have the required permissions.');
      }
      
      throw new Error(`Failed to fetch tweets: ${error.message}`);
    }
    
    throw new Error('Failed to fetch tweets: Unknown error');
  }
}