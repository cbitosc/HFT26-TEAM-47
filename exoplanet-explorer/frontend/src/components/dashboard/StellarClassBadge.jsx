import { classifyStar } from '../../utils/stellarClassification.js'
import { starColor, rgbToHex } from '../../utils/stellarColorMapping.js'



export default function StellarClassBadge({ star }) {
  const cls = classifyStar(star)
  const { rgb, basis } = starColor(star)
  const hex = rgbToHex(rgb)
  const why = !cls.available ? 'NASA reports neither an effective temperature nor a spectral type for this star.'
    : cls.basis === 'spectral-type'
      ? `From NASA's spectral type (${star.star_spectral_type}).${cls.mismatch ? ` Its effective temperature falls in the ${cls.tempClass} range, so this is a boundary case; the colour follows temperature.` : ''}`
      : 'From the star\'s effective temperature. NASA lists no spectral type.'
  const colourNote = basis === 'temperature' ? 'Colour shown follows effective temperature.' : basis === 'spectral-type' ? 'Colour shown follows the spectral class (no temperature available).' : 'No colour data: neutral appearance.'
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs text-slate-100" title={`${why} ${colourNote}`}>
      <i className="h-2.5 w-2.5 rounded-full" style={{ background: hex, boxShadow: `0 0 8px ${hex}99` }} aria-hidden />
      {cls.label}
    </span>
  )
}
