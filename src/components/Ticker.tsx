const SEGMENTS = [
  "CLUBCINE",
  "24/7",
  "CINÉ PIRATE",
  "VOSTFR",
  "CLASSIQUES D'AUTEUR",
  "100% INDÉPENDANT",
  "SOUTENEZ LA CHAÎNE",
  "BRANCHEZ-VOUS SUR LE LETTERBOXD",
];

const LINE = SEGMENTS.join("   ///   ") + "   ///   ";

export default function Ticker() {
  return (
    <div className="border-b border-line bg-bg overflow-hidden">
      <div
        className="flex whitespace-nowrap font-mono font-semibold text-[11px] tracking-[0.18em] text-ink-3 py-1.5 select-none"
        style={{ animation: "ticker 60s linear infinite" }}
        aria-hidden
      >
        <span className="shrink-0">{LINE}</span>
        <span className="shrink-0">{LINE}</span>
      </div>
    </div>
  );
}
