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

if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
  console.error('Missing Twitter API credentials');
  throw new Error('Twitter API credentials are required');
}

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
});

export async function searchTweets(keywords: string[], filters: TweetFilters = {}) {
  try {
    console.log('Starting tweet search with:', { keywords, filters });

    if (!keywords || keywords.length === 0) {
      console.log('No keywords provided for search');
      return [];
    }

    const appClient = await client.appLogin();
    console.log('Successfully authenticated with Twitter API');

    // Build query string
    const queryParts = [...keywords];

    if (filters.newsOutlets?.length) {
      const fromQueries = filters.newsOutlets.map(handle => 
        `from:${handle.replace(/^@/, '').replace(/https?:\/\/(x|twitter)\.com\//, '')}`
      );
      queryParts.push(`(${fromQueries.join(' OR ')})`);
    }

    if (filters.verifiedOnly) queryParts.push('is:verified');
    if (filters.excludeReplies) queryParts.push('-is:reply');
    if (filters.excludeRetweets) queryParts.push('-is:retweet');
    if (filters.safeMode) {
      queryParts.push('-has:links -has:mentions');
      queryParts.push('lang:en');
    }

    const query = queryParts.join(' ');
    console.log('Final Twitter API query:', query);

    // Fetch tweets
    const response = await appClient.v2.search(query, {
      max_results: 20,
      expansions: ['author_id'],
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      'user.fields': ['verified', 'public_metrics', 'username'],
    });

    console.log('Raw Twitter API response:', response);

    if (!response.data?.data) {
      console.log('No tweets found for query');
      return [];
    }

    const tweets = response.data.data;
    const users = response.data.includes?.users || [];

    // Filter tweets
    const filteredTweets = tweets.filter(tweet => {
      const author = users.find(u => u.id === tweet.author_id);
      if (!author) {
        console.log(`No author found for tweet ${tweet.id}`);
        return false;
      }

      if (filters.minFollowers && author.public_metrics?.followers_count) {
        if (author.public_metrics.followers_count < filters.minFollowers) {
          return false;
        }
      }

      if (filters.safeMode) {
        const lowercaseText = tweet.text.toLowerCase();
        const profanityList = ['fuck', 'shit', 'damn', 'ass'];
        if (profanityList.some(word => lowercaseText.includes(word))) {
          return false;
        }
      }

      return true;
    });

    // Process tweets
    const processedTweets = filteredTweets.map(tweet => {
      const author = users.find(u => u.id === tweet.author_id);
      return {
        id: tweet.id,
        text: tweet.text,
        author_username: author?.username,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: tweet.public_metrics || {
          retweet_count: 0,
          reply_count: 0,
          like_count: 0,
          quote_count: 0
        }
      };
    });

    // Sort by date
    processedTweets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`Found ${processedTweets.length} processed tweets`);
    return processedTweets;

  } catch (error) {
    console.error('Twitter API error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch tweets: ${error.message}`);
    }
    throw new Error('Failed to fetch tweets: Unknown error');
  }
}