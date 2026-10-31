import { Component, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { MonitorOff } from 'lucide-react'
import HostStar from './HostStar.jsx'
import Exoplanet from './Exoplanet.jsx'
import OrbitalPath from './OrbitalPath.jsx'
import StarField from './StarField.jsx'
import GalaxyField from './GalaxyField.jsx'
import HostMarkers from './HostMarkers.jsx'
import SceneControls from './SceneControls.jsx'
import CameraDirector from './CameraDirector.jsx'
import { buildPlanetScene, buildSystemScene, buildEmptyScene, slug } from '../../utils/systems.js'
import { SYSTEM_SCALE } from '../../utils/galaxy.js'
import { orbitSpeedFactor } from './scaling.js'

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const Fallback = ({ text = '3D visualization needs WebGL, which is unavailable in this browser.' }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-300">
    <MonitorOff className="h-7 w-7 text-slate-400" />
    {text}
  </div>
)

class SceneErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Fallback text="The 3D scene hit an error." /> : this.props.children }
}

// The view a request belongs to: 'galaxy' (Milky Way overview), a star system id, or 'pending' while its data loads.
const keyOf = (r) => {
  if (r.mode === 'galaxy') return 'galaxy'
  if (r.mode === 'planet') return r.planet ? slug(r.planet.host_star ?? r.planet.id) : 'pending'
  return r.system?.id ?? 'pending'
}
const NONE = { mode: 'galaxy', planet: undefined, system: undefined } // no planetary system drawn
const ZERO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 }
const DEFAULT_SETTINGS = { starfield: true, galaxy: true, paths: true, labels: true, motion: true, quality: 'high' }

const sceneOf = (r) => {
  if (r.mode === 'planet' && r.planet) return buildPlanetScene(r.planet)
  if (r.mode === 'system' && r.system) return buildSystemScene(r.system)
  return buildEmptyScene()
}

/** Shifts the projection so the scene is centred in the screen area not covered by UI panels. */
function ViewInsets({ insets }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    camera.setViewOffset(size.width, size.height, -(insets.left - insets.right) / 2, -(insets.top - insets.bottom) / 2, size.width, size.height)
    return () => camera.clearViewOffset()
  }, [camera, size.width, size.height, insets.left, insets.right, insets.top, insets.bottom])
  return null
}

/** The active system grows in from nothing when it is created, instead of popping into existence. */
function Reveal({ position, children }) {
  const group = useRef()
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt / 0.8)
    const e = 1 - (1 - t.current) ** 3
    group.current?.scale.setScalar(Math.max(1e-6, SYSTEM_SCALE * e))
  })
  return <group ref={group} position={position} name="active-system" scale={1e-6}>{children}</group>
}

/**
 * One full-screen canvas. Scene content, back to front:
 *   backdrop stars -> the Milky Way (illustrative structure) -> a marker for every known host system (NASA positions)
 *   -> the ONE selected planetary system, drawn at its host star's position (at an illustrative scale).
 * The camera director moves between the Milky Way overview and systems; see CameraDirector.
 */
