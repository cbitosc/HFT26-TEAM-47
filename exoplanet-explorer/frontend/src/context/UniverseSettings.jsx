import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'


const KEY = 'exoverse-settings-v1'
export const DEFAULT_SETTINGS = { starfield: true, galaxy: true, paths: true, labels: true, motion: true, orbitSpeed: 'slow', quality: 'high' }

const load = () => {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY)) } } catch { return DEFAULT_SETTINGS }
}

const Ctx = createContext(null)

export function UniverseSettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const cameraReset = useRef(null)
  const setSetting = useCallback((k, v) => {
    setSettings((s) => {
      const next = { ...s, [k]: v }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {  }
      return next
    })
  }, [])
  const value = useMemo(() => ({ settings, setSetting, cameraReset }), [settings, setSetting])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}


const FALLBACK = { settings: DEFAULT_SETTINGS, setSetting: () => {}, cameraReset: { current: null } }
export const useUniverseSettings = () => useContext(Ctx) ?? FALLBACK
