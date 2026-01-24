"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Plus, X, Search, Loader2, Check, ImageIcon } from "lucide-react";

interface ImageSearchResult {
  url: string;
  title: string;
  source: string;
  selected?: boolean;
}

interface ImageUploadGridProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  postContent?: string; // For AI image search
}

export function ImageUploadGrid({
  images,
  onImagesChange,
  maxImages = 4,
  postContent = "",
}: ImageUploadGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // Image search state
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFiles = useCallback((files: File[]) => {
    const remainingSlots = maxImages - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImagesChange([...images, result]);
      };
      reader.readAsDataURL(file);
    });
  }, [images, maxImages, onImagesChange]);

  // Handle paste event (exposed for parent to use)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  }, [processFiles]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  // AI Image Search
  const handleImageSearch = async () => {
    if (!postContent.trim()) {
      setSearchError("投稿内容を入力してください");
      return;
    }

    setShowImageSearch(true);
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch("/api/search-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "画像検索に失敗しました");
      }

      setSearchResults(data.images || []);
    } catch (error) {
      console.error("Image search failed:", error);
      setSearchError(error instanceof Error ? error.message : "画像検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (index: number) => {
    setSearchResults(prev => prev.map((img, i) =>
      i === index ? { ...img, selected: !img.selected } : img
    ));
  };

  // Add selected images
  const addSelectedImages = async () => {
    const selectedImages = searchResults.filter(img => img.selected);
    const remainingSlots = maxImages - images.length;
    const imagesToAdd = selectedImages.slice(0, remainingSlots);

    // Convert URLs to base64 (to avoid CORS issues when posting)
    for (const img of imagesToAdd) {
      try {
        const response = await fetch("/api/proxy-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: img.url }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.base64) {
            onImagesChange([...images, data.base64]);
          }
        }
      } catch (error) {
        console.error("Failed to load image:", img.url, error);
      }
    }

    setShowImageSearch(false);
    setSearchResults([]);
  };

  const canAddMore = images.length < maxImages;
  const selectedCount = searchResults.filter(img => img.selected).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">
          画像 ({images.length}/{maxImages})
        </label>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <button
              onClick={() => onImagesChange([])}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              すべて削除
            </button>
          )}
          {canAddMore && (
            <button
              onClick={handleImageSearch}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Search className="w-3 h-3" />
              画像を検索
            </button>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <div className="flex gap-2 flex-wrap p-2">
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

          {/* Add Button / Drop Zone */}
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
                className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-100 text-emerald-600"
                    : "border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400"
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs mt-1">追加</span>
              </button>
            </>
          )}
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-emerald-50/80 flex items-center justify-center rounded-xl pointer-events-none">
            <div className="text-center">
              <ImageIcon className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
              <p className="text-sm font-medium text-emerald-600">ドロップして追加</p>
            </div>
          </div>
        )}
      </div>

      {images.length === 0 && !isDragging && (
        <p className="text-xs text-zinc-400">
          クリック、ドラッグ&ドロップ、またはテキストエリアにペーストで画像を追加
        </p>
      )}

      {/* Image Search Modal */}
      {showImageSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowImageSearch(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-blue-50 to-sky-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">投稿に使う画像を検索</h2>
                  <p className="text-sm text-zinc-500">AIが投稿内容に合う画像を提案します</p>
                </div>
              </div>
              <button
                onClick={() => setShowImageSearch(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-zinc-600 font-medium">関連画像を検索中...</p>
                  <p className="text-sm text-zinc-400 mt-1">公式ロゴや関連画像を探しています</p>
                </div>
              ) : searchError ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{searchError}</p>
                  <button
                    onClick={handleImageSearch}
                    className="text-blue-600 hover:underline"
                  >
                    再試行
                  </button>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {searchResults.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => toggleImageSelection(index)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          img.selected
                            ? "border-blue-500 ring-2 ring-blue-500/30"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder-image.png";
                          }}
                        />
                        {img.selected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-xs text-white truncate">{img.title}</p>
                          <p className="text-xs text-white/70 truncate">{img.source}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Selection info and add button */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200">
                    <p className="text-sm text-zinc-500">
                      {selectedCount > 0
                        ? `${selectedCount}枚選択中 (最大${maxImages - images.length}枚追加可能)`
                        : "画像をクリックして選択"}
                    </p>
                    <button
                      onClick={addSelectedImages}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      選択した画像を追加
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                  <p>画像が見つかりませんでした</p>
                  <button
                    onClick={handleImageSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    再検索
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export paste handler for use in parent components
export function useImagePaste(
  images: string[],
  onImagesChange: (images: string[]) => void,
  maxImages: number = 4
) {
  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = 'clipboardData' in e ? e.clipboardData : (e as ClipboardEvent).clipboardData;
    const items = clipboardData?.items;
    if (!items) return false;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      const remainingSlots = maxImages - images.length;
      const filesToProcess = imageFiles.slice(0, remainingSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          onImagesChange([...images, result]);
        };
        reader.readAsDataURL(file);
      });

      return true; // Indicate paste was handled
    }

    return false;
  }, [images, maxImages, onImagesChange]);

  return handlePaste;
}
