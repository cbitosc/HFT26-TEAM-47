import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import preflight from 'tailwindcss/preflight.css?inline'
import { FONT_OVERRIDE, scopeCss } from './scopeCss.js'

const BASE = `${scopeCss(preflight)}
:host { display: block; --app-h: 100%; --font-ui: "Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
.app-root { width: 100%; height: 100%; overflow: auto; }`


export default function ShadowApp({ css, label, fullscreen = false, children }) {
  const host = useRef(null)
  const [root, setRoot] = useState(null)
  useLayoutEffect(() => { setRoot(host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' })) }, [])
  return (
    <div ref={host} role="region" aria-label={label} className={`fixed inset-x-0 bottom-0 ${fullscreen ? 'z-40' : 'z-10'}`} style={{ top: fullscreen ? 0 : 'var(--topbar-h, 5rem)' }}>
      {root && createPortal(<><style>{BASE + scopeCss(css) + FONT_OVERRIDE}</style><div className="app-root">{children}</div></>, root)}
    </div>
  )
}
