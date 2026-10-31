import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'



export default function StarField({ quality = 'high' }) {
  const group = useRef()
  useFrame(({ camera }) => group.current?.position.copy(camera.position))
  const count = { low: 1800, medium: 3000, high: 4200 }[quality] ?? 4200
  return (
    <group ref={group}>
      <Stars radius={600} depth={200} count={count} factor={16} saturation={0} fade speed={0.3} />
    </group>
  )
}
