import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import StellarSurface from './StellarSurface.jsx'
import StellarCorona, { StellarProminences } from './StellarCorona.jsx'
import StellarGlow from './StellarGlow.jsx'
import { starVisuals } from '../../utils/stellarScaling.js'

const lerp = (a, b, k) => a + (b - a) * k
const lerpArr = (cur, target, k) => { for (let i = 0; i < cur.length; i++) cur[i] = lerp(cur[i], target[i], k) }

/**
 * The host star, composed from its real NASA measurements (see utils/stellarScaling.js):
 *   colour <- effective temperature   size <- stellar radius   brightness / corona / light <- luminosity
 * Layers: procedural surface (granulation, plasma flow, illustrative spots), tight limb glow, outer corona, and a few
 * decorative prominence loops. ONE animation loop updates every uniform. If the star's properties change while it is
 * mounted, colour, brightness and size are interpolated rather than switched in a single frame.
 *
 * The surface patterns and prominences are procedural illustrations, not observed features of this particular star.
 */
export default function HostStar({ star, paused = false }) {
  const visuals = useMemo(() => star ?? starVisuals(null), [star])
  const target = useRef(visuals)
  target.current = visuals

  const group = useRef(), billboard = useRef(), light = useRef()
  const surface = useRef(), corona = useRef(), glow = useRef(), loops = useRef([])
  const time = useRef(0)
  const cur = useRef({
    base: [...visuals.base], hot: [...visuals.hot], cool: [...visuals.cool], glow: [...visuals.glow], corona: [...visuals.corona],
    scale: visuals.radiusScale, emissive: visuals.emissive, light: visuals.light, strength: visuals.coronaStrength,
    activity: visuals.activity, contrast: visuals.granuleContrast,
  })

  useFrame(({ camera }, dt) => {
    const t = target.current, c = cur.current
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3) // smooth approach, independent of frame rate
    lerpArr(c.base, t.base, k); lerpArr(c.hot, t.hot, k); lerpArr(c.cool, t.cool, k); lerpArr(c.glow, t.glow, k); lerpArr(c.corona, t.corona, k)
    c.scale = lerp(c.scale, t.radiusScale, k); c.emissive = lerp(c.emissive, t.emissive, k); c.light = lerp(c.light, t.light, k)
    c.strength = lerp(c.strength, t.coronaStrength, k); c.activity = lerp(c.activity, t.activity, k); c.contrast = lerp(c.contrast, t.granuleContrast, k)
    if (!paused) time.current += Math.min(dt, 0.1) // "planetary motion" off also freezes the surface

    group.current.scale.setScalar(c.scale)
    billboard.current.quaternion.copy(camera.quaternion) // corona, glow and loops always face the camera

    const s = surface.current?.uniforms
    if (s) {
      s.uTime.value = time.current; s.uSeed.value = t.seed; s.uIntensity.value = c.emissive
      s.uActivity.value = c.activity; s.uContrast.value = c.contrast
      s.uBase.value.setRGB(...c.base); s.uHot.value.setRGB(...c.hot); s.uCool.value.setRGB(...c.cool)
    }
    const co = corona.current?.uniforms
    if (co) { co.uTime.value = time.current; co.uStrength.value = c.strength; co.uColor.value.setRGB(...c.corona) }
    const gl = glow.current?.uniforms
    if (gl) { gl.uStrength.value = c.strength; gl.uColor.value.setRGB(...c.glow) }
    if (light.current) { light.current.intensity = c.light; light.current.color.setRGB(...c.glow) }
    loops.current.forEach((l, i) => { if (l?.material) l.material.opacity = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(time.current * 0.5 + i * 2.1)) })
  })

  return (
    <group ref={group} name="host-star" scale={visuals.radiusScale}>
      <StellarSurface materialRef={surface} visuals={visuals} />
      <group ref={billboard}>
        <StellarGlow materialRef={glow} visuals={visuals} />
        <StellarCorona materialRef={corona} visuals={visuals} />
        <StellarProminences visuals={visuals} lineRefs={loops} />
      </group>
      <pointLight ref={light} color="#ffffff" intensity={visuals.light} decay={0} />
    </group>
  )
}
