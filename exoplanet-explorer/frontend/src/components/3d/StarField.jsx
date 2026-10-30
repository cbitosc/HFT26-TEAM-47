import { Stars } from '@react-three/drei'

export default function StarField() {
  return <Stars radius={90} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />
}
