"use client";

import { useRef, useState } from "react";
import { useAuth, UserProfile } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const MAX_BYTES = 1_024 * 1_024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  profile: UserProfile;
}

export default function AvatarUpload({ profile }: Props) {
  const { updateProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${profile.userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) {
        setErr(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const cacheBusted = `${pub.publicUrl}?t=${Date.now()}`;
      const upderr = await updateProfile({ avatarUrl: cacheBusted });
      if (upderr) setErr(upderr);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUploading(false);
    }
  };

  const onRemove = async () => {
    if (!profile.avatarUrl || uploading) return;
    setUploading(true);
    setErr(null);
    try {
      const url = new URL(profile.avatarUrl);
      const segments = url.pathname.split("/");
      const idx = segments.findIndex((s) => s === "avatars");
      const path = idx >= 0 ? segments.slice(idx + 1).join("/") : null;
      if (path) await supabase.storage.from("avatars").remove([path]);
      const upderr = await updateProfile({ avatarUrl: null });
      if (upderr) setErr(upderr);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFile}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="text-[10px] font-mono tracking-[0.16em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? "Upload…" : profile.avatarUrl ? "Changer la photo" : "Ajouter une photo"}
        </button>
        {profile.avatarUrl && !uploading && (
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
