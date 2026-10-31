import { useEffect, useMemo, useRef, useState } from 'react'
import { Orbit, Send, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import MessageBubble from './MessageBubble.jsx'
import { getSuggestions } from './suggestions.js'
import { useAstronomerChat } from '../../hooks/useAstronomerChat.js'
import { useApi } from '../../api.js'

const INTRO = 'Ask me about this planet, its host star, how it compares with Earth, or astronomy in general. I answer from NASA Exoplanet Archive data and say so when a measurement is unavailable.'

export default function AstronomerChat({ planet = null, height = 'h-[520px]' }) {
  const { messages, loading, send, retry, clear } = useAstronomerChat(planet)
  const status = useApi('/astronomer/status')
  const [input, setInput] = useState('')
  const scroller = useRef(null)
  const suggestions = useMemo(() => getSuggestions(planet), [planet])

  // Scroll only the chat box (not the page) to the latest message.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const planetId = planet?.id ?? null
  const last = messages[messages.length - 1]
  const contextChanged = last && last.planetId !== planetId
  const failedIndex = messages.findLastIndex((m) => m.error)
  const notConfigured = status.data && !status.data.configured

  const submit = (e) => {
    e.preventDefault()
    if (send(input)) setInput('')
  }

  return (
    <div className="panel flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
          <div>
            <h2 className="text-sm font-semibold tracking-wider">VIRTUAL ASTRONOMER</h2>
            <p className="text-xs text-slate-400">Your intelligent guide to worlds beyond our solar system.</p>
          </div>
        </div>
        <button onClick={clear} disabled={messages.length === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" /> New conversation
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-white/5 bg-space-950/40 px-4 py-2 text-xs">
        <Orbit className="h-3.5 w-3.5 text-cyan-300" />
        {planet
          ? <span>Currently exploring: <b className="text-white">{planet.name}</b></span>
          : <span className="text-slate-400">No planet selected: general astronomy mode</span>}
      </div>

      {notConfigured && (
        <div role="alert" className="flex items-start gap-2 border-b border-amber-300/20 bg-amber-300/5 px-4 py-2 text-xs text-amber-100/90">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          Virtual Astronomer is not configured on the backend yet (missing FEATHERLESS_API_KEY).
        </div>
      )}

      <div ref={scroller} className={`${height} space-y-4 overflow-y-auto px-4 py-4`} aria-live="polite">
        {messages.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-400">{INTRO}</p>}
        {messages.map((m, i) => (
          <div key={m.id} className="space-y-4">
            {(i === 0 || messages[i - 1].planetId !== m.planetId) && i > 0 && (
              <div className="flex items-center gap-2 text-xs text-cyan-200/70">
                <span className="h-px flex-1 bg-white/10" />
                Context changed: now about {m.planetName ?? 'general astronomy'}
                <span className="h-px flex-1 bg-white/10" />
              </div>
            )}
            <MessageBubble message={m} canRetry={i === failedIndex && !loading} onRetry={retry} />
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-6" role="status" aria-label="Virtual Astronomer is thinking">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-violet-300/80" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      {contextChanged && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-cyan-300/5 px-4 py-2 text-xs text-cyan-100/90">
          <span>
            You switched to <b>{planet?.name ?? 'general astronomy'}</b>. Earlier answers were about {last.planetName ?? 'general astronomy'}
            {' '}and are not used as context for new questions.
          </span>
          <button onClick={clear} className="rounded border border-cyan-200/30 px-2 py-0.5 hover:bg-cyan-200/10">Start fresh</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-white/5 px-4 py-3">
        {suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={loading}
            className="rounded-full border border-violet-300/20 bg-violet-400/5 px-3 py-1 text-xs text-violet-100 hover:bg-violet-400/15 disabled:opacity-40">
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/5 p-3">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} disabled={loading}
          placeholder={planet ? `Ask about ${planet.name}…` : 'Ask an astronomy question…'} aria-label="Message Virtual Astronomer" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send"
          className="flex items-center gap-1 rounded-lg bg-indigo-500 px-4 text-sm font-medium hover:bg-indigo-400 disabled:opacity-40">
          <Send className="h-4 w-4" /> <span className="hidden sm:inline">Send</span>
        </button>
      </form>
      <p className="px-4 pb-3 text-xs leading-snug text-slate-400">
        AI answers can contain mistakes. Planet measurements come from the NASA Exoplanet Archive; the habitability screening is educational and not a probability of life.
      </p>
    </div>
  )
}
