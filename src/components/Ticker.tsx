"use client";

const TEXT = "TV.QYRN \u2014 cinema de contrebande \u2014 projection 24/7 \u2014 signal pirate \u2014 ";

export default function Ticker() {
  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-border">
      <div
        className="inline-block animate-[ticker_25s_linear_infinite]"
        style={{ willChange: "transform" }}
      >
        <span className="text-[10px] text-warm/60 font-[var(--font-ui)] lowercase tracking-normal">
          {TEXT}{TEXT}
        </span>
      </div>
    </div>
  );
}
