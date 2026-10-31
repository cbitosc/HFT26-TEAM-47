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

export async function apiPost(path, body, signal) {
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error('Could not reach the backend. Is it running on port 8000?')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // FastAPI validation errors put a list in `detail`; show something readable either way.
    const detail = Array.isArray(data.detail) ? 'Your message could not be sent (invalid input).' : data.detail
    const err = new Error(detail || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
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
