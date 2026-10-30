import { useMemo } from 'react'
import { Line } from '@react-three/drei'

// Circular illustrative orbit (NASA's eccentricity is not used). Dashed when the radius is a default.
export default function OrbitalPath({ radius, dashed = false }) {
  const points = useMemo(
    () => Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2
      return [Math.cos(a) * radius, 0, Math.sin(a) * radius]
    }),
    [radius],
  )
  return (
    <Line points={points} color="#8b9bff" lineWidth={1} transparent opacity={0.55}
      dashed={dashed} dashSize={0.3} gapSize={0.2} />
  )
}
