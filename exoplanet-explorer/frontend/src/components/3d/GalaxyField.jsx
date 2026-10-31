import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { AdditiveBlending, NormalBlending } from 'three'
import { generateGalaxy } from '../../utils/galaxy.js'

// Soft round points with per-point size, colour and alpha. Sizes are in screen pixels, so the galaxy keeps its
// look at every zoom level.
const VERT = `
  attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
  uniform float uPx; varying vec3 vColor; varying float vAlpha;
  void main() {
    vColor = aColor; vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx;
  }`
const FRAG = `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.0, 1.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }`

function Cloud({ data, additive = true, order = 0, dpr }) {
  const uniforms = useMemo(() => ({ uPx: { value: dpr } }), [dpr])
  return (
    <points renderOrder={order} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.positions} count={data.count} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" array={data.colors} count={data.count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={data.sizes} count={data.count} itemSize={1} />
        <bufferAttribute attach="attributes-aAlpha" array={data.alphas} count={data.count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} transparent depthWrite={false}
        blending={additive ? AdditiveBlending : NormalBlending} />
    </points>
  )
}

// A warm, soft glow over the galactic core (a few overlapping large sprites).
const GLOW = {
  count: 5,
  positions: new Float32Array(15),
  colors: new Float32Array([1, 0.84, 0.58, 1, 0.8, 0.52, 1, 0.9, 0.7, 1, 0.78, 0.5, 1, 0.9, 0.72]),
  sizes: new Float32Array([240, 170, 110, 60, 30]),
  alphas: new Float32Array([0.1, 0.12, 0.16, 0.22, 0.3]),
}

/**
 * Schematic Milky Way (see utils/galaxy.js: structure is illustrative). `quality` changes the particle counts.
 */
export default function GalaxyField({ quality = 'high' }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const galaxy = useMemo(() => generateGalaxy(quality), [quality])
  return (
    <group name="galaxy">
      <Cloud data={galaxy.stars} dpr={dpr} />
      <Cloud data={galaxy.nebulae} dpr={dpr} order={1} />
      <Cloud data={GLOW} dpr={dpr} order={1} />
      <Cloud data={galaxy.dust} dpr={dpr} additive={false} order={2} />
    </group>
  )
}
