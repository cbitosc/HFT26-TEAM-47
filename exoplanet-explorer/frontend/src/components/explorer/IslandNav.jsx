import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const SPRING = { type: 'spring', stiffness: 420, damping: 34 }

/**
 * Compact "dynamic island" section navigator. Collapsed it is a small pill showing the section being read; it expands
 * (smoothly, via layout animation) into the full list of destinations and collapses again after a choice, on Escape
 * or a click outside. `items` = [{ id, label, icon }]; `active` follows the scroll position.
 */
export default function IslandNav({ items, active, onSelect, label = 'Sections' }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const current = items.find((i) => i.id === active) ?? items[0]

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open])

  if (!current) return null
  const CurrentIcon = current.icon
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-10 flex h-10 justify-center" ref={box}>
        <motion.nav layout transition={SPRING} aria-label={label} style={{ borderRadius: 22 }}
          className="absolute top-0 flex max-w-full items-center overflow-hidden border border-white/20 bg-[#0a1020]/80 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <AnimatePresence mode="popLayout" initial={false}>
            {open ? (
              <motion.ul key="open" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
                className="flex items-center gap-0.5 p-1">
                {items.map(({ id, label: text, icon: Icon }) => (
                  <li key={id} className="relative">
                    {id === active && (
                      <motion.span layoutId={`island-active-${label}`} transition={SPRING} className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/25" aria-hidden />
                    )}
                    <button type="button" onClick={() => { onSelect(id); setOpen(false) }} aria-current={id === active ? 'true' : undefined}
                      className={`relative inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors sm:px-3 ${id === active ? 'text-white' : 'text-slate-300 hover:text-white'}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden min-[420px]:inline">{text}</span>
                      <span className="sr-only min-[420px]:hidden">{text}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            ) : (
              <motion.button key="closed" layout="position" type="button" onClick={() => setOpen(true)} aria-expanded={false}
                aria-label={`${label}: ${current.label}. Open navigation`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
                className="inline-flex h-10 items-center gap-2 px-4 text-xs text-slate-100">
                <CurrentIcon className="h-3.5 w-3.5 text-cyan-200" aria-hidden />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={current.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}>
                    {current.label}
                  </motion.span>
                </AnimatePresence>
                <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>
    </MotionConfig>
  )
}
