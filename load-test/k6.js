import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// clubcine.xyz load test. Voir load-test/HOWTO.md.
//
//   BASE=https://clubcine.xyz \
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_ANON_KEY=eyJ... \
//   CDN=https://cdn.clubcine.xyz \
//   FILM_ID=blue-velvet \
//   PEAK=500 \
//   k6 run load-test/k6.js

const BASE = __ENV.BASE || "http://localhost:3000";
const SUPABASE_URL = __ENV.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";
const CDN = __ENV.CDN || "";
const FILM_ID = __ENV.FILM_ID || "";
const PEAK = parseInt(__ENV.PEAK || "300", 10);

const realtimeConnects = new Counter("realtime_connect_ok");
const realtimeErrors = new Counter("realtime_connect_err");
const segmentTtfb = new Trend("hls_segment_ttfb", true);

export const options = {
  scenarios: {
    browsing: {
      executor: "ramping-vus",
      exec: "browsing",
      startVUs: 0,
      stages: [
        { duration: "1m", target: Math.ceil(PEAK * 0.3) },
        { duration: "2m", target: PEAK },
        { duration: "3m", target: PEAK },
        { duration: "1m", target: 0 },
      ],
    },
    realtime: {
      executor: "ramping-vus",
      exec: "realtime",
      startVUs: 0,
      stages: [
        { duration: "1m", target: Math.ceil(PEAK * 0.3) },
        { duration: "2m", target: PEAK },
        { duration: "3m", target: PEAK },
        { duration: "1m", target: 0 },
      ],
      startTime: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    "http_req_duration{kind:page}": ["p(95)<2000"],
    "http_req_duration{kind:api}": ["p(95)<500"],
    hls_segment_ttfb: ["p(95)<1500"],
    realtime_connect_err: ["count<10"],
  },
};

export function browsing() {
  const page = http.get(`${BASE}/movie`, { tags: { kind: "page" } });
  check(page, { "movie 200": (r) => r.status === 200 });

  // Le client calcule le schedule en local et ne cale l'horloge que
  // rarement — on modélise ~1 appel toutes les 30 s ici pour rester dans
  // la fenêtre du test.
  for (let i = 0; i < 6; i++) {
    const t = http.get(`${BASE}/api/time`, { tags: { kind: "api" } });
    check(t, { "time 200": (r) => r.status === 200 });
    sleep(5);
  }

  if (CDN && FILM_ID) {
    const master = http.get(`${CDN}/films-hls/${FILM_ID}/master.m3u8`, { tags: { kind: "hls" } });
    check(master, { "master 200": (r) => r.status === 200 });
    const seg = http.get(`${CDN}/films-hls/${FILM_ID}/segment-0.ts`, { tags: { kind: "hls" } });
    if (seg.timings) segmentTtfb.add(seg.timings.waiting);
  }
}

export function realtime() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sleep(30);
    return;
  }
  const host = SUPABASE_URL.replace(/^https?:/, "wss:");
  const url = `${host}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;

  const res = ws.connect(url, {}, (socket) => {
    socket.on("open", () => {
      realtimeConnects.add(1);
      socket.send(
        JSON.stringify({
          topic: "realtime:public:messages",
          event: "phx_join",
          payload: { config: { postgres_changes: [{ event: "INSERT", schema: "public", table: "messages" }] } },
          ref: "1",
        }),
      );
      socket.setInterval(() => {
        socket.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" }));
      }, 25000);
      socket.setTimeout(() => socket.close(), 240000);
    });
    socket.on("error", () => realtimeErrors.add(1));
  });
  check(res, { "ws 101": (r) => r && r.status === 101 });
}
