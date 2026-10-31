import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, PanelRightOpen } from 'lucide-react'
import UniverseCanvas from '../components/3d/UniverseCanvas.jsx'
import IndexPanel from '../components/explorer/IndexPanel.jsx'
import PlanetDetailPanel from '../components/explorer/PlanetDetailPanel.jsx'
import SystemDetail from '../components/explorer/SystemDetail.jsx'
import BottomGuide from '../components/explorer/BottomGuide.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import { ErrorBox } from '../components/States.jsx'
import { useApi } from '../api.js'
import { LAST_PLANET_KEY } from '../hooks/useAstronomerChat.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { useUniverseSettings } from '../context/UniverseSettings.jsx'
import { INITIAL_FILTERS, filterAndSort, planetFlags } from '../utils/explorerFilters.js'
import { groupSystems, slug } from '../utils/systems.js'
import { systemPosition } from '../utils/galaxy.js'
import { classifyPlanetSize } from '../utils/habitabilityCalculations.js'

const ZERO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 }
const SHEETS = [{ id: 'index', label: 'Index' }, { id: 'details', label: 'Details' }, { id: 'hidden', label: 'Hide' }]

function NotFound({ what, id }) {
  return (
    <div className="glass p-6 text-center">
      <p className="font-medium">{what} “{id}” was not found.</p>
      <Link to="/" className="mt-2 inline-block text-sky-200 hover:underline">Back to the Milky Way</Link>
    </div>
  )
}

const BackButton = ({ onClick }) => (
  <button className="glass-btn px-4 py-2 text-xs" onClick={onClick}><ArrowLeft className="h-3.5 w-3.5" /> Back to System</button>
)


function PlanetCaption({ planet }) {
  const size = classifyPlanetSize(planet.radius_earth)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="pb-1">
      <p className="caps text-slate-300">{[size?.label, planet.host_star && `${planet.host_star} system`].filter(Boolean).join(' · ')}</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{planet.name}</h2>
      <p className="mt-1 text-xs text-slate-400">Illustrative texture generated from the planet type, not a photograph.</p>
    </motion.div>
  )
}






