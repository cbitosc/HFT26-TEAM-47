import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import Toggle from './ui/Toggle.jsx'
import SegmentedControl from './ui/SegmentedControl.jsx'
import { useUniverseSettings } from '../context/UniverseSettings.jsx'

const TOGGLES = [
  ['starfield', 'Starfield'],
  ['galaxy', 'Galaxy visualization'],
  ['paths', 'Orbital paths'],
  ['labels', 'Planet labels'],
  ['motion', 'Planetary motion'],
]
const SPEEDS = [{ id: 'slow', label: 'Slow' }, { id: 'normal', label: 'Normal' }, { id: 'fast', label: 'Fast' }]
const QUALITY = [{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]

// Hidden until opened from the navbar. Visualization toggles, orbit speed, quality and camera reset. Page links live in the navbar.
export default function ControlsPanel({ open, onClose, explorer }) {
  const { settings, setSetting, cameraReset } = useUniverseSettings()
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onDown = (e) => { if (box.current && !box.current.contains(e.target) && !e.target.closest('[aria-haspopup="dialog"]')) onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={box} role="dialog" aria-label="Controls"
          initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.16 }}
          className="glass-lite absolute right-0 top-full z-50 mt-3 w-[min(300px,calc(100vw-1.5rem))] p-4">
          {explorer && (
            <>
              <div className="caps mb-2 text-slate-400">Visualization</div>
              {TOGGLES.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between border-b border-white/[0.07] py-2 text-sm">
                  <span>{label}</span>
                  <Toggle checked={settings[key]} onChange={(v) => setSetting(key, v)} label={label} />
                </div>
              ))}
              <div className="caps mb-2 mt-4 text-slate-400">Orbit speed</div>
              <SegmentedControl label="Orbit speed" items={SPEEDS} value={settings.orbitSpeed} onChange={(v) => setSetting('orbitSpeed', v)} fill />
              <div className="caps mb-2 mt-4 text-slate-400">Quality</div>
              <SegmentedControl label="Visualization quality" items={QUALITY} value={settings.quality} onChange={(v) => setSetting('quality', v)} fill />
              <button className="glass-btn mt-4 w-full py-2 text-xs" onClick={() => { cameraReset.current?.(); onClose() }}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset camera
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
