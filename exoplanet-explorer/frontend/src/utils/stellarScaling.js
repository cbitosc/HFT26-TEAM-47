



import { classifyStar } from './stellarClassification.js'
import { starColor, rgbToHex } from './stellarColorMapping.js'
import { stellarLuminosity } from './habitabilityCalculations.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)


export const starScaleFromRadius = (r) => (isNum(r) && r > 0 ? clamp(1 + 0.6 * Math.log10(r), 0.65, 1.35) : 1)


export function luminosityLog(star) {
  const lum = stellarLuminosity(star ?? {})
  return lum ? Math.log10(lum.value) : null
}


const ACTIVITY = { M: 0.85, K: 0.65, G: 0.5, F: 0.35, A: 0.2, B: 0.12, O: 0.1 }

const GRANULE_CONTRAST = { M: 0.55, K: 0.68, G: 0.82, F: 0.85, A: 0.5, B: 0.3, O: 0.25 }

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const hash = (s) => { let h = 2166136261; for (const ch of String(s ?? '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296 }


export function starVisuals(star) {
  const cls = classifyStar(star)
  const { rgb, basis } = starColor(star)
  const base = rgb.map((v) => v / 255)
  const logL = luminosityLog(star)
  const c = cls.spectralClass


  const bright = logL == null ? 1 : clamp(1 + 0.1 * logL, 0.72, 1.28)
  return {
    cls, colorBasis: basis, hex: rgbToHex(rgb), name: star?.host ?? star?.host_star ?? null,
    base,
    hot: mix(base, [1, 1, 1], 0.3),
    cool: [base[0] * 0.7, base[1] * 0.5, base[2] * 0.34],
    glow: mix(base, [1, 1, 1], 0.2),
    corona: mix(base, [1, 1, 1], 0.1),
    radiusScale: starScaleFromRadius(star?.star_radius_solar),
    emissive: bright,
    light: clamp(2.6 + 0.5 * (logL ?? 0), 1.4, 4),
    coronaStrength: clamp(0.8 + 0.12 * (logL ?? 0), 0.5, 1.15),
    activity: ACTIVITY[c] ?? 0.4,
    granuleContrast: GRANULE_CONTRAST[c] ?? 0.6,
    seed: hash(star?.host ?? star?.host_star) * 100,
    luminosityLog: logL,
  }
}
