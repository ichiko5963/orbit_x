import { NextRequest, NextResponse } from "next/server";

// Best posting times based on X engagement data (JST)
const BEST_TIMES = [
  { hour: 7, minute: 0, reason: "通勤・通学ピーク、拡散狙い" },
  { hour: 8, minute: 0, reason: "通勤時間帯、エンゲージメント高" },
  { hour: 12, minute: 0, reason: "昼休み、多くのユーザーがアクティブ" },
  { hour: 12, minute: 30, reason: "昼休み後半、リツイート狙い" },
  { hour: 17, minute: 30, reason: "帰宅時間帯開始" },
  { hour: 18, minute: 0, reason: "帰宅ラッシュ、エンゲージメント高" },
  { hour: 19, minute: 0, reason: "夕食後、リラックスタイム" },
  { hour: 20, minute: 0, reason: "ゴールデンタイム、最もアクティブ" },
  { hour: 21, minute: 0, reason: "夜のピーク時間" },
  { hour: 22, minute: 0, reason: "就寝前、長文投稿に適した時間" },
];

// Weekend adjustments
const WEEKEND_TIMES = [
  { hour: 9, minute: 0, reason: "週末の朝、ゆっくり見る人が多い" },
  { hour: 10, minute: 0, reason: "週末のアクティブ時間開始" },
  { hour: 14, minute: 0, reason: "午後のリラックスタイム" },
  { hour: 15, minute: 0, reason: "週末のエンゲージメントピーク" },
  { hour: 20, minute: 0, reason: "週末の夜、アクティブユーザー多い" },
  { hour: 21, minute: 0, reason: "週末のゴールデンタイム" },
];

export async function POST(request: NextRequest) {
  try {
    const { existingSchedules = [] } = await request.json();

    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const times = isWeekend ? WEEKEND_TIMES : BEST_TIMES;

    // Get existing scheduled times for today and tomorrow
    const scheduledTimes = new Set<string>();
    existingSchedules.forEach((schedule: any) => {
      if (schedule.status === "scheduled" && schedule.scheduledAt) {
        const date = new Date(schedule.scheduledAt);
        scheduledTimes.add(`${date.toDateString()}-${date.getHours()}`);
      }
    });

    // Find the next available best time
    let suggestedTime: Date | null = null;
    let reason = "";

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      const dayIsWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
      const dayTimes = dayIsWeekend ? WEEKEND_TIMES : BEST_TIMES;

      for (const time of dayTimes) {
        const candidate = new Date(targetDate);
        candidate.setHours(time.hour, time.minute, 0, 0);

        // Skip if in the past
        if (candidate <= now) continue;

        // Skip if already scheduled at this hour
        const key = `${candidate.toDateString()}-${candidate.getHours()}`;
        if (scheduledTimes.has(key)) continue;

        // Found a good time
        suggestedTime = candidate;
        reason = time.reason;

        // Add info about existing schedules on that day
        const sameDay = existingSchedules.filter((s: any) => {
          const d = new Date(s.scheduledAt);
          return d.toDateString() === candidate.toDateString() && s.status === "scheduled";
        });

        if (sameDay.length > 0) {
          reason += `・この日${sameDay.length}件予約済み`;
        }

        break;
      }

      if (suggestedTime) break;
    }

    // Fallback if no time found
    if (!suggestedTime) {
      suggestedTime = new Date(now);
      suggestedTime.setHours(suggestedTime.getHours() + 1);
      suggestedTime.setMinutes(0);
      reason = "推奨時間が埋まっているため、1時間後を提案";
    }

    return NextResponse.json({
      success: true,
      suggestedTime: suggestedTime.toISOString(),
      reason,
      isWeekend,
    });
  } catch (error) {
    console.error("Suggest time error:", error);

    // Return fallback
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 1);
    fallback.setMinutes(0);

    return NextResponse.json({
      success: true,
      suggestedTime: fallback.toISOString(),
      reason: "デフォルト（1時間後）",
      isWeekend: false,
    });
  }
}
