"use client";

import { useRef } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";

interface ImageUploadGridProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploadGrid({
  images,
  onImagesChange,
  maxImages = 4,
}: ImageUploadGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImagesChange([...images, result]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">
          画像 ({images.length}/{maxImages})
        </label>
        {images.length > 0 && (
          <button
            onClick={() => onImagesChange([])}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            すべて削除
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Existing Images */}
        {images.map((image, index) => (
          <div
            key={index}
            className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 group"
          >
            <Image
              src={image}
              alt={`Upload ${index + 1}`}
              fill
              className="object-cover"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Add Button */}
        {canAddMore && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {images.length === 0 && (
        <p className="text-xs text-zinc-400">
          クリックまたはドラッグ&ドロップで画像を追加
        </p>
      )}
    </div>
  );
}
