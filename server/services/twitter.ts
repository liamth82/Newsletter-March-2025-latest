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
}

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
});

export async function searchTweets(keywords: string[], filters: TweetFilters = {}) {
  try {
    console.log('Searching tweets with keywords and filters:', { keywords, filters });
    if (!keywords || keywords.length === 0) {
      console.log('No keywords provided');
      return [];
    }

    const appClient = await client.appLogin();
    console.log('Successfully authenticated with Twitter');

    // Build query string with filters
    const queryParts = [...keywords];

    // Add news outlet filtering if specified
    if (filters.newsOutlets && filters.newsOutlets.length > 0) {
      const fromQueries = filters.newsOutlets.map(handle => `from:${handle.replace('@', '')}`);
      queryParts.push(`(${fromQueries.join(' OR ')})`);
    }

    if (filters.verifiedOnly) {
      queryParts.push('is:verified');
    }
    if (filters.excludeReplies) {
      queryParts.push('-is:reply');
    }
    if (filters.excludeRetweets) {
      queryParts.push('-is:retweet');
    }
    if (filters.safeMode) {
      queryParts.push('-has:links -has:mentions');
      queryParts.push('lang:en');
    }

    const query = queryParts.join(' ');
    console.log('Final query:', query);

    // Fetch tweets
    const response = await appClient.v2.search(query, {
      max_results: 20,
      expansions: ['author_id'],
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      'user.fields': ['verified', 'public_metrics', 'username'],
    });

    if (!response.data.data) {
      console.log('No tweets found for query');
      return [];
    }

    // Filter tweets based on criteria
    const tweets = response.data.data;
    const users = response.data.includes?.users || [];

    const filteredTweets = tweets.filter(tweet => {
      const author = users.find(u => u.id === tweet.author_id);

      // Skip if we can't find author info
      if (!author) return false;

      // Check minimum followers if specified
      if (filters.minFollowers && author.public_metrics?.followers_count) {
        if (author.public_metrics.followers_count < filters.minFollowers) {
          return false;
        }
      }

      // Additional content filtering in safe mode
      if (filters.safeMode) {
        const lowercaseText = tweet.text.toLowerCase();
        // Basic profanity check (expand this list as needed)
        const profanityList = ['fuck', 'shit', 'damn', 'ass'];
        if (profanityList.some(word => lowercaseText.includes(word))) {
          return false;
        }
      }

      return true;
    });

    // Add author username to tweet objects
    const processedTweets = filteredTweets.map(tweet => {
      const author = users.find(u => u.id === tweet.author_id);
      return {
        ...tweet,
        author_username: author?.username
      };
    });

    // Sort tweets by creation date
    processedTweets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log('Total tweets found:', processedTweets.length);
    return processedTweets;
  } catch (error) {
    console.error('Error details:', error);
    throw new Error('Failed to fetch tweets');
  }
}