import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ATMOSPHERE, ROUGHNESS, createPlanetTexture } from './planetTexture.js'

// Renders one planet that orbits the origin. Size is applied via scale so changing planets
// does not rebuild geometry; the texture is regenerated only when type/id change and disposed after.
export default function Exoplanet({ id, type, size, orbitRadius, orbitSeconds, highlighted, onToggle }) {
  const orbit = useRef()
  const body = useRef()
  const angle = useRef(0)

  const texture = useMemo(() => createPlanetTexture(type, id), [type, id])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1)
    angle.current = (angle.current + (d * Math.PI * 2) / orbitSeconds) % (Math.PI * 2)
    orbit.current.position.set(Math.cos(angle.current) * orbitRadius, 0, Math.sin(angle.current) * orbitRadius)
    body.current.rotation.y += d * 0.6
  })

  const atmosphere = ATMOSPHERE[type]
  return (
    <group ref={orbit} scale={size}>
      <mesh ref={body} onClick={(e) => { e.stopPropagation(); onToggle?.() }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial map={texture} roughness={ROUGHNESS[type]} metalness={0} />
      </mesh>
      {atmosphere && (
        <mesh scale={1.06}>
          <sphereGeometry args={[1, 32, 20]} />
          <meshBasicMaterial color={atmosphere} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      {highlighted && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.35, 1.4, 48]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} side={2} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
