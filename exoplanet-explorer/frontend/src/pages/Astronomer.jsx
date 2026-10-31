import { useEffect, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import AstronomerChat from '../components/astronomer/AstronomerChat.jsx'
import PlanetPicker from '../components/PlanetPicker.jsx'
import { apiGet, useApi } from '../api.js'
import { LAST_PLANET_KEY } from '../hooks/useAstronomerChat.js'

const readLast = () => { try { return sessionStorage.getItem(LAST_PLANET_KEY) } catch { return null } }


export default function Astronomer() {
  const list = useApi('/planets')
  const [id, setId] = useState(readLast)
  const [planet, setPlanet] = useState(null)

  useEffect(() => {
    if (!id) { setPlanet(null); return undefined }
    let alive = true
    apiGet(`/planets/${encodeURIComponent(id)}`).then((p) => alive && setPlanet(p)).catch(() => alive && setPlanet(null))
    return () => { alive = false }
  }, [id])

  const general = (
    <button className={`idx-row mb-1 ${id ? '' : 'idx-row-active'}`} aria-current={!id} onClick={() => setId(null)}>
      <MessageCircleQuestion className="h-[26px] w-[26px] flex-none text-slate-300" strokeWidth={1.5} aria-hidden />
      <span className="min-w-0 flex-1"><strong className="block text-sm font-normal">General astronomy</strong><small className="block text-xs text-slate-400">No planet context</small></span>
    </button>
  )

  return (
    <main className="mx-auto flex max-w-[1600px] flex-col gap-[var(--gap)] px-[var(--edge)] pb-[var(--gap)] lg:h-[calc(100dvh_-_var(--topbar-h,5rem))] lg:flex-row">
      <PlanetPicker title="Planet context" subtitle="Ask about" planets={list.data?.planets} loading={list.loading} error={list.error}
        activeIds={id ? [id] : []} onPick={(pid) => setId(pid === id ? null : pid)} top={general} className="max-h-72 lg:max-h-none lg:w-[264px] lg:flex-none" />
      <section className="glass flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5" aria-label="Virtual Astronomer">
        <p className="caps text-slate-400">Grounded in the NASA data you are exploring</p>
        <h1 className="mb-4 mt-1 text-2xl font-semibold tracking-tight">Virtual Astronomer</h1>
        <AstronomerChat planet={planet} height="h-[360px] lg:h-[calc(100dvh_-_var(--topbar-h,5rem)_-_17rem)] lg:min-h-[240px]" />
      </section>
    </main>
  )
}
