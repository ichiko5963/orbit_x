"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to the new unified schedule/calendar page
export default function CalendarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/schedule");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-zinc-400">リダイレクト中...</p>
    </div>
  );
}
