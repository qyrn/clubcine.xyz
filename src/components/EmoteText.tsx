"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import type { Emote } from "@/lib/use-emotes";
import { safeImageUrl } from "@/lib/safe-url";

const TOKEN_REGEX = /:([a-z0-9-]{2,32}):|@([A-Za-z0-9_]{2,20})/g;

interface EmoteTextProps {
  text: string;
  emotes: Map<string, Emote>;
  size?: number;
  className?: string;
  highlightSelf?: string;
}

type Token =
  | { type: "text"; value: string }
  | { type: "emote"; emote: Emote }
  | { type: "mention"; username: string };

function tokenize(text: string, emotes: Map<string, Emote>): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  TOKEN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_REGEX.exec(text)) !== null) {
    const emoteSlug = m[1];
    const mentionName = m[2];
    if (emoteSlug !== undefined) {
      const emote = emotes.get(emoteSlug);
      if (!emote) continue;
      if (m.index > last) {
        tokens.push({ type: "text", value: text.slice(last, m.index) });
      }
      tokens.push({ type: "emote", emote });
      last = m.index + m[0].length;
    } else if (mentionName !== undefined) {
      if (m.index > last) {
        tokens.push({ type: "text", value: text.slice(last, m.index) });
      }
      tokens.push({ type: "mention", username: mentionName });
      last = m.index + m[0].length;
    }
  }
  if (last < text.length) {
    tokens.push({ type: "text", value: text.slice(last) });
  }
  return tokens;
}

export default function EmoteText({
  text,
  emotes,
  size = 20,
  className,
  highlightSelf,
}: EmoteTextProps) {
  const tokens = useMemo(() => tokenize(text, emotes), [text, emotes]);

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        if (tok.type === "text") return <Fragment key={i}>{tok.value}</Fragment>;
        if (tok.type === "mention") {
          const isSelf =
            !!highlightSelf && tok.username.toLowerCase() === highlightSelf;
          return (
            <Link
              key={i}
              href={`/u/${encodeURIComponent(tok.username)}`}
              prefetch={false}
              className={`text-red hover:underline ${
                isSelf ? "font-bold" : "font-medium"
              }`}
            >
              @{tok.username}
            </Link>
          );
        }
        const { slug, imageUrl, label } = tok.emote;
        const safeSrc = safeImageUrl(imageUrl);
        if (!safeSrc) return <Fragment key={i}>{`:${slug}:`}</Fragment>;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={safeSrc}
            alt={`:${slug}:`}
            title={label ? `:${slug}: · ${label}` : `:${slug}:`}
            loading="lazy"
            draggable={false}
            className="inline-block align-middle"
            style={{ height: size, width: "auto" }}
          />
        );
      })}
    </span>
  );
}
