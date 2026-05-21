type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 800;
  style: "normal";
};

const FONT_UA = "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)";

async function fetchFontFiles(query: string): Promise<ArrayBuffer[]> {
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
    headers: { "User-Agent": FONT_UA },
  }).then((r) => r.text());
  const urls = [
    ...css.matchAll(/url\((https:\/\/[^)]+\.(?:ttf|otf|woff))\)/g),
  ].map((m) => m[1]);
  return Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer())));
}

export async function loadOgFonts(): Promise<LoadedFont[] | undefined> {
  try {
    const [inter, marker] = await Promise.all([
      fetchFontFiles("family=Inter:wght@400;800"),
      fetchFontFiles("family=Permanent+Marker"),
    ]);
    if (inter.length < 2 || marker.length < 1) return undefined;
    return [
      { name: "Inter", data: inter[0], weight: 400, style: "normal" },
      { name: "Inter", data: inter[1], weight: 800, style: "normal" },
      { name: "Permanent Marker", data: marker[0], weight: 400, style: "normal" },
    ];
  } catch {
    return undefined;
  }
}
