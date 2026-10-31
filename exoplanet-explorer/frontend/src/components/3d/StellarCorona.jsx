import { useMemo } from 'react'
import { AdditiveBlending, Color, PlaneGeometry } from 'three'
import { Line } from '@react-three/drei'
import { CORONA_FRAG, GLOW_VERT } from './stellarShaders.js'
import { STAR_RADIUS } from './scaling.js'

export const CORONA_RADIUS = 1.6 // outer corona edge, in star radii. Even the largest star stays inside the innermost orbit.

const PLANE = new PlaneGeometry(2 * STAR_RADIUS * CORONA_RADIUS, 2 * STAR_RADIUS * CORONA_RADIUS)

/** Soft outer corona: a camera-facing quad with a radial falloff (one transparent layer, no opaque shell). */
export default function StellarCorona({ materialRef, visuals }) {
  const uniforms = useMemo(() => ({
    uColor: { value: new Color(...visuals.corona) }, uStrength: { value: visuals.coronaStrength },
    uInner: { value: 1 / CORONA_RADIUS }, uTime: { value: 0 }, uSeed: { value: visuals.seed },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh geometry={PLANE} dispose={null} renderOrder={4}>
      <shaderMaterial ref={materialRef} vertexShader={GLOW_VERT} fragmentShader={CORONA_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  )
}

// ---- prominences: decorative plasma loops (illustrative, not observed activity) ----------------------------

const arc = (a0, a1, lift, n = 20) => {
  const R = STAR_RADIUS, p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R]
  const mid = (a0 + a1) / 2, c = [Math.cos(mid) * (R + lift * 2), Math.sin(mid) * (R + lift * 2)] // control point above the limb
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1], 0.01]
  })
}

/** A few subtle loops rising from the limb, in the camera-facing plane. Count follows the (illustrative) activity level. */
export function StellarProminences({ visuals, lineRefs }) {
  const loops = useMemo(() => {
    const n = visuals.activity < 0.25 ? 0 : visuals.activity < 0.45 ? 1 : visuals.activity < 0.7 ? 2 : 3
    return Array.from({ length: n }, (_, i) => {
      const a0 = ((visuals.seed * 0.37 + i * 2.2) % (Math.PI * 2)) + 0.2
      return arc(a0, a0 + 0.25 + 0.1 * ((visuals.seed + i) % 1), 0.14 + 0.07 * ((visuals.seed * 3 + i) % 1))
    })
  }, [visuals.seed, visuals.activity])
  const color = useMemo(() => new Color(...visuals.glow), [visuals.glow]) // the star's own colour, not white
  return loops.map((pts, i) => (
    <Line key={i} ref={(el) => { if (lineRefs) lineRefs.current[i] = el }} points={pts} color={color} lineWidth={1.1} transparent opacity={0.16} depthWrite={false} />
  ))
}
