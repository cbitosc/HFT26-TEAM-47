import { useMemo } from 'react'
import { Color, SphereGeometry } from 'three'
import { SURFACE_FRAG, SURFACE_VERT } from './stellarShaders.js'
import { STAR_RADIUS } from './scaling.js'

// One shared geometry for every star (only one is ever on screen). Procedural, seam-free surface shader:
// granulation, plasma flow and illustrative spots/bright regions. `materialRef` lets HostStar drive the uniforms
// from its single animation loop.
const GEOMETRY = new SphereGeometry(STAR_RADIUS, 64, 48)

export default function StellarSurface({ materialRef, visuals }) {
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uSeed: { value: visuals.seed }, uIntensity: { value: visuals.emissive },
    uActivity: { value: visuals.activity }, uContrast: { value: visuals.granuleContrast },
    uBase: { value: new Color(...visuals.base) }, uHot: { value: new Color(...visuals.hot) }, uCool: { value: new Color(...visuals.cool) },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps -- later changes are interpolated by HostStar

  return (
    <mesh geometry={GEOMETRY} dispose={null}>
      <shaderMaterial ref={materialRef} vertexShader={SURFACE_VERT} fragmentShader={SURFACE_FRAG} uniforms={uniforms} />
    </mesh>
  )
}
