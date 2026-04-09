"use client";

const LINES = [
  "signal pirate actif",
  "projection 24/7",
  "cinéma de contrebande",
  "bande passante clandestine",
  "pas de pubs, pas de compromis",
  "le projecteur ne s'éteint jamais",
  "copies interdites, projections libres",
  "fréquence non autorisée",
  "salle obscure sans murs",
  "on ne choisit pas ce qu'on regarde, on le découvre",
  "diffusion sauvage depuis 2026",
];

const SEP = " \u2014 ";
const REPEAT = 8;

export default function Ticker() {
  const text = LINES.join(SEP) + SEP;
  const block = text.repeat(REPEAT);

  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-border py-2">
      <div
        className="inline-block animate-[ticker_300s_linear_infinite]"
        style={{ willChange: "transform" }}
      >
        <span className="text-[11px] text-dim italic">
          {block}{block}
        </span>
      </div>
    </div>
  );
}