export default function Explorer() {
  const all = useApi('/planets')
  const featured = useApi('/planets/featured')
  const navigate = useNavigate()
  const { search } = useLocation()
  const [params, setParams] = useSearchParams()
  const planetId = useMatch('/planet/:id')?.params.id
  const systemRouteId = useMatch('/system/:id')?.params.id
  const mode = planetId ? 'planet' : systemRouteId ? 'system' : 'galaxy'
  const mobile = useMediaQuery('(max-width: 1023px)')
  const { settings, cameraReset } = useUniverseSettings()

  const [tab, setTab] = useState('systems')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [sheet, setSheet] = useState('hidden')
  const [rightOpen, setRightOpen] = useState(true)
  const [sceneInfo, setSceneInfo] = useState({})
  const [view, setView] = useState('galaxy')
  const [travelling, setTravelling] = useState(false)
  const [insets, setInsets] = useState(ZERO_INSETS)
  const scene = useRef(null)
  const dock = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)

  const planets = all.data?.planets
  const flags = useMemo(() => Object.fromEntries((planets ?? []).map((p) => [p.id, planetFlags(p)])), [planets])
  const methods = useMemo(() => [...new Set((planets ?? []).map((p) => p.discovery_method).filter(Boolean))].sort(), [planets])
  const query = params.get('q') ?? ''
  const setQuery = (v) => { const next = new URLSearchParams(params); v ? next.set('q', v) : next.delete('q'); setParams(next, { replace: true }) }
  const visible = useMemo(() => (planets ? filterAndSort(planets, flags, query, filters) : []), [planets, flags, query, filters])
  const systems = useMemo(() => groupSystems(planets ?? []), [planets])

  const places = useMemo(() => Object.fromEntries(systems.map((s) => [s.id, systemPosition(s)])), [systems])
  const visibleSystems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? systems.filter((s) => s.host.toLowerCase().includes(q) || s.planets.some((p) => p.name.toLowerCase().includes(q))) : systems
  }, [systems, query])

  const planet = planets?.find((p) => p.id === planetId)
  const systemId = systemRouteId ?? (planet?.host_star ? slug(planet.host_star) : undefined)
  const system = systems.find((s) => s.id === systemId)
  const hasDetails = mode !== 'galaxy'
  const detail = mode === 'planet' && !!planet

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => { cameraReset.current = () => scene.current?.reset(); return () => { cameraReset.current = null } }, [cameraReset])


  useEffect(() => {
    if (!detail) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.closest?.('[role="dialog"]')) return
      if (document.querySelector('nav[aria-label="Planet sections"] ul')) return
      backToSystem()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!planet) return
    try { sessionStorage.setItem(LAST_PLANET_KEY, planet.id) } catch {  }
  }, [planet?.id])


  useEffect(() => {
    const set = () => document.documentElement.style.setProperty('--dock-h', `${dock.current.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(dock.current)
    return () => ro.disconnect()
  }, [])


  useEffect(() => {
    const measure = () => {
      let next = ZERO_INSETS
      const navBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0
      const r = rightRef.current?.getBoundingClientRect()
      if (mobile) {

        if (detail && r) next = { left: 0, right: 0, top: Math.round(navBottom + 44), bottom: Math.round(innerHeight - r.top + 8) }
      } else if ((leftRef.current || r) && dock.current) {
        const l = leftRef.current?.getBoundingClientRect()
        const d = dock.current.getBoundingClientRect()
        const anchor = l ?? r
        const gap = Math.max(0, anchor.top - navBottom)
        next = {
          left: l ? Math.round(l.right + gap) : Math.round(gap), right: r ? Math.round(innerWidth - r.left + gap) : Math.round(gap),
          top: Math.round(anchor.top), bottom: Math.round(innerHeight - d.top + gap),
        }
      }
      setInsets((p) => (p.left === next.left && p.right === next.right && p.top === next.top && p.bottom === next.bottom ? p : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ;[leftRef, rightRef, dock].forEach((r) => r.current && ro.observe(r.current))
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [mobile, hasDetails, rightOpen, detail])

  const go = (pathname) => navigate({ pathname, search })
  const backToSystem = () => (planet?.host_star ? selectSystem(slug(planet.host_star)) : toMilkyWay())
  const selectPlanet = (id) => { go(`/planet/${id}`); setSheet('details') }
  const selectSystem = (id) => { go(`/system/${id}`); setSheet('details'); setRightOpen(true) }
  const toMilkyWay = () => { navigate({ pathname: '/', search }); setSheet('hidden') }
  const clearFilters = () => { setFilters(INITIAL_FILTERS); setQuery('') }

  const index = (
    <IndexPanel tab={tab} onTab={setTab} loading={all.loading} total={planets?.length ?? 0} planets={visible} systems={visibleSystems}
      query={query} onQuery={setQuery} filters={filters} setFilters={setFilters} methods={methods}
      featured={featured.data?.planets ?? []} featuredError={featured.error}
      selectedPlanetId={planetId} activeSystemId={systemId}
      onSelectPlanet={selectPlanet} onSelectSystem={selectSystem} onClear={clearFilters} systemIdOf={slug} onExplore={toMilkyWay} />
  )

  let details = null
  if (mode === 'planet') details = planet ? <PlanetDetailPanel planet={planet} onOpenSystem={backToSystem} /> : (all.data ? <NotFound what="Exoplanet" id={planetId} /> : null)
  else if (mode === 'system') details = system ? <SystemDetail system={system} onSelectPlanet={selectPlanet} /> : (all.data ? <NotFound what="Star system" id={systemRouteId} /> : null)

  const label = mode === 'planet' ? planet?.name : mode === 'system' ? system?.host : null
  const note = travelling ? 'Flying to the selected system'
    : mode === 'galaxy' ? 'Host-star positions from NASA coordinates · galaxy structure illustrative'
    : sceneInfo.orbit ? 'Orbit radius is an illustrative default: semi-major axis unavailable' : 'Orbits and sizes illustrative, not to scale'


  const panelBox = { top: 'calc(var(--topbar-h, 5rem) + var(--gap))', bottom: 'calc(var(--dock-h, 3.5rem) + 0.75rem + var(--gap))' }

  return (
    <main>
      <UniverseCanvas ref={scene} mode={mode} planet={planet} system={system} systems={systems} places={places} settings={settings} insets={insets}
        onSelectSystem={selectSystem} onSelectPlanet={selectPlanet} onSceneInfo={setSceneInfo} onTravel={setTravelling} onView={setView} />

      {all.error && <div className="fixed inset-x-0 z-20 px-[var(--edge)]" style={{ top: panelBox.top }}><ErrorBox error={all.error} /></div>}

      <div className="pointer-events-none fixed inset-x-0 z-20" style={panelBox}>
        <div className="mx-auto flex h-full max-w-[1600px] items-start gap-[var(--gap)] px-[var(--edge)]">
          {detail && mobile ? (
            <div className="mx-auto flex h-full w-full flex-col justify-between md:max-w-3xl">
              <div className="pointer-events-auto flex items-center justify-between gap-2"><BackButton onClick={backToSystem} /></div>
              <div ref={rightRef} className="pointer-events-auto flex h-[52dvh] min-h-0 flex-col">{details}</div>
            </div>
          ) : detail ? (
            <>
              <div className="pointer-events-none flex min-w-0 flex-1 flex-col justify-between self-stretch">
                <div className="pointer-events-auto self-start"><BackButton onClick={backToSystem} /></div>
                <PlanetCaption planet={planet} />
              </div>
              <motion.div key="planet-detail" ref={rightRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }}
                className="pointer-events-auto flex max-h-full min-h-0 w-[min(42vw,640px)] min-w-[400px] flex-none flex-col">
                {details}
              </motion.div>
            </>
          ) : mobile ? (
            <div className="pointer-events-auto mx-auto flex max-h-full min-h-0 w-full flex-col justify-end self-end md:max-w-xl [&>*]:max-h-full">
              {sheet === 'index' && index}
              {sheet === 'details' && details}
            </div>
          ) : (
            <>
              <div ref={leftRef} className="pointer-events-auto flex max-h-full min-h-0 w-[264px] flex-none flex-col">{index}</div>
              <div className="min-w-0 flex-1" />
              <AnimatePresence initial={false}>
                {hasDetails && rightOpen && (
                  <motion.div key="details" ref={rightRef} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}
                    className="pointer-events-auto relative flex max-h-full min-h-0 w-[320px] flex-none flex-col xl:w-[340px]">
                    {details}
                    <button className="glass-btn absolute -left-3 top-4 z-10 !h-7 !w-7 !p-0" onClick={() => setRightOpen(false)} aria-label="Collapse details panel"><ChevronRight className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              {hasDetails && !rightOpen && (
                <button className="glass-btn pointer-events-auto absolute right-[var(--edge)] top-0 px-3 py-2 text-xs" onClick={() => setRightOpen(true)}>
                  <PanelRightOpen className="h-3.5 w-3.5" /> Details
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div ref={dock} className={`pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 px-[var(--edge)] ${detail && mobile ? 'hidden' : ''}`}>
        {mobile && <div className="pointer-events-auto"><SegmentedControl label="Panels" items={SHEETS} value={sheet} onChange={setSheet} /></div>}
        <BottomGuide view={mode === 'galaxy' && !travelling ? 'galaxy' : view} detail={detail && !travelling} travelling={travelling} label={label} note={note}
          onMilkyWay={toMilkyWay} onReset={() => scene.current?.reset()} />
      </div>
    </main>
  )
}
