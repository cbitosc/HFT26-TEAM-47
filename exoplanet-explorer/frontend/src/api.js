import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL ?? ''

export async function apiGet(path) {
  const res = await fetch(`${BASE}/api${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

/** Fetch an API path; returns { data, error, loading }. */
export function useApi(path, { keepPrevious = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    // keepPrevious lets a view (e.g. the 3D scene) stay mounted while the next record loads.
    setState((s) => ({ data: keepPrevious ? s.data : null, error: null, loading: true }))
    apiGet(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => { alive = false }
  }, [path])
  return state
}
