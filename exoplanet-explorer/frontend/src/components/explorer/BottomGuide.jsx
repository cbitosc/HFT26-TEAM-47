import { AnimatePresence, motion } from 'framer-motion'
import { Orbit, RotateCcw } from 'lucide-react'


export default function BottomGuide({ view, detail = false, travelling, label, note, onMilkyWay, onReset }) {
  const status = travelling ? 'Travelling' : detail ? 'Planet view' : view === 'galaxy' ? 'Milky Way view' : 'Star system view'
  const where = label ? (travelling ? ` to ${label}` : ` · ${label}`) : ''
  return (
    <div className="glass-lite pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-1.5 !rounded-full px-5 py-2.5 text-xs text-slate-300">
      <span className="caps inline-flex items-center gap-2 text-slate-200">
        <i className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={status + where} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }} className="max-w-[46vw] truncate">
            {status}{where}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="caps hidden text-slate-400 md:inline">Navigation</span>
      <span className="hidden md:inline">{detail ? 'Drag to rotate the view' : 'Drag to orbit'}</span>
      <span className="hidden md:inline">Scroll to zoom</span>
      {!detail && <span className="hidden lg:inline">Select a world to inspect</span>}
      <span className="hidden text-slate-500 xl:inline">{note}</span>
      <span className="flex items-center gap-1.5">
        {view !== 'galaxy' && !travelling && !detail && (
          <button className="glass-btn px-3 py-1 text-xs" onClick={onMilkyWay}><Orbit className="h-3 w-3" /> Milky Way</button>
        )}
        <button className="glass-btn px-3 py-1 text-xs" onClick={onReset}><RotateCcw className="h-3 w-3" /> Reset</button>
      </span>
    </div>
  )
}
