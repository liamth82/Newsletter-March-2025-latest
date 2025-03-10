import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

export async function searchTweets(keywords: string[]) {
  try {
    const tweets = await Promise.all(
      keywords.map(async (keyword) => {
        const result = await client.v2.search({
          query: keyword,
          max_results: 10,
          "tweet.fields": ["created_at", "public_metrics", "author_id"],
        });
        return result.data.data;
      })
    );

    // Flatten and deduplicate tweets
    const uniqueTweets = Array.from(
      new Set(tweets.flat().map((t) => JSON.stringify(t)))
    ).map((t) => JSON.parse(t));

    return uniqueTweets;
  } catch (error) {
    console.error('Error fetching tweets:', error);
    throw new Error('Failed to fetch tweets');
  }
}
