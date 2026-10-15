"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface Props {
  value?:    string | null;       // current imageUrl stored in DB
  onChange:  (url: string) => void; // called with the new public URL after upload
  folder?:   "menu-items" | "restaurant-logos" | "covers" | "staff";
  label?:    string;
  hint?:     string;
  className?: string;
  aspectRatio?: "square" | "landscape" | "portrait";
}

export default function ImageUpload({
  value, onChange, folder = "menu-items",
  label = "Upload Image", hint = "JPEG, PNG, WebP · Max 5 MB",
  className = "", aspectRatio = "square",
}: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [progress,setProgress]  = useState(0);

  const aspectClass = {
    square:    "aspect-square",
    landscape: "aspect-video",
    portrait:  "aspect-[3/4]",
  }[aspectRatio];

  async function upload(file: File) {
    setLoading(true);
    setError(null);
    setProgress(0);

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — max 5 MB");
      setLoading(false);
      return;
    }
    if (!["image/jpeg","image/jpg","image/png","image/webp","image/gif"].includes(file.type)) {
      setError("Unsupported type — use JPEG, PNG or WebP");
      setLoading(false);
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      // Direct high-speed upload to server storage (zero-card, 100% reliable)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.publicUrl || res.url) {
                resolve(res.publicUrl || res.url);
              } else {
                reject(new Error(res.error || "Upload failed"));
              }
            } catch {
              reject(new Error("Invalid response from upload server"));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });

      setProgress(100);
      onChange(publicUrl); // save the permanent URL
      URL.revokeObjectURL(localUrl);
      setPreview(null);
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  const displaySrc = preview ?? value ?? null;

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />

      <div
        className={`relative ${aspectClass} w-full rounded-2xl overflow-hidden border-2 cursor-pointer
          transition-all duration-200 group
          ${displaySrc
            ? "border-black/10 hover:border-[#132A1E]/40"
            : "border-dashed border-gray-200 hover:border-[#132A1E]/40 hover:bg-gray-50/50 bg-gray-50"
          }`}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Preview / placeholder */}
        {displaySrc ? (
          <img src={displaySrc} alt="Upload preview" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 p-4">
            <div className="h-10 w-10 rounded-xl bg-gray-200 flex items-center justify-center">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-center leading-relaxed">{hint}</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            {progress > 0 && progress < 100 && (
              <div className="w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            )}
            <p className="text-white text-xs font-medium">
              {progress > 0 ? `${progress}%` : "Preparing…"}
            </p>
          </div>
        )}

        {/* Change / remove overlay on hover */}
        {displaySrc && !loading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200
            flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-md
                hover:bg-gray-100 transition-colors"
              title="Change image">
              <Upload className="h-4 w-4 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); setPreview(null); setError(null); }}
              className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-md
                hover:bg-red-50 transition-colors"
              title="Remove image">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
