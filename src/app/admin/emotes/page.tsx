"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { invalidateEmotesCache, type Emote } from "@/lib/use-emotes";

const SLUG_REGEX = /^[a-z0-9-]{2,32}$/;
const MAX_BYTES = 1024 * 1024;
const ACCEPTED_MIMES = new Set(["image/png", "image/webp", "image/gif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface EmoteRow {
  slug: string;
  label: string | null;
  image_url: string;
  image_path: string;
  uploader_id: string | null;
  created_at: string;
}

interface UploaderProfile {
  user_id: string;
  username: string;
}

function rowToEmote(r: EmoteRow): Emote {
  return {
    slug: r.slug,
    label: r.label ?? "",
    imageUrl: r.image_url,
    imagePath: r.image_path,
    uploaderId: r.uploader_id,
    createdAt: r.created_at,
  };
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

function EmotesAdminContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isSoutien = profile?.role === "soutien";
  const canUse = !!user && (isAdmin || isSoutien);

  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [uploaderNames, setUploaderNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canUse) return;
    let cancelled = false;
    const load = async () => {
      if (reloadTick === 0) setLoading(true);
      try {
        const { data } = await supabase
          .from("emotes")
          .select("slug,label,image_url,image_path,uploader_id,created_at")
          .order("created_at", { ascending: false });
        if (cancelled) return;
        const rows = (data ?? []) as EmoteRow[];
        setEmotes(rows.map(rowToEmote));

        const ids = Array.from(
          new Set(rows.map((r) => r.uploader_id).filter((x): x is string => !!x))
        );
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id,username")
            .in("user_id", ids);
          if (cancelled) return;
          const map = new Map<string, string>();
          for (const p of (profs ?? []) as UploaderProfile[]) {
            map.set(p.user_id, p.username);
          }
          setUploaderNames(map);
        }
      } catch (e) {
        console.error("[admin/emotes] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [canUse, reloadTick]);

  useEffect(() => {
    if (!canUse) return;
    const channel = supabase
      .channel("admin-emotes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emotes" },
        () => setReloadTick((t) => t + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canUse]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const resetForm = () => {
    setFile(null);
    setSlug("");
    setLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onPickFile(e.dataTransfer.files[0] ?? null);
  };

  const onPickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_MIMES.has(f.type)) {
      setFeedback({ kind: "err", text: "Format non supporté (png, webp, gif)" });
      return;
    }
    if (f.size > MAX_BYTES) {
      setFeedback({ kind: "err", text: `Trop lourd (${formatBytes(f.size)} > 1 Mo)` });
      return;
    }
    setFile(f);
  };

  const existingSlugs = useMemo(() => new Set(emotes.map((e) => e.slug)), [emotes]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    const cleanSlug = slug.trim().toLowerCase();
    if (!SLUG_REGEX.test(cleanSlug)) {
      setFeedback({ kind: "err", text: "Slug invalide (2-32 caractères, a-z 0-9 -)" });
      return;
    }
    if (existingSlugs.has(cleanSlug)) {
      setFeedback({ kind: "err", text: "Slug déjà pris" });
      return;
    }
    const ext = EXT_BY_MIME[file.type];
    if (!ext) {
      setFeedback({ kind: "err", text: "Format non supporté" });
      return;
    }

    setSubmitting(true);
    try {
      const path = `${user.id}/${cleanSlug}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("emotes")
        .upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
      if (upErr) {
        setFeedback({ kind: "err", text: upErr.message });
        return;
      }

      const { data: pub } = supabase.storage.from("emotes").getPublicUrl(path);
      const imageUrl = pub.publicUrl;

      const { error: insErr } = await supabase.from("emotes").insert({
        slug: cleanSlug,
        label: label.trim(),
        image_url: imageUrl,
        image_path: path,
        uploader_id: user.id,
      });

      if (insErr) {
        await supabase.storage.from("emotes").remove([path]);
        setFeedback({ kind: "err", text: insErr.message });
        return;
      }

      const newEmote: Emote = {
        slug: cleanSlug,
        label: label.trim(),
        imageUrl,
        imagePath: path,
        uploaderId: user.id,
        createdAt: new Date().toISOString(),
      };
      setEmotes((prev) => [newEmote, ...prev]);
      invalidateEmotesCache();
      resetForm();
      setFeedback({ kind: "ok", text: `Emote :${cleanSlug}: ajoutée` });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEmote = async (em: Emote) => {
    if (!user) return;
    if (!confirm(`Supprimer :${em.slug}: ?`)) return;
    const { error: delErr } = await supabase
      .from("emotes")
      .delete()
      .eq("slug", em.slug);
    if (delErr) {
      setFeedback({ kind: "err", text: delErr.message });
      return;
    }
    await supabase.storage.from("emotes").remove([em.imagePath]);
    setEmotes((prev) => prev.filter((e) => e.slug !== em.slug));
    invalidateEmotesCache();
    setFeedback({ kind: "ok", text: `Emote :${em.slug}: supprimée` });
  };

  const copyShortcode = async (s: string) => {
    try {
      await navigator.clipboard.writeText(`:${s}:`);
      setFeedback({ kind: "ok", text: `:${s}: copié` });
    } catch {
      setFeedback({ kind: "err", text: "Impossible de copier" });
    }
  };

  if (authLoading) {
    return <div className="px-10 py-20 font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">Chargement…</div>;
  }

  if (!canUse) {
    return (
      <div className="px-10 py-32 flex flex-col items-center gap-6 text-center">
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">★ Accès refusé</div>
        <h1 className="font-bold leading-[0.95] tracking-[-0.04em] text-balance" style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
          Réservé aux admins et soutiens
        </h1>
        <Link href="/" className="inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors">
          RETOUR <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="px-10 py-8 border-b border-line max-md:px-5 max-md:py-6">
        <h1 className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase text-ink mb-1">Emotes</h1>
        <p className="text-[13px] text-ink-3">
          Shortcode <span className="font-mono text-red">:slug:</span> dans le chat. PNG, WebP, GIF animé · 1 Mo max.
        </p>
      </header>

      <section className="px-10 py-8 border-b border-line max-md:px-5">
        <h2 className="font-mono font-semibold text-[11px] tracking-[0.16em] uppercase text-ink-3 mb-5 text-balance">
          Ajouter une emote
        </h2>

        <form onSubmit={submit} className="grid grid-cols-[112px_1fr_auto] gap-5 items-start max-md:grid-cols-1">
          <label
            htmlFor="emote-file"
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDragEnd={() => setDragging(false)}
            className={`aspect-square border transition-colors cursor-pointer flex items-center justify-center bg-bg overflow-hidden ${dragging ? "border-ink" : "border-line-2 hover:border-ink"}`}
            title="cliquer ou glisser un fichier"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="max-h-full max-w-full" />
            ) : (
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 text-center px-2 leading-[1.4]">
                {dragging ? "déposer" : "cliquer ou glisser"}
              </span>
            )}
            <input
              id="emote-file"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/webp,image/gif"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-col gap-1">
              <label htmlFor="emote-slug" className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
                Slug
              </label>
              <div className="flex items-center border border-line-2 focus-within:border-ink transition-colors">
                <span className="px-2 font-mono text-[12px] text-ink-3 select-none">:</span>
                <input
                  id="emote-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="popcorn"
                  maxLength={32}
                  className="flex-1 bg-transparent py-2 text-[13px] font-mono text-ink placeholder:text-ink-3 outline-none"
                />
                <span className="px-2 font-mono text-[12px] text-ink-3 select-none">:</span>
              </div>
              <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
                a-z, 0-9 et tirets · 2 à 32 caractères
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="emote-label" className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
                Label (optionnel)
              </label>
              <input
                id="emote-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Description courte"
                maxLength={60}
                className="bg-transparent border border-line-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors"
              />
            </div>
            {file && (
              <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
                {file.name} · {formatBytes(file.size)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 items-stretch shrink-0">
            <button
              type="submit"
              disabled={submitting || !file || !slug.trim()}
              className="px-4 py-2.5 border border-ink bg-transparent text-ink font-semibold text-[12px] disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors hover:border-red hover:text-red"
            >
              {submitting ? "Envoi…" : "Uploader"}
            </button>
            {(file || slug || label) && (
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-4 py-2 border border-line-2 text-ink-3 text-[11px] font-mono uppercase tracking-[0.08em] hover:text-ink hover:border-ink cursor-pointer transition-colors disabled:opacity-30"
              >
                Annuler
              </button>
            )}
          </div>
        </form>

        {feedback && (
          <div
            className={`mt-4 font-mono text-[11px] tracking-[0.04em] ${feedback.kind === "ok" ? "text-ink" : "text-red"}`}
          >
            {feedback.kind === "ok" ? "★" : "✕"} {feedback.text}
          </div>
        )}
      </section>

      <main className="px-10 py-8 max-md:px-5">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-mono font-semibold text-[11px] tracking-[0.16em] uppercase text-ink-3 text-balance">
            Catalogue
          </h2>
          <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
            {loading ? "…" : `${emotes.length} emote${emotes.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">
            Chargement…
          </div>
        ) : emotes.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">
            ★ Aucune emote pour l&apos;instant
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {emotes.map((em) => {
              const ownerName = em.uploaderId ? uploaderNames.get(em.uploaderId) : null;
              const canDelete = isAdmin || em.uploaderId === user?.id;
              return (
                <li
                  key={em.slug}
                  className="border border-line p-4 flex flex-col gap-3 bg-bg"
                >
                  <div className="aspect-square border border-line-2 flex items-center justify-center bg-bg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={em.imageUrl}
                      alt={em.label || `:${em.slug}:`}
                      className="max-h-[80%] max-w-[80%]"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => copyShortcode(em.slug)}
                      title="copier le shortcode"
                      className="font-mono text-[12px] text-ink hover:text-red transition-colors cursor-pointer truncate text-left"
                    >
                      :{em.slug}:
                    </button>
                    {em.label && (
                      <span className="text-[12px] text-ink-2 truncate">{em.label}</span>
                    )}
                    <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
                      {ownerName ? (
                        <Link
                          href={`/u/${encodeURIComponent(ownerName)}`}
                          className="hover:text-red transition-colors"
                        >
                          @{ownerName}
                        </Link>
                      ) : (
                        "–"
                      )}
                    </span>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteEmote(em)}
                      className="border border-line-2 text-ink-3 text-[10px] font-mono uppercase tracking-[0.08em] py-1.5 hover:text-red hover:border-red cursor-pointer transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

    </>
  );
}

export default function EmotesAdminPage() {
  return <EmotesAdminContent />;
}
