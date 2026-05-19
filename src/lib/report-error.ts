interface ReportOptions {
  source?: string;
  message: string;
  stack?: string;
  userId?: string | null;
  username?: string | null;
}

function inferUsername(): string | null {
  try {
    return window.localStorage.getItem("clubcine-username");
  } catch {
    return null;
  }
}

export function reportError(opts: ReportOptions): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${opts.source ?? "client"}] ${opts.message}`, opts.stack);
    return;
  }
  try {
    const payload = JSON.stringify({
      source: opts.source ?? "client",
      message: opts.message,
      stack: opts.stack,
      url: window.location.href,
      userId: opts.userId ?? null,
      username: opts.username ?? inferUsername(),
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/log-error", blob);
    } else {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}
