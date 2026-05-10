"use client";

import { useState } from "react";

interface Suggestion {
  id: string;
  title: string;
  director: string;
  year: number;
  votes: number;
}

const INITIAL: Suggestion[] = [
  { id: "blue-velvet", title: "Blue Velvet", director: "Lynch", year: 1986, votes: 14 },
  { id: "vertigo", title: "Vertigo", director: "Hitchcock", year: 1958, votes: 11 },
  { id: "tree-of-life", title: "The Tree of Life", director: "Malick", year: 2011, votes: 9 },
];

const LETTERBOXD_LIST = "https://letterboxd.com/clubcinefr/list/club-cine-juin-2026/";

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");

  const toggleVote = (id: string) => {
    setVoted((prev) => {
      const next = new Set(prev);
      const has = next.has(id);
      if (has) next.delete(id);
      else next.add(id);
      setSuggestions((sugs) =>
        sugs.map((s) =>
          s.id === id ? { ...s, votes: s.votes + (has ? -1 : 1) } : s,
        ),
      );
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setInput("");
  };

  return (
    <div className="p-10 max-md:p-6">
      <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-5 flex justify-between items-baseline">
        <span>Suggérer</span>
        <span className="font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 normal-case">
          {suggestions.reduce((acc, s) => acc + s.votes, 0)} votes / sem.
        </span>
      </div>

      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Titre, lien letterboxd…"
          className="flex-1 bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2.5 border border-ink-3 text-ink font-semibold text-[12px] hover:bg-ink hover:text-bg transition-colors cursor-pointer"
        >
          Proposer
        </button>
      </form>

      <div className="flex flex-col">
        {suggestions.map((s) => {
          const isVoted = voted.has(s.id);
          return (
            <div
              key={s.id}
              className="py-2.5 grid grid-cols-[auto_1fr] gap-3.5 items-center border-b border-line last:border-b-0"
            >
              <button
                onClick={() => toggleVote(s.id)}
                className={`px-2.5 py-1.5 border font-mono font-semibold text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isVoted ? "border-red text-red" : "border-line-2 hover:border-red hover:text-red"
                }`}
              >
                ▲ {s.votes}
              </button>
              <div>
                <div className="text-[14px] font-semibold">{s.title}</div>
                <div className="text-[11px] text-ink-3">
                  {s.director}, {s.year}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-line">
        <div className="font-mono font-medium text-[12px] tracking-[0.02em] text-ink-3 mb-2">
          <strong className="text-ink font-semibold">100 films</strong> · 32 réalisateurs · 16 pays · 7 décennies
        </div>
        <a
          href={LETTERBOXD_LIST}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-3.5 py-2 border border-ink-3 text-[12px] font-medium hover:bg-ink hover:text-bg hover:border-ink transition-colors"
        >
          Voir sur Letterboxd
        </a>
      </div>
    </div>
  );
}