const UniverseCanvas = forwardRef(function UniverseCanvas({
  mode, planet, system, systems = [], places = {}, settings = DEFAULT_SETTINGS, insets = ZERO_INSETS,
  onSelectSystem, onSelectPlanet, onSceneInfo, onTravel, onView,
}, ref) {
  const controls = useRef()
  const [ready, setReady] = useState(false)
  const [highlighted, setHighlighted] = useState(true)
  const [busy, setBusy] = useState(false) // camera is travelling: OrbitControls are disabled
  const [phase, setPhase] = useState('idle')
  const travelling = useRef(false)
  const webgl = useMemo(webglAvailable, [])
  useImperativeHandle(ref, () => ({ reset: () => controls.current?.reset() }), [])

  // `request` is what the app wants; `shown` is the planetary system actually rendered (at most one).
  // A planet that belongs to a known system is shown INSIDE that system's scene (same canvas, same planets), with the
  // camera focused on it, so "back to system" restores exactly what was there. Otherwise fall back to a lone planet.
  const focusId = mode === 'planet' && planet && system?.planets.some((p) => p.id === planet.id) ? planet.id : null
  const effMode = focusId ? 'system' : mode
  const request = useMemo(() => ({ mode: effMode, planet, system }), [effMode, planet, system])
  const requestRef = useRef(request)
  requestRef.current = request
  const [shown, setShown] = useState(NONE)
  const requestKey = keyOf(request)
  const shownKey = shown.mode === 'galaxy' ? 'none' : keyOf(shown)
  useEffect(() => {
    // Same system, different view (system <-> planet): follow at once. Everything else is the director's call.
    if (!travelling.current && requestKey !== 'galaxy' && requestKey !== 'pending' && requestKey === shownKey) setShown(request)
  }, [request, requestKey, shownKey])

  const scene = useMemo(() => sceneOf(shown), [shown])
  const requestScene = useMemo(() => sceneOf(request), [request])
  const outers = useMemo(() => Object.fromEntries(systems.map((s) => [s.id, buildSystemScene(s).outer])), [systems])
  const outerOf = (key) => SYSTEM_SCALE * (key === requestKey ? requestScene.outer : key === shownKey ? scene.outer : (outers[key] ?? 10))
  const placeOf = (key) => places[key] ?? { x: 0, y: 0, z: 0 }
  const frameKey = `${shown.mode}:${(shown.mode === 'planet' ? shown.planet?.id : shown.system?.id) ?? 'none'}`
  const here = placeOf(shownKey)

  useEffect(() => { onSceneInfo?.(scene.estimated) }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  const bodies = useRef(new Map()) // planet id -> its orbiting group (for the focus camera)
  const registerBody = useCallback((id, g) => { g ? bodies.current.set(id, g) : bodies.current.delete(id) }, [])
  const getFocusFrame = (id) => {
    const g = bodies.current.get(id)
    const b = scene.bodies.find((x) => x.id === id)
    if (!g || !b) return null
    return { target: g.getWorldPosition(new Vector3()), star: new Vector3(here.x, here.y, here.z), radius: b.size * SYSTEM_SCALE }
  }
  const hideOthers = !!focusId && phase === 'focused'

  const handleClick = (b) => () => {
    if (focusId) return
    if (shown.mode === 'planet') setHighlighted((h) => !h)
    else onSelectPlanet?.(b.id)
  }

  return (
    <div className="fixed inset-0 z-0 bg-space-950" data-phase={phase}>
      {!webgl ? <Fallback /> : (
        <SceneErrorBoundary>
          <Canvas dpr={[1, 2]} camera={{ fov: 50, near: 0.0005, far: 4000, position: [0, 120, 260] }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ scene: s, camera }) => {
              setReady(true)
              if (import.meta.env.DEV) Object.assign(window, { __scene: s, __camera: camera }) // dev-only test hooks
            }}>
            <color attach="background" args={['#02040b']} />
            <ambientLight intensity={0.32} />
            {settings.starfield && <StarField quality={settings.quality} />}
            {settings.galaxy && <GalaxyField quality={settings.quality} />}
            {systems.length > 0 && (
              <HostMarkers systems={systems} places={places} selectedId={requestKey === 'galaxy' ? null : requestKey}
                hiddenId={shownKey === 'none' ? null : shownKey} onSelect={onSelectSystem} />
            )}
            {/* Only the selected planetary system is rendered, at its host star's position. */}
            {shownKey !== 'none' && (
              <Reveal key={shownKey} position={[here.x, here.y, here.z]}>
                <HostStar star={scene.star} paused={!settings.motion} />
                {scene.bodies.map((b) => (
                  <group key={`${shown.mode}:${b.id}`} visible={!hideOthers || b.id === focusId}>
                    {settings.paths && !focusId && <OrbitalPath radius={b.orbitRadius} dashed={b.estimatedOrbit} />}
                    <Exoplanet id={b.id} type={b.type} size={b.size} orbitRadius={b.orbitRadius} orbitSeconds={b.orbitSeconds}
                      phase={b.phase} tint={b.tint} ring={b.ring} paused={!settings.motion} speed={orbitSpeedFactor(settings.orbitSpeed)}
                      label={shown.mode === 'planet' || focusId || !settings.labels ? null : b.label}
                      focused={b.id === focusId} register={registerBody}
                      highlighted={shown.mode === 'planet' && highlighted} onClick={handleClick(b)} />
                  </group>
                ))}
              </Reveal>
            )}
            <ViewInsets insets={insets} />
            <SceneControls ref={controls} enabled={!busy} />
            <CameraDirector controlsRef={controls} frameKey={frameKey} requestKey={requestKey} shownKey={shownKey}
              outerOf={outerOf} placeOf={placeOf} insets={insets} focusId={focusId} getFocusFrame={getFocusFrame}
              onLoad={() => setShown(requestRef.current)} onUnload={() => setShown(NONE)} onBusy={setBusy} onPhase={setPhase} onView={onView}
              onTravel={(v) => { travelling.current = v; onTravel?.(v) }} />
          </Canvas>
        </SceneErrorBoundary>
      )}
      {webgl && !ready && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">Preparing the Milky Way…</div>}
    </div>
  )
})

export default UniverseCanvas
