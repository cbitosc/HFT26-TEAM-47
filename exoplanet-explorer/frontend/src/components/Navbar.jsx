import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Orbit, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Explore' },
  { to: '/compare', label: 'Compare' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Explore always lands on the catalogue.
  const onExplore = (e) => {
    setOpen(false)
    if (pathname === '/') {
      e.preventDefault()
      document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      e.preventDefault()
      navigate('/#catalogue')
    }
  }

  const cls = ({ isActive }) =>
    `text-sm transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-space-950/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.2em]">
          <Orbit className="h-5 w-5 text-indigo-400" />
          EXOPLANET EXPLORER
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/" end className={cls} onClick={onExplore}>Explore</NavLink>
          {links.slice(1).map((l) => (
            <NavLink key={l.to} to={l.to} className={cls}>{l.label}</NavLink>
          ))}
        </div>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div className="flex flex-col gap-4 border-t border-white/5 px-4 py-4 md:hidden">
          <NavLink to="/" end className={cls} onClick={onExplore}>Explore</NavLink>
          {links.slice(1).map((l) => (
            <NavLink key={l.to} to={l.to} className={cls} onClick={() => setOpen(false)}>{l.label}</NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
