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

function renderLine(keyPrefix: string) {
  return SEGMENTS.flatMap((s, i) => [
    <span key={`${keyPrefix}-sep-${i}`} className="mx-8">{"///"}</span>,
    <span key={`${keyPrefix}-seg-${i}`}>{s}</span>,
  ]).concat(
    <span key={`${keyPrefix}-sep-end`} className="mx-8">{"///"}</span>
  );
}

export default function Ticker() {
  return (
    <div className="border-b border-line bg-bg overflow-hidden">
      <div
        className="ticker-track flex whitespace-nowrap font-mono font-semibold text-[11px] tracking-[0.18em] text-ink-3 py-1.5 select-none"
        aria-hidden
      >
        <div className="shrink-0 flex items-center">{renderLine("a")}</div>
        <div className="shrink-0 flex items-center">{renderLine("b")}</div>
      </div>
    </div>
  );
}
