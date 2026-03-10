/**
 * Discord Webhook Integration
 * Sends formatted messages to Discord channels
 */

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  image?: { url: string };
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Send a message to Discord via webhook
 */
export async function sendDiscordMessage(
  webhookUrl: string,
  message: DiscordMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Discord] Webhook error:", response.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Discord] Send error:", error);
    return false;
  }
}

/**
 * Send a new tweet notification to Discord
 */
export async function sendTweetNotification(params: {
  webhookUrl: string;
  authorName: string;
  authorUsername: string;
  authorProfileImage?: string;
  originalText: string;
  translatedText: string;
  suggestedPost: string;
  tweetUrl: string;
  likes: number;
  retweets: number;
  hasVideo: boolean;
  hasImage: boolean;
  imageUrls?: string[];
  videoUrl?: string;
}): Promise<boolean> {
  const {
    webhookUrl,
    authorName,
    authorUsername,
    authorProfileImage,
    originalText,
    translatedText,
    suggestedPost,
    tweetUrl,
    likes,
    retweets,
    hasVideo,
    hasImage,
    imageUrls,
    videoUrl,
  } = params;

  const mediaLabel = hasVideo ? "[Video]" : hasImage ? "[Image]" : "";

  const embeds: DiscordEmbed[] = [
    {
      title: `@${authorUsername} ${mediaLabel}`,
      url: tweetUrl,
      color: 0x1da1f2, // Twitter blue
      description: originalText.slice(0, 500),
      thumbnail: authorProfileImage ? { url: authorProfileImage } : undefined,
      fields: [
        {
          name: "Likes / Retweets",
          value: `${likes.toLocaleString()} / ${retweets.toLocaleString()}`,
          inline: true,
        },
      ],
      footer: { text: authorName },
      timestamp: new Date().toISOString(),
    },
    {
      title: "Japanese Translation",
      description: translatedText.slice(0, 1000),
      color: 0x00b894,
    },
    {
      title: "Suggested Post (ready to post)",
      description: suggestedPost.slice(0, 1000),
      color: 0xe17055,
      fields: hasVideo && videoUrl
        ? [{ name: "Video URL (first line)", value: videoUrl }]
        : [],
    },
  ];

  // Add first image if available
  if (imageUrls && imageUrls.length > 0) {
    embeds[0].image = { url: imageUrls[0] };
  }

  return sendDiscordMessage(webhookUrl, {
    content: `**New post from @${authorUsername}**`,
    embeds,
    username: "Daily X Monitor",
  });
}

/**
 * Send a batch of trending posts to Discord
 */
export async function sendTrendingDigest(params: {
  webhookUrl: string;
  keyword: string;
  posts: Array<{
    authorUsername: string;
    text: string;
    likes: number;
    url: string;
    suggestedPost: string;
  }>;
}): Promise<boolean> {
  const { webhookUrl, keyword, posts } = params;

  if (posts.length === 0) return true;

  // Send header
  await sendDiscordMessage(webhookUrl, {
    content: `## Trending: "${keyword}" (${posts.length} posts with 500+ likes in 24h)`,
    username: "Daily X Trending",
  });

  // Send each post (max 10 embeds per message)
  for (let i = 0; i < posts.length; i += 5) {
    const batch = posts.slice(i, i + 5);
    const embeds: DiscordEmbed[] = batch.map((post) => ({
      title: `@${post.authorUsername} (${post.likes.toLocaleString()} likes)`,
      url: post.url,
      description: post.text.slice(0, 300),
      color: 0xfdcb6e,
      fields: [
        {
          name: "Suggested Post",
          value: post.suggestedPost.slice(0, 500),
        },
      ],
    }));

    await sendDiscordMessage(webhookUrl, { embeds, username: "Daily X Trending" });
    await new Promise((r) => setTimeout(r, 500));
  }

  return true;
}
