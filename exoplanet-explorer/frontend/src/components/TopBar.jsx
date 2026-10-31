import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Compass, Gamepad2, GitCompare, History, SlidersHorizontal, Sparkle, Sparkles } from 'lucide-react'
import IslandNav from './explorer/IslandNav.jsx'
import ControlsPanel from './ControlsPanel.jsx'

const PAGES = [
  { id: '/', label: 'Explore', icon: Compass },
  { id: '/compare', label: 'Compare', icon: GitCompare },
  { id: '/astronomer', label: 'AI Astronomer', icon: Sparkles },
  { id: '/timeline', label: 'Timeline', icon: History },
  { id: '/game', label: 'Game', icon: Gamepad2 },
]

// Minimal, transparent navbar: brand (left), page navigation island (centre), Controls (right). Page links live in the Controls panel.
export default function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const bar = useRef(null)
  const [open, setOpen] = useState(false)
  const page = pathname.startsWith('/compare') ? '/compare' : pathname.startsWith('/astronomer') ? '/astronomer' : pathname.startsWith('/timeline') ? '/timeline' : pathname.startsWith('/game') ? '/game' : '/'
  const explorer = pathname === '/' || pathname.startsWith('/planet') || pathname.startsWith('/system')

  // Publish the bar's bottom edge so full-screen panels can sit a consistent gap below it.
  useLayoutEffect(() => {
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${Math.round(bar.current.getBoundingClientRect().bottom)}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(bar.current)
    return () => ro.disconnect()
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-[#02040b]/85 via-[#02040b]/40 to-transparent">
      <div ref={bar} className="pointer-events-auto relative mx-auto grid max-w-[1600px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-[var(--edge)] py-3 sm:grid-cols-[1fr_auto_1fr]">
        <Link to="/" className="flex min-w-0 items-center gap-3 justify-self-start" aria-label="exoverse: back to the Milky Way">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-[14px] bg-gradient-to-br from-sky-200 via-sky-400 to-violet-500 shadow-[0_4px_16px_rgba(90,120,255,0.35),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <Sparkle className="h-[18px] w-[18px] text-[#0b1530]" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-2xl font-bold leading-none tracking-tight lg:text-[32px]">exoverse</span>
        </Link>

        <div className="order-last col-span-2 h-10 w-full sm:order-none sm:col-span-1 sm:w-[clamp(240px,36vw,460px)]">
          <IslandNav label="Pages" items={PAGES} active={page} onSelect={(to) => navigate(to)} />
        </div>

        {explorer && <div className="relative justify-self-end">
          <button className="glass-btn px-4 py-2 text-xs" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Controls
          </button>
          <ControlsPanel open={open} onClose={() => setOpen(false)} explorer />
        </div>}
      </div>
    </header>
  )
}
