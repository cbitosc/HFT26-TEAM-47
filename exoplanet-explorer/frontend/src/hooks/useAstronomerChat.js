import { useCallback, useEffect, useRef, useState } from 'react'
import { apiPost } from '../api.js'


const KEY = 'virtual-astronomer-chat-v1'
export const LAST_PLANET_KEY = 'virtual-astronomer-last-planet'
const MAX_STORED = 40
const HISTORY_TURNS = 8

const load = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY)) ?? [] } catch { return [] }
}
const save = (messages) => {
  try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX_STORED))) } catch {  }
}

let nextId = Date.now()


export function useAstronomerChat(planet) {
  const [messages, setMessages] = useState(load)
  const [loading, setLoading] = useState(false)
  const abort = useRef(null)
  const planetId = planet?.id ?? null

  useEffect(() => save(messages), [messages])
  useEffect(() => () => abort.current?.abort(), [])

  const request = useCallback(async (userMsg, prior) => {
    const history = prior
      .filter((m) => m.planetId === planetId && !m.error)
      .slice(-HISTORY_TURNS)
      .map(({ role, content }) => ({ role, content }))
    const controller = new AbortController()
    abort.current = controller
    setLoading(true)
    try {
      const data = await apiPost('/astronomer/chat', { message: userMsg.content, planet_id: planetId, history }, controller.signal)
      setMessages((ms) => [...ms, {
        id: ++nextId, role: 'assistant', content: data.reply, planetId, planetName: planet?.name ?? null,
        compared: data.compared_planet_ids ?? [],
      }])
    } catch (e) {
      if (e.name === 'AbortError') return

      setMessages((ms) => ms.map((m) => (m.id === userMsg.id ? { ...m, error: e.message } : m)))
    } finally {
      if (abort.current === controller) { abort.current = null; setLoading(false) }
    }
  }, [planetId, planet?.name])

  const send = useCallback((text) => {
    const content = text.trim()
    if (!content || loading) return false
    const userMsg = { id: ++nextId, role: 'user', content, planetId, planetName: planet?.name ?? null }
    setMessages((ms) => [...ms, userMsg])
    request(userMsg, messages)
    return true
  }, [loading, messages, planetId, planet?.name, request])

  const retry = useCallback(() => {
    if (loading) return
    const idx = messages.findLastIndex((m) => m.error)
    if (idx < 0) return
    const failed = messages[idx]
    const cleared = messages.map((m, i) => (i === idx ? { ...m, error: undefined, planetId, planetName: planet?.name ?? null } : m))
    setMessages(cleared)
    request({ ...failed, planetId }, cleared.slice(0, idx))
  }, [loading, messages, planetId, planet?.name, request])

  const clear = useCallback(() => {
    abort.current?.abort()
    abort.current = null
    setLoading(false)
    setMessages([])
  }, [])

  return { messages, loading, send, retry, clear }
}
