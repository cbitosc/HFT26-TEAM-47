import { useCallback, useEffect, useRef, useState } from 'react'
import { pickActiveSection } from '../utils/sectionNav.js'


export function useActiveSection(ids, root) {
  const [active, setActive] = useState(ids[0] ?? null)
  const visible = useRef(new Set())
  const lock = useRef(0)
  const key = ids.join('|')

  useEffect(() => {
    const container = root.current
    if (!container) return undefined
    const order = key.split('|')
    visible.current = new Set()
    const update = () => {
      if (performance.now() < lock.current) return
      const atBottom = container.scrollTop > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 4
      setActive((prev) => pickActiveSection(order, visible.current, prev, atBottom))
    }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) (e.isIntersecting ? visible.current.add(e.target.id) : visible.current.delete(e.target.id))
      update()
    }, { root: container, rootMargin: '0px 0px -65% 0px', threshold: 0 })
    order.forEach((id) => { const el = container.querySelector(`#${CSS.escape(id)}`); if (el) io.observe(el) })
    container.addEventListener('scroll', update, { passive: true })
    return () => { io.disconnect(); container.removeEventListener('scroll', update) }
  }, [key, root])

  const scrollTo = useCallback((id) => {
    const container = root.current
    const el = container?.querySelector(`#${CSS.escape(id)}`)
    if (!el) return
    setActive(id)
    lock.current = performance.now() + 700
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    container.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }, [root])

  return { active, scrollTo }
}
