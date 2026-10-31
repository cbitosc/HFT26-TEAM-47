import { forwardRef, useImperativeHandle, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { RotateCcw } from 'lucide-react'
import { MAX_VIEW_DISTANCE } from './framing.js'

// Camera controls (rotate / zoom / pan, mouse + touch). Framing and transitions are owned by CameraDirector;
// this component only wraps OrbitControls, can be disabled while the camera is travelling, and exposes
// `instance()` (for the director) and `reset()` ("Reset view").
const SceneControls = forwardRef(function SceneControls({ enabled = true }, ref) {
  const controls = useRef()

  useImperativeHandle(ref, () => ({
    instance: () => controls.current,
    reset: () => {
      const c = controls.current
      if (!c || !c.enabled) return // ignore while a transition is running
      // Flush any damping momentum first so the view lands exactly on the saved state.
      c.enableDamping = false
      c.update()
      c.reset()
      c.enableDamping = true
    },
  }), [])

  return (
    <OrbitControls ref={controls} makeDefault enabled={enabled} enableDamping dampingFactor={0.08}
      minDistance={0.001} maxDistance={MAX_VIEW_DISTANCE} enablePan zoomSpeed={0.8} />
  )
})

export default SceneControls

export function ResetViewButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="glass-btn px-3.5 py-2 text-xs">
      <RotateCcw className="h-3.5 w-3.5" /> Reset view
    </button>
  )
}
