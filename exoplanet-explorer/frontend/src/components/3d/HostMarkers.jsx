import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AdditiveBlending, Color } from 'three'
import { SUN_X, SUN_Y } from '../../utils/galaxy.js'
import { starColorFromTemp } from './scaling.js'

// One marker per known exoplanet host system, at its NASA-derived position. Only systems in the app's dataset appear.
const VERT = `
  attribute float aSel; attribute vec3 aColor; attribute float aShow;
  uniform float uPx; uniform float uTime; varying vec3 vColor; varying float vSel; varying float vShow;
  void main() {
    vColor = aColor; vSel = aSel; vShow = aShow;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float pulse = 1.0 + aSel * (1.6 + 0.25 * sin(uTime * 3.0));
    gl_PointSize = 9.0 * uPx * pulse;
  }`
const FRAG = `
  varying vec3 vColor; varying float vSel; varying float vShow;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = (1.0 - smoothstep(0.0, 0.32, d)) * 0.95;
    float halo = (1.0 - smoothstep(0.0, 1.0, d)) * 0.35;
    float ring = smoothstep(0.62, 0.7, d) * (1.0 - smoothstep(0.78, 0.86, d)) * vSel;
    vec3 col = mix(vColor, vec3(1.0, 0.86, 0.5), vSel);
    gl_FragColor = vec4(col, (core + halo + ring * 0.9) * vShow);
  }`

export default function HostMarkers({ systems, places, selectedId, hiddenId, onSelect }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const sun = useRef([SUN_X, SUN_Y, 0])
  const [hover, setHover] = useState(null)
  const uniforms = useMemo(() => ({ uPx: { value: dpr }, uTime: { value: 0 } }), [dpr])

  const geo = useMemo(() => {
    const n = systems.length
    const positions = new Float32Array(n * 3), colors = new Float32Array(n * 3)
    systems.forEach((s, i) => {
      const p = places[s.id]
      positions.set([p.x, p.y, p.z], i * 3)
      const c = new Color(starColorFromTemp(s.star_temperature_k))
      colors.set([c.r, c.g, c.b], i * 3)
    })
    return { n, positions, colors, sel: new Float32Array(n), show: new Float32Array(n).fill(1) }
  }, [systems, places])

  const selAttr = useRef(), showAttr = useRef()
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    // Picking radius follows the camera distance, so markers stay clickable at every zoom level.
    const d = Math.hypot(state.camera.position.x - sun.current[0], state.camera.position.y - sun.current[1], state.camera.position.z)
    state.raycaster.params.Points = { threshold: Math.max(0.0004, d * 0.012) }
    if (selAttr.current && showAttr.current) {
      systems.forEach((s, i) => {
        geo.sel[i] = s.id === selectedId ? 1 : 0
        geo.show[i] = s.id === hiddenId ? 0 : 1 // the system being drawn in detail replaces its own marker
      })
      selAttr.current.needsUpdate = true
      showAttr.current.needsUpdate = true
    }
  })

  const labelOf = (i) => (i != null && systems[i] ? systems[i] : null)
  const shown = [labelOf(hover), systems.find((s) => s.id === selectedId && s.id !== hiddenId)].filter(Boolean)

  return (
    <group name="host-markers">
      <points frustumCulled={false} renderOrder={3}
        onClick={(e) => { e.stopPropagation(); const s = systems[e.index]; if (s) onSelect?.(s.id) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(e.index); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(null); document.body.style.cursor = '' }}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={geo.positions} count={geo.n} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" array={geo.colors} count={geo.n} itemSize={3} />
          <bufferAttribute ref={selAttr} attach="attributes-aSel" array={geo.sel} count={geo.n} itemSize={1} />
          <bufferAttribute ref={showAttr} attach="attributes-aShow" array={geo.show} count={geo.n} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
      </points>
      {shown.map((s) => {
        const p = places[s.id]
        return (
          <Html key={s.id} position={[p.x, p.y, p.z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none', transform: 'translate(0,-26px)' }}>
            <span className="whitespace-nowrap rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-xs tracking-wider text-white backdrop-blur">
              {s.host}{p.source === 'illustrative' ? ' · illustrative position' : ''}
            </span>
          </Html>
        )
      })}
    </group>
  )
}
