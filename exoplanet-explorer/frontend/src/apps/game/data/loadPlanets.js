import { API_BASE } from './apiBase.js';
export async function loadPlanets() {
  const cachedResponse = await fetch('/apps/game/planets.json');
  if (!cachedResponse.ok) throw new Error('Cached planet data is unavailable.');
  const cached = await cachedResponse.json();
  const livePromise = fetch(`${API_BASE}/planets`, { signal: AbortSignal.timeout(4000) })
    .then(response => response.ok ? response.json() : null)
    .then(rows => {
      if (!Array.isArray(rows) || !rows.length) return null;
      const byName = new Map(rows.map(row => [row.pl_name, row]));

      for (const row of cached) if (!byName.has(row.pl_name)) byName.set(row.pl_name, row);
      return { planets: [...byName.values()], source: 'LIVE NASA' };
    }).catch(() => null);

  return { planets: cached, source: 'CACHED', livePromise };
}

export async function loadNarration() {
  try {
    const response = await fetch('/apps/game/narration.json');
    if (response.ok) return await response.json();
  } catch {  }
  return {};
}
