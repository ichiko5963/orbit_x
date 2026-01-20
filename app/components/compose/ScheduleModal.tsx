"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Calendar, Clock, User } from "lucide-react";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
  postText: string;
  images?: string[];
  isScheduling?: boolean;
}

export function ScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  postText,
  images = [],
  isScheduling = false,
}: ScheduleModalProps) {
  const now = new Date();
  const [date, setDate] = useState(formatDateForInput(now));
  const [time, setTime] = useState(formatTimeForInput(now));

  function formatDateForInput(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  function formatTimeForInput(d: Date): string {
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const handleSchedule = () => {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(year, month - 1, day, hours, minutes);
    onSchedule(scheduledAt);
  };

  const scheduledDate = new Date(`${date}T${time}`);
  const isValidDate = scheduledDate > now;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">予約投稿</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date & Time Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Calendar className="w-4 h-4" />
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={formatDateForInput(now)}
                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Clock className="w-4 h-4" />
                時間
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Scheduled Time Display */}
          <div className="p-4 bg-emerald-50 rounded-xl">
            <p className="text-sm text-emerald-700">
              投稿予定:{" "}
              <span className="font-semibold">
                {scheduledDate.toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}{" "}
                {scheduledDate.toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          </div>

          {/* Post Preview */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200">
              <p className="text-sm font-medium text-zinc-700">プレビュー</p>
            </div>
            <div className="p-4 space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">ユーザー名</p>
                  <p className="text-xs text-zinc-500">@username</p>
                </div>
              </div>

              {/* Post Text */}
              <p className="text-sm text-zinc-800 whitespace-pre-line leading-relaxed">
                {postText || "投稿テキストがここに表示されます..."}
              </p>

              {/* Images Preview */}
              {images.length > 0 && (
                <div className={`grid gap-2 ${
                  images.length === 1 ? "grid-cols-1" :
                  images.length === 2 ? "grid-cols-2" :
                  images.length === 3 ? "grid-cols-2" :
                  "grid-cols-2"
                }`}>
                  {images.slice(0, 4).map((image, index) => (
                    <div
                      key={index}
                      className={`relative rounded-lg overflow-hidden bg-zinc-100 ${
                        images.length === 1 ? "aspect-video" :
                        images.length === 3 && index === 0 ? "row-span-2 aspect-square" :
                        "aspect-square"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSchedule}
            disabled={!isValidDate || !postText.trim() || isScheduling}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isScheduling ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                予約する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
