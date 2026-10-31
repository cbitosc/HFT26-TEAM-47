import { CanvasTexture, SRGBColorSpace } from 'three'

// Small seeded value-noise textures. These are generated artwork, not surface imagery.
const DEFAULT_W = 256
const DEFAULT_H = 128

const hash = (x, y, s) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const smooth = (t) => t * t * (3 - 2 * t)

function noise(x, y, s, wrap) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const u = smooth(x - xi), v = smooth(y - yi)
  const w = (i) => ((i % wrap) + wrap) % wrap // wrap horizontally so the texture tiles around the sphere
  const a = hash(w(xi), yi, s), b = hash(w(xi + 1), yi, s)
  const c = hash(w(xi), yi + 1, s), d = hash(w(xi + 1), yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(u, v, s) {
  let amp = 0.5, sum = 0, norm = 0
  for (let o = 0; o < 4; o++) {
    const f = 2 ** o
    sum += amp * noise(u * 4 * f, v * 3 * f, s, 4 * f)
    norm += amp
    amp *= 0.5
  }
  return sum / norm
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t)

const PALETTES = {
  rocky: { a: '#4f4037', b: '#b09a86' },
  temperate: { a: '#1f4e8c', b: '#4f7a3a', ice: '#e8f0f5' },
  subneptune: { a: '#6f9fba', b: '#c4dbe6', band: 0.35 },
  icegiant: { a: '#3f6fc0', b: '#8fc1f0', band: 0.45 },
  gasgiant: { a: '#a8703d', b: '#ecd7ad', band: 1 },
  unknown: { a: '#7d828f', b: '#9a9fab' },
}

// width/height default to the small orbit-view texture; the planet detail view asks for a larger one.
export function createPlanetTexture(type, seedStr, W = DEFAULT_W, H = DEFAULT_H) {
  const seed = [...seedStr].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0
  const pal = PALETTES[type] ?? PALETTES.unknown
  const A = rgb(pal.a), B = rgb(pal.b)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H
      const n = fbm(u, v, seed)
      let col
      if (pal.band) {
        const bands = 0.5 + 0.5 * Math.sin(v * Math.PI * 10 + (n - 0.5) * 6)
        col = mix(A, B, (1 - pal.band) * n + pal.band * bands)
      } else if (type === 'temperate') {
        col = n > 0.52 ? mix(A, B, 0.4 + (n - 0.52) * 2) : mix(A, rgb('#2d6bb0'), n)
        const pole = Math.abs(v - 0.5) * 2
        if (pole > 0.86) col = mix(col, rgb(pal.ice), (pole - 0.86) / 0.14)
      } else {
        col = mix(A, B, n)
      }
      const i = (y * W + x) * 4
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

export const ATMOSPHERE = {
  temperate: '#7ab8ff', subneptune: '#a8d4f0', icegiant: '#7fb0ff', gasgiant: '#f0d9a8',
}
export const ROUGHNESS = { rocky: 0.95, temperate: 0.7, subneptune: 0.6, icegiant: 0.55, gasgiant: 0.6, unknown: 0.9 }
