import { API_BASE } from './apiBase.js';
export async function loadPlanets() {
  const cachedResponse = await fetch('./planets.json');
  if (!cachedResponse.ok) throw new Error('Cached planet data is unavailable.');
  const cached = await cachedResponse.json();
  const livePromise = fetch(`${API_BASE}/planets`, { signal: AbortSignal.timeout(4000) })
    .then(response => response.ok ? response.json() : null)
    .then(rows => {
      if (!Array.isArray(rows) || !rows.length) return null;
      const byName = new Map(rows.map(row => [row.pl_name, row]));
      // Keep the demo planets selectable even when the live archive lacks radius rows.
      for (const row of cached) if (!byName.has(row.pl_name)) byName.set(row.pl_name, row);
      return { planets: [...byName.values()], source: 'LIVE NASA' };
    }).catch(() => null);
  // Show cached planets immediately; live results upgrade the catalog in the background.
  return { planets: cached, source: 'CACHED', livePromise };
}

export async function loadNarration() {
  try {
    const response = await fetch('./narration.json');
    if (response.ok) return await response.json();
  } catch { /* Cached narrator lines are optional; the local template still works. */ }
  return {};
}
