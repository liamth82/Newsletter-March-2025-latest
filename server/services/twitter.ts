import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

export async function searchTweets(keywords: string[]) {
  try {
    console.log('Searching tweets for keywords:', keywords);
    // Ensure we have valid keywords
    if (!keywords || keywords.length === 0) {
      console.log('No keywords provided');
      return [];
    }

    const tweets = await Promise.all(
      keywords.map(async (keyword) => {
        console.log(`Fetching tweets for keyword: ${keyword}`);
        try {
          const result = await client.v2.search({
            query: keyword,
            max_results: 10,
            "tweet.fields": ["created_at", "public_metrics", "author_id"],
          });
          console.log(`Found ${result.data.data?.length || 0} tweets for ${keyword}`);
          return result.data.data || [];
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