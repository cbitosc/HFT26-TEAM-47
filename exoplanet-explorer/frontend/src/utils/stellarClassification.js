





export const CLASS_RANGES = [
  ['O', 30000, Infinity],
  ['B', 10000, 30000],
  ['A', 7500, 10000],
  ['F', 6000, 7500],
  ['G', 5200, 6000],
  ['K', 3700, 5200],
  ['M', 0, 3700],
]

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function classFromTemperature(t) {
  if (!isNum(t) || t <= 0) return null
  return CLASS_RANGES.find(([, lo, hi]) => t >= lo && t < hi)[0]
}


export function parseSpectralType(s) {
  if (typeof s !== 'string') return null
  const m = s.trim().match(/^([OBAFGKM])\s*(\d+(?:\.\d+)?)?\s*[-/]?\s*(Ia|Ib|III|II|IV|V|I)?\b/i)
  if (!m) return null
  const raw = m[3]
  const lumClass = raw ? (/^i[ab]$/i.test(raw) ? `I${raw[1].toLowerCase()}` : raw.toUpperCase()) : null
  return { cls: m[1].toUpperCase(), subclass: m[2] != null ? Number(m[2]) : null, lumClass }
}

const COLOUR_WORD = { O: 'Blue', B: 'Blue-white', A: 'White', F: 'Yellow-white', G: 'Yellow', K: 'Orange', M: 'Red' }


function describe(cls, lumClass, radius) {
  const word = COLOUR_WORD[cls]
  if (['O', 'B', 'A'].includes(cls) && !lumClass) return `${word} star`
  let kind = null
  if (lumClass === 'V') kind = 'dwarf'
  else if (lumClass === 'IV') kind = 'subgiant'
  else if (lumClass === 'III' || lumClass === 'II') kind = 'giant'
  else if (lumClass === 'Ia' || lumClass === 'Ib' || lumClass === 'I') kind = 'supergiant'
  else if (isNum(radius)) kind = radius >= 3 ? 'giant' : 'dwarf'
  return kind ? `${word} ${kind}` : `${word} star`
}


export function classifyStar(star) {
  const tempClass = classFromTemperature(star?.star_temperature_k)
  const parsed = parseSpectralType(star?.star_spectral_type)
  if (!tempClass && !parsed) {
    return { available: false, spectralClass: null, label: 'Classification unavailable', descriptor: null, basis: 'unavailable', tempClass: null, spectralTypeClass: null, mismatch: false }
  }
  const cls = parsed ? parsed.cls : tempClass
  const descriptor = describe(cls, parsed?.lumClass ?? null, star?.star_radius_solar)
  return {
    available: true, spectralClass: cls, label: `${cls}-type · ${descriptor}`, descriptor,
    basis: parsed ? 'spectral-type' : 'temperature',
    tempClass, spectralTypeClass: parsed?.cls ?? null,
    mismatch: !!(parsed && tempClass && parsed.cls !== tempClass),
  }
}
