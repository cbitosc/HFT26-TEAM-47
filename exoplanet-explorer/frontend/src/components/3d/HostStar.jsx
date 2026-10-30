import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { STAR_RADIUS } from './scaling.js'

// Illustrative star: tint from NASA's st_teff when known, otherwise a default warm colour.
export default function HostStar({ color }) {
  const mesh = useRef()
  useFrame((_, dt) => { mesh.current.rotation.y += Math.min(dt, 0.1) * 0.05 })

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[STAR_RADIUS, 32, 24]} />
        {/* black base + emissive keeps the displayed colour equal to the tint instead of washing out to white */}
        <meshStandardMaterial color="#000000" emissive={color} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {/* subtle glow shells */}
      <mesh scale={1.18}>
        <sphereGeometry args={[STAR_RADIUS, 24, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[STAR_RADIUS, 24, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={3} decay={0} />
    </group>
  )
}
