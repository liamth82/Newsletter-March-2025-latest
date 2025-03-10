import { TwitterApi } from 'twitter-api-v2';

console.log('Initializing Twitter client with credentials:', {
  appKey: process.env.TWITTER_API_KEY ? 'present' : 'missing',
  appSecret: process.env.TWITTER_API_SECRET ? 'present' : 'missing',
});

// Initialize the client with application-only auth
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
});

export async function searchTweets(keywords: string[]) {
  try {
    console.log('Searching tweets for keywords:', keywords);
    // Ensure we have valid keywords
    if (!keywords || keywords.length === 0) {
      console.log('No keywords provided');
      return [];
    }

    // Get bearer token for app-only auth
    const appClient = await client.appLogin();
    console.log('Successfully authenticated with Twitter');

    const tweets = await Promise.all(
      keywords.map(async (keyword) => {
        console.log(`Fetching tweets for keyword: ${keyword}`);
        try {
          const result = await appClient.v2.search(keyword, {
            max_results: 10,
            expansions: ['author_id'],
            'tweet.fields': ['created_at', 'public_metrics'],
          });
          console.log(`Found ${result.data.length || 0} tweets for ${keyword}`);
          return result.data || [];
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