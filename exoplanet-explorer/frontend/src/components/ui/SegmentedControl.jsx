import { useLayoutEffect, useRef, useState } from 'react'

// Segmented control with a sliding glass "lens" under the selected item.
export default function SegmentedControl({ items, value, onChange, label, fill = false, className = '' }) {
  const refs = useRef({})
  const root = useRef(null)
  const [thumb, setThumb] = useState(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value]
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root.current)
    return () => ro.disconnect()
  }, [value, items])

  return (
    <div ref={root} role="tablist" aria-label={label} className={`seg ${className}`}>
      {thumb && <span className="seg-thumb" aria-hidden style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }} />}
      {items.map(({ id, label: text, icon: Icon }) => (
        <button key={id} ref={(el) => { refs.current[id] = el }} role="tab" aria-selected={value === id}
          className={fill ? 'flex-1' : ''} onClick={() => onChange(id)}>
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
          {text}
        </button>
      ))}
    </div>
  )
}
