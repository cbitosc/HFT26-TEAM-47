import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ATMOSPHERE, ROUGHNESS, createPlanetTexture } from './planetTexture.js'

// One body orbiting the origin. Size is applied via scale so changing planets does not rebuild geometry;
// the texture is regenerated only when type/id change and disposed after.
export default function Exoplanet({
  id, type, size, orbitRadius, orbitSeconds, phase = 0, tint = '#ffffff', ring = false, label = null,
  highlighted = false, onClick, paused = false, speed = 1, focused = false, register,
}) {
  const orbit = useRef()
  const body = useRef()
  const angle = useRef(phase)

  // The detail view gets a larger texture, generated on first focus (just after the camera starts moving).
  const [hi, setHi] = useState(false)
  useEffect(() => {
    if (!focused || hi) return undefined
    const t = setTimeout(() => setHi(true), 60)
    return () => clearTimeout(t)
  }, [focused, hi])
  const texture = useMemo(() => (hi ? createPlanetTexture(type, id, 768, 384) : createPlanetTexture(type, id)), [type, id, hi])
  useEffect(() => { register?.(id, orbit.current); return () => register?.(id, null) }, [id, register])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_, dt) => {
    const d = paused ? 0 : Math.min(dt, 0.1) // "planetary motion" off freezes orbits and spin
    if (!focused) angle.current = (angle.current + (d * speed * Math.PI * 2) / orbitSeconds) % (Math.PI * 2) // the focused planet holds its place
    orbit.current.position.set(Math.cos(angle.current) * orbitRadius, 0, Math.sin(angle.current) * orbitRadius)
    body.current.rotation.y += focused ? d * 0.12 : d * 0.6 * Math.max(speed, 0.3) // slow spin in the detail view
  })

  const atmosphere = ATMOSPHERE[type] ?? (focused ? '#aab4c8' : null) // every planet gets a faint rim in the detail view
  return (
    <group ref={orbit} scale={size}>
      <mesh ref={body} onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial map={texture} color={tint} roughness={ROUGHNESS[type]} metalness={0} />
      </mesh>
      {atmosphere && (
        <mesh scale={1.06}>
          <sphereGeometry args={[1, 32, 20]} />
          <meshBasicMaterial color={atmosphere} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      {ring && (
        <mesh rotation={[Math.PI / 2.3, 0, 0.25]}>
          <ringGeometry args={[1.45, 2.4, 64]} />
          <meshBasicMaterial color="#d9c49c" transparent opacity={0.65} side={2} depthWrite={false} />
        </mesh>
      )}
      {highlighted && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.35, 1.4, 48]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} side={2} depthWrite={false} />
        </mesh>
      )}
      {label && (
        <Html position={[0, 1.9, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded-full border border-white/20 bg-black/35 px-2 py-0.5 text-xs text-white backdrop-blur">{label}</span>
        </Html>
      )}
    </group>
  )
}
