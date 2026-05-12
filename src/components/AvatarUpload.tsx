"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 1_024 * 1_024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  username: string;
  previewUrl: string | null;
  hasCurrentAvatar: boolean;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}

export default function AvatarUpload({
  username,
  previewUrl,
  hasCurrentAvatar,
  onSelectFile,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!ALLOWED.includes(file.type)) {
      setErr("JPEG, PNG ou WebP uniquement");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Image trop grosse (1 Mo max)");
      return;
    }

    setErr(null);
    onSelectFile(file);
  };

  const letter = username.trim().slice(0, 2).toUpperCase() || "?";
  const canRemove = previewUrl !== null && hasCurrentAvatar;

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={onPick}
        aria-label="Changer la photo"
        title="Changer la photo"
        className="w-[140px] h-[140px] rounded-md overflow-hidden border border-red bg-bg shrink-0 relative cursor-pointer group/avatar hover:border-ink transition-colors"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-bg"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.02) 2px 3px)",
            }}
          >
            <span
              className="text-ink-3 leading-none font-bold tracking-[-0.04em] select-none"
              style={{ fontSize: "clamp(40px, 6vw, 56px)" }}
            >
              {letter}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink">
            {previewUrl ? "Changer" : "Choisir"}
          </span>
        </div>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPick}
          className="text-[10px] font-mono tracking-[0.16em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
        >
          {previewUrl ? "Changer la photo" : "Ajouter une photo"}
        </button>
        {canRemove && (
          <>
            <span className="text-ink-4">·</span>
            <button
              type="button"
              onClick={onRemove}
              className="text-[10px] font-mono tracking-[0.16em] uppercase text-ink-4 hover:text-red transition-colors cursor-pointer"
            >
              Retirer
            </button>
          </>
        )}
      </div>
      {err && (
        <div className="font-mono text-[10px] tracking-[0.04em] text-red">★ {err}</div>
      )}
    </div>
  );
}
