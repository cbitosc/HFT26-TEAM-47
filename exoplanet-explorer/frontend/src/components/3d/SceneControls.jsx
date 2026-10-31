import { forwardRef, useImperativeHandle, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { RotateCcw } from 'lucide-react'
import { MAX_VIEW_DISTANCE } from './framing.js'




const SceneControls = forwardRef(function SceneControls({ enabled = true }, ref) {
  const controls = useRef()

  useImperativeHandle(ref, () => ({
    instance: () => controls.current,
    reset: () => {
      const c = controls.current
      if (!c || !c.enabled) return

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
