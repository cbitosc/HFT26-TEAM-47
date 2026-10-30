import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { RotateCcw } from 'lucide-react'

// Camera controls (rotate / zoom / pan, mouse + touch). Re-frames the camera when the system's
// size changes, so "Reset view" always returns to a sensible view of the current planet.
const SceneControls = forwardRef(function SceneControls({ orbitRadius }, ref) {
  const controls = useRef()
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const d = orbitRadius * 2.1 + 3
    camera.position.set(0, d * 0.45, d)
    controls.current.target.set(0, 0, 0)
    controls.current.update()
    controls.current.saveState()
  }, [orbitRadius, camera])

  useImperativeHandle(ref, () => ({
    reset: () => {
      const c = controls.current
      if (!c) return
      // Flush any damping momentum first so the view lands exactly on the saved state.
      c.enableDamping = false
      c.update()
      c.reset()
      c.enableDamping = true
    },
  }), [])

  return (
    <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08}
      minDistance={3} maxDistance={60} enablePan zoomSpeed={0.8} />
  )
})

export default SceneControls

export function ResetViewButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-space-900/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur hover:border-cyan-300/40 hover:text-white">
      <RotateCcw className="h-3.5 w-3.5" /> Reset view
    </button>
  )
}
