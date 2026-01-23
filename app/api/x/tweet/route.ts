import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/x/tweet?id=TWEET_ID
 * Fetch tweet details using Twitter's syndication API (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tweetId = searchParams.get("id");

    if (!tweetId) {
      return NextResponse.json(
        { error: "Tweet ID is required" },
        { status: 400 }
      );
    }

    // Use Twitter's syndication API (used by embed widgets, no auth required)
    const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=ja&token=a`;

    const response = await fetch(syndicationUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      // Try alternative endpoint
      const altUrl = `https://api.vxtwitter.com/Twitter/status/${tweetId}`;
      const altResponse = await fetch(altUrl);

      if (altResponse.ok) {
        const altData = await altResponse.json();
        return NextResponse.json({
          success: true,
          tweet: {
            id: tweetId,
            text: altData.text || "",
            author: {
              name: altData.user_name || "Unknown",
              username: altData.user_screen_name || "unknown",
              profileImageUrl: altData.user_profile_image_url || "",
            },
            media: altData.media_extended?.map((m: any) => ({
              type: m.type === "video" || m.type === "gif" ? "video" : "photo",
              url: m.url,
              thumbnailUrl: m.thumbnail_url,
            })) || [],
            createdAt: altData.date || new Date().toISOString(),
            likes: altData.likes || 0,
            retweets: altData.retweets || 0,
            replies: altData.replies || 0,
          },
        });
      }

      return NextResponse.json(
        { error: "ツイートが見つかりませんでした" },
        { status: 404 }
      );
    }

    const data = await response.json();

    // Parse the syndication response
    const tweet = {
      id: tweetId,
      text: data.text || "",
      author: {
        name: data.user?.name || "Unknown",
        username: data.user?.screen_name || "unknown",
        profileImageUrl: data.user?.profile_image_url_https?.replace("_normal", "_400x400") || "",
      },
      media: [] as Array<{
        type: "photo" | "video";
        url: string;
        thumbnailUrl?: string;
      }>,
      createdAt: data.created_at || new Date().toISOString(),
      likes: data.favorite_count || 0,
      retweets: data.retweet_count || 0,
      replies: data.reply_count || 0,
    };

    // Extract media
    if (data.mediaDetails) {
      tweet.media = data.mediaDetails.map((m: any) => ({
        type: m.type === "video" || m.type === "animated_gif" ? "video" : "photo",
        url: m.type === "video" || m.type === "animated_gif"
          ? m.video_info?.variants?.find((v: any) => v.content_type === "video/mp4")?.url || m.media_url_https
          : m.media_url_https,
        thumbnailUrl: m.media_url_https,
      }));
    } else if (data.photos) {
      tweet.media = data.photos.map((p: any) => ({
        type: "photo" as const,
        url: p.url,
        thumbnailUrl: p.url,
      }));
    } else if (data.video) {
      tweet.media = [{
        type: "video" as const,
        url: data.video.variants?.find((v: any) => v.type === "video/mp4")?.src || "",
        thumbnailUrl: data.video.poster,
      }];
    }

    return NextResponse.json({
      success: true,
      tweet,
    });
  } catch (error) {
    console.error("Tweet fetch error:", error);
    return NextResponse.json(
      { error: "ツイートの取得に失敗しました" },
      { status: 500 }
    );
  }
}
