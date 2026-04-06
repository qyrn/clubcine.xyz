"use client";

const TEXT =
  "/// TV.QYRN /// 24/7 /// CINÉMA PIRATE /// AUTEUR /// AVANT-GARDE /// 100% INDÉPENDANT /// SOUTENEZ LE STREAM /// SIGNAL CLANDESTIN ";
const REPEAT = 10;

export default function Ticker() {
  const block = TEXT.repeat(REPEAT);

  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-border py-1.5">
      <div
        className="inline-block animate-[ticker_120s_linear_infinite]"
        style={{ willChange: "transform" }}
      >
        <span className="text-[11px] text-warm/60 font-[var(--font-ui)] uppercase tracking-[0.15em]">
          {block}{block}
        </span>
      </div>
    </div>
  );
}
