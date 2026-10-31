import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json({ limit: '80kb' }));
const PORT = process.env.PORT || 8787;
const BASE_URL = 'https://api.featherless.ai/v1/chat/completions';
const DEFAULT_MODEL = process.env.FEATHERLESS_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
const RETRY_MODEL = process.env.FEATHERLESS_RETRY_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct';
const NASA_TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select%20pl_name,hostname,pl_rade,pl_bmasse,pl_orbper,pl_orbsmax,pl_eqt,pl_insol,st_teff,st_rad,st_mass,sy_dist,disc_year,discoverymethod%20from%20pscomppars%20where%20pl_rade%20is%20not%20null%20and%20st_teff%20is%20not%20null&format=json';

app.get('/api/planets', async (_req, res) => {
  try {
    const response = await fetch(NASA_TAP, { signal: AbortSignal.timeout(3800), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`NASA TAP ${response.status}`);
    res.set('Cache-Control', 'public, max-age=3600').json(await response.json());
  } catch (error) { res.status(502).json({ error: 'NASA archive unavailable', detail: error.message }); }
});

function number(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : 'unknown';
}

function template({ type, planet = {}, sim = {}, tier }) {
  const name = planet.pl_name || 'This world';
  const hazards = Array.isArray(sim.hazards) ? sim.hazards : [];
  const top = hazards.find(h => h.id === sim.cause) || [...hazards].sort((a,b)=>(b.dps||0)-(a.dps||0))[0];
  if (type === 'callout') {
    const label = top?.label || 'Environmental hazard';
    const value = top?.value || 'unknown';
    const dps = number(top?.dps, 2);
    return `Warning: ${label} reads ${value}; its model contribution is ${dps} HP/s.`;
  }
  const elapsed = number(sim.run?.elapsed ?? sim.elapsed, 1);
  const totalDps = number(sim.totalDps, 2);
  const topDps = number(top?.dps, 2);
  const cause = top?.label || 'environmental stress';
  const health = number(sim.run?.health ?? sim.health, 0);
  const outcome = sim.run?.outcome || sim.outcome || 'dead';
  const metrics = sim.runMetrics || {};
  const walked = number(metrics.distanceWalked, 1);
  const sheltered = number(metrics.timeSheltered, 1);
  const approach = metrics.closestApproachToTerminator != null && Number.isFinite(Number(metrics.closestApproachToTerminator))
    ? `${number(metrics.closestApproachToTerminator, 1)} m from the terminator`
    : 'not modeled for this world';
  const movement = `You walked ${walked} m and spent ${sheltered} seconds sheltered; closest terminator approach was ${approach}.`;
  if (outcome === 'survived') {
    return `You survived ${elapsed} seconds on ${name} with ${health}% suit integrity; ${cause} was strongest at ${topDps} HP/s, within ${totalDps} total modeled HP/s. ${movement} NASA has no confirmed atmosphere, magnetic field, or verified surface-condition reading for this world. No exoplanet is confirmed habitable.`;
  }
  return `You lasted ${elapsed} seconds on ${name} before ${cause} ended the run at ${topDps} HP/s, within ${totalDps} total modeled HP/s; integrity reached ${health}%. ${movement} NASA has no confirmed atmosphere, magnetic field, or verified surface-condition reading for this world. No exoplanet is confirmed habitable.`;
}

function systemPrompt(type, tier) {
  const base = 'You are a calm, vivid ship AI. Use ONLY the numbers provided. Never invent data. If a value is estimated, say so.';
  if (type === 'callout') return `${base} Write exactly one tense sentence, maximum 20 words. Only describe values in the supplied planet row and sim JSON. This is the ${tier || 'health'}% health callout.`;
  return `${base} Write 3 to 4 concise sentences. Explain the outcome and cause using actual values in the supplied JSON. When runMetrics are present, report distanceWalked, timeSheltered, and closestApproachToTerminator if relevant; explain modeled effects without claiming proof. Explicitly state NASA does not know this planet's atmosphere, magnetic field, and verified surface conditions. End with this exact honest caveat: "No exoplanet is confirmed habitable." Do not claim habitability.`;
}

async function callModel({ planet, sim, type, tier }) {
  if (!process.env.FEATHERLESS_API_KEY) return null;
  const models = [...new Set([DEFAULT_MODEL, RETRY_MODEL])];
  const deadline = Date.now() + 7800;
  for (const model of models) {
    const timeLeft = deadline - Date.now();
    if (timeLeft <= 100) break;
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST', signal: AbortSignal.timeout(Math.min(3700, timeLeft)),
        headers: { Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: .45, max_tokens: type === 'callout' ? 70 : 220, messages: [
          { role: 'system', content: systemPrompt(type, tier) },
          // These are the only factual context sent to the model.
          { role: 'user', content: JSON.stringify({ planet, sim }) },
        ] }),
      });
      if (!response.ok) continue;
      const json = await response.json();
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) continue;
      if (type === 'callout') {
        const sentenceCount = (text.match(/[.!?](?:\s|$)/g) || []).length;
        if (text.split(/\s+/).length > 20 || sentenceCount !== 1) continue;
      }
      if (type === 'postmortem') {
        const sentenceCount = (text.match(/[.!?](?:\s|$)/g) || []).length;
        if (sentenceCount < 3 || sentenceCount > 4 || !text.endsWith('No exoplanet is confirmed habitable.')) continue;
      }
      return { text, model };
    } catch { /* Retry once on the alternate model, subject to the shared deadline. */ }
  }
  return null;
}

app.post('/api/narrate', async (req, res) => {
  const body = req.body || {};
  const type = body.type === 'callout' ? 'callout' : 'postmortem';
  // Keep the factual payload to the catalog row and the computed simulation only.
  const planet = body.planet && typeof body.planet === 'object' ? body.planet : {};
  const sim = body.sim && typeof body.sim === 'object' ? body.sim : {};
  try {
    const generated = await callModel({ planet, sim, type, tier: body.tier });
    if (generated) return res.json({ text: generated.text, source: 'featherless', model: generated.model });
  } catch { /* Template is the offline/error path. */ }
  res.json({ text: template({ type, planet, sim, tier: body.tier }), source: 'template' });
});

// Backward-compatible alias for deployments with an older client bundle.
app.post('/api/postmortem', (req, res, next) => { req.body = { ...req.body, type: 'postmortem' }; next(); }, async (req, res) => {
  const body = req.body || {};
  const sim = { ...(body.sim || {}), outcome: body.outcome, elapsed: body.seconds, health: body.health, cause: body.cause, totalDps: body.dps };
  const generated = await callModel({ planet: body.planet || { pl_name: body.planetName }, sim, type: 'postmortem' }).catch(() => null);
  res.json(generated ? { ...generated, source: 'featherless' } : { text: template({ type: 'postmortem', planet: body.planet || { pl_name: body.planetName }, sim }), source: 'template' });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Survive 60 API listening on ${PORT}`));
