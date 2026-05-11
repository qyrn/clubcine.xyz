const PROFILE_REGEX = /^[a-zA-Z0-9_-]+$/;
const FILM_SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;

function clean(input: string): string {
  return input.trim().replace(/\/+$/, "");
}

export function normalizeLetterboxdProfile(input: string): string {
  if (!input) return "";
  const v = clean(input);
  if (!v) return "";
  try {
    const url = new URL(v.includes("://") ? v : `https://${v}`);
    if (url.hostname.endsWith("letterboxd.com")) {
      const handle = url.pathname.replace(/^\/|\/$/g, "").split("/")[0];
      if (handle) return `https://letterboxd.com/${handle}/`;
    }
  } catch {}
  if (PROFILE_REGEX.test(v)) {
    return `https://letterboxd.com/${v}/`;
  }
  return v;
}

export function letterboxdProfileHandle(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/|\/$/g, "").split("/")[0] ?? "";
  } catch {
    return url;
  }
}

const IMDB_PATH_REGEX = /^imdb\/(tt\d+)\/?$/i;

export function normalizeLetterboxdFilm(input: string): string {
  if (!input) return "";
  const v = clean(input);
  if (!v) return "";
  try {
    const url = new URL(v.includes("://") ? v : `https://${v}`);
    if (url.hostname.endsWith("letterboxd.com")) {
      const path = url.pathname.replace(/^\/|\/$/g, "");
      const imdbMatch = path.match(IMDB_PATH_REGEX);
      if (imdbMatch) return `https://letterboxd.com/imdb/${imdbMatch[1]}/`;
      const parts = path.split("/");
      const filmIndex = parts.indexOf("film");
      const slug = filmIndex >= 0 ? parts[filmIndex + 1] : parts[0];
      if (slug) return `https://letterboxd.com/film/${slug}/`;
    }
  } catch {}
  const imdbDirect = v.match(IMDB_PATH_REGEX);
  if (imdbDirect) return `https://letterboxd.com/imdb/${imdbDirect[1]}/`;
  if (/^tt\d+$/i.test(v)) return `https://letterboxd.com/imdb/${v}/`;
  if (FILM_SLUG_REGEX.test(v)) {
    return `https://letterboxd.com/film/${v}/`;
  }
  return v;
}

export function letterboxdFilmSlug(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/|\/$/g, "");
    const imdbMatch = path.match(IMDB_PATH_REGEX);
    if (imdbMatch) return `imdb/${imdbMatch[1]}`;
    const parts = path.split("/");
    const filmIndex = parts.indexOf("film");
    return filmIndex >= 0 ? parts[filmIndex + 1] ?? "" : "";
  } catch {
    return url;
  }
}
