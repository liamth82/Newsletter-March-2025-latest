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
      queryParts.push('-has:links'); // Exclude tweets with links as they might be spam
      queryParts.push('lang:en'); // Only English tweets for better content filtering
    }

    const tweets = await Promise.all(
      queryParts.map(async (keyword) => {
        console.log(`Fetching tweets for keyword: ${keyword}`);
        try {
          const response = await appClient.v2.search(keyword, {
            max_results: 10,
            expansions: ['author_id', 'referenced_tweets'],
            'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
            'user.fields': ['verified', 'public_metrics'],
          });

          console.log(`Raw response structure for ${keyword}:`, {
            data: response.data,
            includes: response.includes,
            meta: response.meta
          });

          // Filter tweets based on criteria
          const tweets = response.data.data || [];
          const users = response.data.includes?.users || [];

          const filteredTweets = tweets.filter(tweet => {
            const author = users.find(u => u.id === tweet.author_id);

            // Skip if we can't find author info
            if (!author) return false;

            // Check minimum followers if specified
            if (filters.minFollowers && author.public_metrics?.followers_count < filters.minFollowers) {
              return false;
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

          console.log('Filtered tweets:', filteredTweets);
          return filteredTweets;
        } catch (error) {
          console.error(`Error searching for keyword "${keyword}":`, error);
          return [];
        }
      })
    );

    // Flatten and deduplicate tweets
    const uniqueTweets = Array.from(
      new Set(tweets.flat().map((t) => JSON.stringify(t)))
    ).map((t) => JSON.parse(t));

    console.log('Total unique tweets found:', uniqueTweets.length);
    return uniqueTweets;
  } catch (error) {
    console.error('Error details:', error);
    throw new Error('Failed to fetch tweets');
  }
}