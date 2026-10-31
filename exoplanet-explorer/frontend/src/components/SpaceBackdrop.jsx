import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import StarField from './3d/StarField.jsx'
import GalaxyField from './3d/GalaxyField.jsx'
import { galaxyFrameSpherical } from './3d/framing.js'

function Drift() {
  const group = useRef()
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += Math.min(dt, 0.1) * 0.012 })
  return <group ref={group}><GalaxyField quality="medium" /></group>
}

const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }


export default function SpaceBackdrop() {
  const ok = useMemo(webgl, [])
  const position = useMemo(() => new Vector3().setFromSpherical(galaxyFrameSpherical({ fov: 50, aspect: 1.6, fx: 1, fy: 1 })).multiplyScalar(0.8).toArray(), [])
  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-space-950" aria-hidden>
      {ok ? (
        <Canvas dpr={[1, 1.5]} camera={{ fov: 50, near: 0.01, far: 4000, position }} gl={{ antialias: false, powerPreference: 'low-power' }}
          onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
          <color attach="background" args={['#02040b']} />
          <StarField quality="low" />
          <Drift />
        </Canvas>
      ) : <div className="ambient"><span /><span /><span /></div>}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_30%,rgba(2,4,11,0.55)_100%)]" />
    </div>
  )
}
