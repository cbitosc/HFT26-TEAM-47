import { useMemo } from 'react'
import { AdditiveBlending, Color, PlaneGeometry } from 'three'
import { GLOW_FRAG, GLOW_VERT } from './stellarShaders.js'
import { STAR_RADIUS } from './scaling.js'

export const GLOW_RADIUS = 1.2

const PLANE = new PlaneGeometry(2 * STAR_RADIUS * GLOW_RADIUS, 2 * STAR_RADIUS * GLOW_RADIUS)


export default function StellarGlow({ materialRef, visuals }) {
  const uniforms = useMemo(() => ({
    uColor: { value: new Color(...visuals.glow) }, uStrength: { value: visuals.coronaStrength }, uInner: { value: 1 / GLOW_RADIUS },
  }), [])
  return (
    <mesh geometry={PLANE} dispose={null} renderOrder={5}>
      <shaderMaterial ref={materialRef} vertexShader={GLOW_VERT} fragmentShader={GLOW_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  )
}
