"use client";

const TEXT = "/// TV.QYRN /// CINEMA DE CONTREBANDE /// 24/7 /// SIGNAL PIRATE /// PROJECTION EN COURS /// ";

export default function Ticker() {
  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-border bg-black">
      <div
        className="inline-block animate-[ticker_20s_linear_infinite]"
        style={{ willChange: "transform" }}
      >
        <span className="text-[10px] text-dim tracking-[.2em] uppercase">
          {TEXT}{TEXT}
        </span>
      </div>
    </div>
  );
}
