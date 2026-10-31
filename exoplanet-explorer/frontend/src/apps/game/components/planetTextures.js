import { CanvasTexture, SRGBColorSpace } from 'three';






const W = 256, H = 128;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

const hash = (x, y, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const smooth = t => t * t * (3 - 2 * t);
function noise(x, y, s, wrap) {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
  const w = i => ((i % wrap) + wrap) % wrap;
  const a = hash(w(xi), yi, s), b = hash(w(xi + 1), yi, s), c = hash(w(xi), yi + 1, s), d = hash(w(xi + 1), yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(u, v, s, fx = 4, fy = 3, oct = 4) {
  let amp = .5, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) { const f = 2 ** o; sum += amp * noise(u * fx * f, v * fy * f, s, fx * f); norm += amp; amp *= .5; }
  return sum / norm;
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);
const seedOf = name => [...String(name || '?')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0;


export function starLight(teff) {
  const k = num(teff) ?? 5772;
  return k < 3500 ? '#ff7a4a' : k < 5000 ? '#ffc680' : k < 6500 ? '#fff4dc' : '#d4e4ff';
}


export function describeSurface(p, type, locked = false) {
  const eqt = num(p.pl_eqt), period = num(p.pl_orbper), insol = num(p.pl_insol);
  const t = eqt ?? 288;
  const base = { type, seed: seedOf(p.pl_name), starTint: starLight(p.st_teff), locked: Boolean(locked) };
  switch (type) {
    case 'giant':
      return { ...base, colors: t > 1000 ? ['#6b3a22', '#e9a15f'] : t > 400 ? ['#a8703d', '#ecd7ad'] : ['#6f93b8', '#d7e6f2'],
        bands: clamp(Math.round(5 + 2 * Math.log10(1 + (period ?? 30))), 5, 13), turbulence: clamp(t / 1600, .15, 1) };
    case 'lava':
      return { ...base, colors: ['#1c1210', '#4a2418'], glow: '#ff6a2a', cracks: clamp((t - 700) / 900, .3, 1) };
    case 'hot':
      return { ...base, colors: ['#8a4f2c', '#d8a46a'], dunes: clamp(num(insol) != null ? Math.log10(1 + insol) / 3 : .5, .2, 1) };
    case 'ice':
      return { ...base, colors: ['#9ec3e0', '#eef6fb'], cracks: clamp((273 - t) / 150, .15, .8), cap: 1 };
    default:
      return { ...base, colors: ['#1f4e8c', '#4f7a3a'], land: clamp(.62 - (t - 255) / 400, .38, .66), cap: clamp((285 - t) / 120, .04, .5) };
  }
}

function colourAt(d, u, v, n, n2) {
  const [A, B] = d.colors.map(rgb);
  switch (d.type) {
    case 'giant': {
      const warp = (n - .5) * 6 * d.turbulence;
      const bands = .5 + .5 * Math.sin(v * Math.PI * d.bands + warp);
      return mix(A, B, .15 + .75 * bands);
    }
    case 'lava': {
      const crust = mix(A, B, n);
      const crack = Math.abs(n2 - .5) < .035 * d.cracks + .01 ? 1 : 0;
      return crack ? mix(crust, rgb(d.glow), .95) : crust;
    }
    case 'hot': {
      const streak = .5 + .5 * Math.sin((n * 10 + v * 3) * Math.PI * (1 + d.dunes));
      return mix(mix(A, B, n), mix(A, B, streak), .45);
    }
    case 'ice': {
      const crack = Math.abs(n2 - .5) < .02 * d.cracks ? 1 : 0;
      const c = mix(A, B, .35 + n * .65);
      return crack ? mix(c, rgb('#5b86ad'), .7) : c;
    }
    default: {
      let col = n > d.land ? mix(A, B, .4 + (n - d.land) * 2.2) : mix(A, rgb('#2d6bb0'), n / d.land);
      const pole = Math.abs(v - .5) * 2;
      if (pole > 1 - d.cap) col = mix(col, rgb('#e8f0f5'), clamp((pole - (1 - d.cap)) / .12, 0, 1));
      const cloud = clamp((n2 - .6) * 3, 0, .55);
      return mix(col, [245, 248, 252], cloud);
    }
  }
}


export function createPlanetTexture(d) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(W, H), tint = rgb(d.starTint);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const n = fbm(u, v, d.seed), n2 = fbm(u, v, d.seed + 99, 6, 5);
      let col = colourAt(d, u, v, n, n2);
      col = mix(col, col.map((c, i) => c * tint[i] / 255), .22);
      if (d.locked) { const day = Math.max(0, Math.cos(2 * Math.PI * (u - .25))); const k = .3 + .7 * day; col = col.map(c => c * k); }
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const cache = new Map();

export function planetTextureFor(p, type, locked) {
  const key = `${p.pl_name}|${type}|${locked ? 1 : 0}`;
  if (!cache.has(key)) cache.set(key, createPlanetTexture(describeSurface(p, type, locked)));
  return cache.get(key);
}
