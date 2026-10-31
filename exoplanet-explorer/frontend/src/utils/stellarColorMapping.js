




import { classFromTemperature, parseSpectralType } from './stellarClassification.js'

const ANCHORS = [
  [2300, [255, 72, 42]],
  [3000, [255, 104, 58]],
  [3700, [255, 150, 82]],
  [4500, [255, 182, 108]],
  [5200, [255, 208, 140]],
  [5800, [255, 236, 198]],
  [6500, [255, 245, 226]],
  [7500, [238, 242, 255]],
  [10000, [206, 222, 255]],
  [20000, [172, 201, 255]],
  [30000, [152, 187, 255]],
  [45000, [138, 172, 255]],
]

export const NEUTRAL_STAR_RGB = [222, 226, 238]


const CLASS_RGB = Object.fromEntries(
  Object.entries({ O: 38000, B: 18000, A: 8700, F: 6700, G: 5600, K: 4400, M: 3200 }).map(([k, t]) => [k, temperatureToRgb(t)]),
)

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function temperatureToRgb(t) {
  const T = Math.min(ANCHORS.at(-1)[0], Math.max(ANCHORS[0][0], t))
  let i = 0
  while (i < ANCHORS.length - 2 && T > ANCHORS[i + 1][0]) i++
  const [t0, c0] = ANCHORS[i], [t1, c1] = ANCHORS[i + 1]
  const f = (Math.log(T) - Math.log(t0)) / (Math.log(t1) - Math.log(t0))
  return c0.map((v, k) => Math.round(v + (c1[k] - v) * f))
}

export const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`


export function starColor(star) {
  const t = star?.star_temperature_k
  if (isNum(t) && t > 0) return { rgb: temperatureToRgb(t), basis: 'temperature' }
  const parsed = parseSpectralType(star?.star_spectral_type)
  if (parsed) return { rgb: CLASS_RGB[parsed.cls], basis: 'spectral-type' }
  return { rgb: NEUTRAL_STAR_RGB, basis: 'unavailable' }
}

export const classFromTemp = classFromTemperature
