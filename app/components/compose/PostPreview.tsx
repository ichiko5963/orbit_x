"use client";

import Image from "next/image";
import { User, Heart, MessageCircle, Repeat2, Share, BarChart2 } from "lucide-react";

interface PostPreviewProps {
  text: string;
  images?: string[];
  userName?: string;
  userHandle?: string;
  userAvatar?: string;
}

export function PostPreview({
  text,
  images = [],
  userName = "ユーザー名",
  userHandle = "@username",
  userAvatar,
}: PostPreviewProps) {
  if (!text && images.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-400 text-sm">
        投稿内容がここにプレビュー表示されます
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* User Info */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-zinc-900 text-[15px] truncate">{userName}</p>
            <p className="text-zinc-500 text-[15px] truncate">{userHandle}</p>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500 text-[15px]">今</span>
          </div>

          {/* Post Text */}
          <p className="text-[15px] text-zinc-900 whitespace-pre-line leading-relaxed mt-1">
            {text}
          </p>

          {/* Images */}
          {images.length > 0 && (
            <div className={`mt-3 grid gap-0.5 rounded-2xl overflow-hidden border border-zinc-200 ${
              images.length === 1 ? "grid-cols-1" :
              images.length === 2 ? "grid-cols-2" :
              images.length === 3 ? "grid-cols-2" :
              "grid-cols-2"
            }`}>
              {images.slice(0, 4).map((image, index) => (
                <div
                  key={index}
                  className={`relative bg-zinc-100 ${
                    images.length === 1 ? "aspect-video" :
                    images.length === 3 && index === 0 ? "row-span-2 aspect-[3/4]" :
                    "aspect-square"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 max-w-md">
            <button className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              <span className="text-[13px]">0</span>
            </button>
            <button className="flex items-center gap-2 text-zinc-500 hover:text-green-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-green-50">
                <Repeat2 className="w-[18px] h-[18px]" />
              </div>
              <span className="text-[13px]">0</span>
            </button>
            <button className="flex items-center gap-2 text-zinc-500 hover:text-pink-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-pink-50">
                <Heart className="w-[18px] h-[18px]" />
              </div>
              <span className="text-[13px]">0</span>
            </button>
            <button className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <BarChart2 className="w-[18px] h-[18px]" />
              </div>
              <span className="text-[13px]">0</span>
            </button>
            <button className="text-zinc-500 hover:text-blue-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <Share className="w-[18px] h-[18px]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
