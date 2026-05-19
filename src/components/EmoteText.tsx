"use client";

import { Fragment, useMemo } from "react";
import type { Emote } from "@/lib/use-emotes";
import { safeImageUrl } from "@/lib/safe-url";

const EMOTE_REGEX = /:([a-z0-9-]{2,32}):/g;

interface EmoteTextProps {
  text: string;
  emotes: Map<string, Emote>;
  size?: number;
  className?: string;
}

type Token =
  | { type: "text"; value: string }
  | { type: "emote"; emote: Emote };

function tokenize(text: string, emotes: Map<string, Emote>): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  EMOTE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EMOTE_REGEX.exec(text)) !== null) {
    const slug = m[1];
    const emote = emotes.get(slug);
    if (!emote) continue;
    if (m.index > last) {
      tokens.push({ type: "text", value: text.slice(last, m.index) });
    }
    tokens.push({ type: "emote", emote });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    tokens.push({ type: "text", value: text.slice(last) });
  }
  return tokens;
}

export default function EmoteText({ text, emotes, size = 20, className }: EmoteTextProps) {
  const tokens = useMemo(() => tokenize(text, emotes), [text, emotes]);

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        if (tok.type === "text") return <Fragment key={i}>{tok.value}</Fragment>;
        const { slug, imageUrl, label } = tok.emote;
        const safeSrc = safeImageUrl(imageUrl);
        if (!safeSrc) return <Fragment key={i}>{`:${slug}:`}</Fragment>;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={safeSrc}
            alt={label || `:${slug}:`}
            title={`:${slug}:`}
            loading="lazy"
            draggable={false}
            className="inline-block align-middle select-none"
            style={{ height: size, width: "auto" }}
          />
        );
      })}
    </span>
  );
}
