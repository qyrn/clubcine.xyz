const HANDLE_REGEX = /^[a-zA-Z0-9_.]+$/;

function clean(input: string): string {
  return input.trim().replace(/^@/, "").replace(/\/+$/, "");
}

function normalizeSocial(input: string, hosts: string[], base: string): string {
  if (!input) return "";
  const v = clean(input);
  if (!v) return "";
  try {
    const url = new URL(v.includes("://") ? v : `https://${v}`);
    if (hosts.some((h) => url.hostname.endsWith(h))) {
      const handle = url.pathname.replace(/^\/|\/$/g, "").split("/")[0];
      if (handle) return `${base}${handle}/`;
    }
  } catch {}
  if (HANDLE_REGEX.test(v)) {
    return `${base}${v}/`;
  }
  return v;
}

function socialHandle(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/|\/$/g, "").split("/")[0] ?? "";
  } catch {
    return url.replace(/^@/, "");
  }
}

export function normalizeTwitter(input: string): string {
  return normalizeSocial(input, ["x.com", "twitter.com"], "https://x.com/");
}

export function twitterHandle(url: string): string {
  return socialHandle(url);
}

export function normalizeInstagram(input: string): string {
  return normalizeSocial(input, ["instagram.com"], "https://instagram.com/");
}

export function instagramHandle(url: string): string {
  return socialHandle(url);
}
