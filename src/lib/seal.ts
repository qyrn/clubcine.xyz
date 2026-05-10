export interface SealCircle {
  cx: number;
  cy: number;
  r: number;
}

export const SEAL_VIEW = 720;

const CONFIG = {
  spacing: 7,
  size: 2.2,
  variation: 45,
  jitter: 22,
  innerFactor: 0.78,
  cSizeFactor: 1.85,
  tagFactor: 0.085,
  strokeOuter: 8,
  strokeInner: 3,
  cOffsetX: -0.04,
  cOffsetY: 0,
  cFontFamily: "'Bagel Fat One', cursive",
  topText: "★  CLUB  CINÉ  ★  24/7 BROADCAST  ★  ON AIR  ★",
  bottomText: "★  ADMIT ONE  ★  NO. 0001  ★  CHANNEL 01  ★",
};

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fontSize: number,
  fontFamily: string,
  mx: number,
  my: number,
) {
  ctx.font = "400 " + fontSize + "px " + fontFamily;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const ax = (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
  const ay = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillText(text, cx + ax + (mx || 0) * fontSize, cy + ay + (my || 0) * fontSize);
}

function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  centerAngle: number,
  font: string,
  flipped: boolean,
) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let totalAngle = 0;
  for (let i = 0; i < text.length; i++) totalAngle += ctx.measureText(text[i]).width / radius;

  if (flipped) {
    let angle = centerAngle + totalAngle / 2;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const charA = ctx.measureText(ch).width / radius;
      const a = angle - charA / 2;
      ctx.save();
      ctx.translate(Math.sin(a) * radius, -Math.cos(a) * radius);
      ctx.rotate(a + Math.PI);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      angle -= charA;
    }
  } else {
    let angle = centerAngle - totalAngle / 2;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const charA = ctx.measureText(ch).width / radius;
      const a = angle + charA / 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillText(ch, 0, -radius);
      ctx.restore();
      angle += charA;
    }
  }
}

function drawCircleSeal(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  const innerR = r * CONFIG.innerFactor;
  const ringMidR = (r + innerR) / 2;

  ctx.lineWidth = CONFIG.strokeOuter;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = CONFIG.strokeInner;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  const tagFontSize = Math.round(r * CONFIG.tagFactor * 1.3);
  const tagFont = "700 " + tagFontSize + 'px "JetBrains Mono", monospace';

  ctx.save();
  ctx.translate(cx, cy);
  drawArcText(ctx, CONFIG.topText, ringMidR, 0, tagFont, false);
  drawArcText(ctx, CONFIG.bottomText, ringMidR, Math.PI, tagFont, true);
  ctx.restore();

  const starSize = Math.round(r * CONFIG.tagFactor * 2.2);
  ctx.font = "900 " + starSize + "px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", cx + ringMidR, cy);
  ctx.fillText("★", cx - ringMidR, cy);

  fillCenteredText(
    ctx,
    "C",
    cx,
    cy,
    innerR * CONFIG.cSizeFactor,
    CONFIG.cFontFamily,
    CONFIG.cOffsetX,
    CONFIG.cOffsetY,
  );
}

function sampleToCircles(imageData: ImageData, rng: () => number): SealCircle[] {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const circles: SealCircle[] = [];
  const spacing = CONFIG.spacing;
  const baseR = CONFIG.size;
  const variation = CONFIG.variation / 100;
  const jitter = (CONFIG.jitter / 100) * spacing;

  for (let y = 0; y < h; y += spacing) {
    for (let x = 0; x < w; x += spacing) {
      const jx = x + (rng() - 0.5) * jitter;
      const jy = y + (rng() - 0.5) * jitter;
      const xi = Math.round(jx);
      const yi = Math.round(jy);
      if (xi < 0 || xi >= w || yi < 0 || yi >= h) continue;
      const idx = (yi * w + xi) * 4;
      if (data[idx] < 180) continue;

      let radius = baseR;
      if (variation > 0) {
        const v = rng();
        if (v > 0.92) radius = baseR * (1.4 + rng() * variation * 0.9);
        else radius = baseR * (1 - variation * 0.35 + rng() * variation * 0.55);
      }
      circles.push({ cx: jx, cy: jy, r: radius });
    }
  }
  return circles;
}

export function generateSealCircles(seed = 42): SealCircle[] {
  const canvas = document.createElement("canvas");
  canvas.width = SEAL_VIEW;
  canvas.height = SEAL_VIEW;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  drawCircleSeal(ctx, SEAL_VIEW, SEAL_VIEW);
  const data = ctx.getImageData(0, 0, SEAL_VIEW, SEAL_VIEW);
  return sampleToCircles(data, makeRng(seed + 1));
}
