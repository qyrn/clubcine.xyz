import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FILMS } from "@/data/schedule";

const execFileP = promisify(execFile);

const CONCURRENCY = 8;
const DUR_WARN = 1.5;
const DUR_FAIL = 4;
const ORIGIN = "https://clubcine.xyz";
const PROBE_TIMEOUT_MS = 45000;
const FETCH_TIMEOUT_MS = 20000;

type Level = "WARN" | "FAIL";

interface Problem {
  level: Level;
  msg: string;
}

interface FilmReport {
  id: string;
  title: string;
  declared: number;
  probed: number | null;
  delta: number | null;
  hasAudio: boolean;
  hasSubs: boolean;
  problems: Problem[];
}

async function timedFetch(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { Origin: ORIGIN }, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

interface Probe {
  duration: number;
  hasAudio: boolean;
  hasSubs: boolean;
}

async function ffprobeJson(url: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { stdout } = await execFileP(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", url],
        { timeout: PROBE_TIMEOUT_MS },
      );
      return stdout;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function probeFilm(url: string): Promise<Probe> {
  const stdout = await ffprobeJson(url);
  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: { codec_type?: string }[];
  };
  const duration = Number.parseFloat(parsed.format?.duration ?? "");
  if (!Number.isFinite(duration)) throw new Error(`ffprobe duree illisible: "${stdout.trim()}"`);
  const types = (parsed.streams ?? []).map((s) => s.codec_type);
  return {
    duration,
    hasAudio: types.includes("audio"),
    hasSubs: types.includes("subtitle"),
  };
}

async function checkFilm(film: (typeof FILMS)[number]): Promise<FilmReport> {
  const report: FilmReport = {
    id: film.id,
    title: film.title,
    declared: film.duration,
    probed: null,
    delta: null,
    hasAudio: false,
    hasSubs: false,
    problems: [],
  };

  if (film.poster) {
    const posterPath = join(process.cwd(), "public", film.poster);
    if (!existsSync(posterPath)) {
      report.problems.push({ level: "FAIL", msg: `poster absent: public${film.poster}` });
    }
  } else {
    report.problems.push({ level: "WARN", msg: "aucun poster declare" });
  }

  try {
    const res = await timedFetch(film.url);
    if (res.status !== 200) {
      report.problems.push({ level: "FAIL", msg: `master.m3u8 HTTP ${res.status}` });
    }
    const acao = res.headers.get("access-control-allow-origin");
    if (!acao) {
      report.problems.push({ level: "FAIL", msg: "header CORS absent (lecture navigateur cassee)" });
    } else if (acao !== "*" && acao !== ORIGIN) {
      report.problems.push({ level: "WARN", msg: `CORS inattendu: ${acao}` });
    }
  } catch (err) {
    report.problems.push({ level: "FAIL", msg: `master.m3u8 injoignable: ${(err as Error).message}` });
  }

  try {
    const probe = await probeFilm(film.url);
    report.probed = probe.duration;
    report.hasAudio = probe.hasAudio;
    report.hasSubs = probe.hasSubs;
    if (!probe.hasAudio) {
      report.problems.push({ level: "FAIL", msg: "aucune piste audio (film muet)" });
    }
    report.delta = report.probed - report.declared;
    const abs = Math.abs(report.delta);
    if (abs >= DUR_FAIL) {
      report.problems.push({
        level: "FAIL",
        msg: `duree desync ${report.delta > 0 ? "+" : ""}${report.delta.toFixed(1)}s (declaree ${report.declared}, reelle ${report.probed.toFixed(1)})`,
      });
    } else if (abs >= DUR_WARN) {
      report.problems.push({
        level: "WARN",
        msg: `duree ecart ${report.delta > 0 ? "+" : ""}${report.delta.toFixed(1)}s`,
      });
    }
  } catch (err) {
    report.problems.push({ level: "FAIL", msg: `ffprobe echoue: ${(err as Error).message}` });
  }

  return report;
}

async function runPool<T, R>(items: T[], limit: number, worker: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let done = 0;
  async function lane() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
      done++;
      process.stdout.write(`\r  ${done}/${items.length} films sondes`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  process.stdout.write("\n");
  return results;
}

async function main() {
  console.log(`Verification de ${FILMS.length} films contre ${process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.clubcine.xyz"}\n`);

  const reports = await runPool(FILMS, CONCURRENCY, checkFilm);

  const failed = reports.filter((r) => r.problems.some((p) => p.level === "FAIL"));
  const warned = reports.filter(
    (r) => !r.problems.some((p) => p.level === "FAIL") && r.problems.some((p) => p.level === "WARN"),
  );
  const subsCount = reports.filter((r) => r.hasSubs).length;
  const audioMissing = reports.filter((r) => !r.hasAudio).length;

  const print = (r: FilmReport) => {
    for (const p of r.problems) {
      console.log(`  [${p.level}] ${r.id} (${r.title}) : ${p.msg}`);
    }
  };

  if (failed.length) {
    console.log(`\nFAIL (${failed.length}) :`);
    failed.forEach(print);
  }
  if (warned.length) {
    console.log(`\nWARN (${warned.length}) :`);
    warned.forEach(print);
  }

  const deltas = reports
    .filter((r) => r.delta !== null)
    .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!))
    .slice(0, 5);
  console.log("\nTop 5 ecarts de duree :");
  for (const r of deltas) {
    console.log(`  ${r.delta! >= 0 ? "+" : ""}${r.delta!.toFixed(1)}s  ${r.id} (declaree ${r.declared}s)`);
  }

  const noSubs = reports.filter((r) => r.probed !== null && !r.hasSubs);
  console.log(`\nSans piste subs (${noSubs.length}) :`);
  for (const r of noSubs) {
    console.log(`  ${r.id} (${r.title})`);
  }

  console.log("\nResume :");
  console.log(`  OK            ${reports.length - failed.length - warned.length}/${reports.length}`);
  console.log(`  WARN          ${warned.length}`);
  console.log(`  FAIL          ${failed.length}`);
  console.log(`  subs FR       ${subsCount}/${reports.length} (attendu ~85)`);
  console.log(`  audio manquant ${audioMissing}`);

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
