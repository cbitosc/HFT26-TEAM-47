import { Component, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { MonitorOff } from 'lucide-react'
import HostStar from './HostStar.jsx'
import Exoplanet from './Exoplanet.jsx'
import OrbitalPath from './OrbitalPath.jsx'
import StarField from './StarField.jsx'
import SceneControls, { ResetViewButton } from './SceneControls.jsx'
import PlanetInfoOverlay from '../planet/PlanetInfoOverlay.jsx'
import { getSceneParams } from './scaling.js'

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

class SceneErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Fallback text="The 3D scene hit an error." /> : this.props.children }
}

const Fallback = ({ text = '3D visualization needs WebGL, which is unavailable in this browser.' }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-400">
    <MonitorOff className="h-7 w-7 text-slate-500" />
    {text}
  </div>
)

export default function PlanetaryScene({ planet }) {
  const controls = useRef()
  const [ready, setReady] = useState(false)
  const [highlighted, setHighlighted] = useState(true)
  const webgl = useMemo(webglAvailable, [])
  const params = useMemo(() => getSceneParams(planet), [planet])

  return (
    <div className="relative h-[440px] overflow-hidden rounded-2xl border border-white/5 bg-space-950 sm:h-[560px]">
      {!webgl ? <Fallback /> : (
        <SceneErrorBoundary>
          <Canvas dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 300, position: [0, 6, 14] }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ scene, camera }) => {
              setReady(true)
              if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __camera: camera }) // dev-only test hooks
            }}>
            <color attach="background" args={['#04050b']} />
            <ambientLight intensity={0.15} />
            <StarField />
            <HostStar color={params.starColor} />
            <OrbitalPath radius={params.orbitRadius} dashed={params.estimated.orbit} />
            <Exoplanet id={planet.id} type={params.type} size={params.planetSize}
              orbitRadius={params.orbitRadius} orbitSeconds={params.orbitSeconds}
              highlighted={highlighted} onToggle={() => setHighlighted((h) => !h)} />
            <SceneControls ref={controls} orbitRadius={params.orbitRadius} />
          </Canvas>
        </SceneErrorBoundary>
      )}

      {webgl && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-space-950 text-sm text-slate-400">
          Preparing 3D scene…
        </div>
      )}
      {webgl && <PlanetInfoOverlay planet={planet} params={params} />}
      {webgl && (
        <div className="absolute right-3 top-3">
          <ResetViewButton onClick={() => controls.current?.reset()} />
        </div>
      )}
      <p className="pointer-events-none absolute inset-x-3 bottom-2 text-[10px] leading-tight text-slate-500">
        3D visualization is an illustrative representation. Planetary appearance, dimensions and orbital distances are not shown to scale.
      </p>
    </div>
  )
}
