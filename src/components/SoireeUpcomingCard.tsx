import Image from "next/image";
import Link from "next/link";

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatSoireeDate(ms: number): string {
  const d = new Date(ms);
  const day = WEEKDAYS[d.getDay()];
  const month = MONTHS[d.getMonth()];
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${d.getDate()} ${month} · ${h}h${m === "00" ? "" : m}`;
}

export function SoireePoster({ poster, priority }: { poster?: string; priority?: boolean }) {
  return (
    <div className="relative">
      {poster && (
        <div
          aria-hidden
          className="absolute inset-0 translate-y-1.5 -z-10 bg-cover bg-center blur-[18px] opacity-20 saturate-125"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
      <div className="relative aspect-[2/3] border border-line rounded-lg overflow-hidden bg-bg transition-opacity group-hover:opacity-90">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw"
            className="object-cover"
          />
        )}
      </div>
    </div>
  );
}

interface CardFilm {
  id: string;
  title: string;
}

interface Props {
  poster?: string;
  startsAt: number;
  title: string;
  films: CardFilm[];
  custom: boolean;
  creditedUsername?: string;
  priority?: boolean;
}

export default function SoireeUpcomingCard({
  poster,
  startsAt,
  title,
  films,
  custom,
  creditedUsername,
  priority,
}: Props) {
  return (
    <article className="relative flex flex-col gap-3 group">
      <SoireePoster poster={poster} priority={priority} />
      <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
        ★ À venir
      </div>
      <div className="font-mono text-[11px] leading-none tracking-[0.04em] text-ink-3 capitalize -mt-1">
        {formatSoireeDate(startsAt)}
      </div>
      <h3 className="font-bold text-[20px] leading-[1.1] tracking-[-0.01em] -mt-1 text-balance">
        {title}
      </h3>
      {!custom && (
        <ul className="font-mono text-[11px] tracking-[0.04em] text-ink-3 flex flex-wrap gap-x-2 gap-y-1 -mt-1">
          {films.map((f) => (
            <li key={f.id}>★ {f.title}</li>
          ))}
        </ul>
      )}
      {creditedUsername && (
        <div className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
          Suggérée par{" "}
          <Link
            href={`/u/${encodeURIComponent(creditedUsername)}`}
            className="text-ink-2 hover:text-ink transition-colors"
          >
            @{creditedUsername}
          </Link>
        </div>
      )}
    </article>
  );
}
