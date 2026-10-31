const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const estimateMass = (R) => (R < 1.5 ? Math.pow(R, 3.7) : 2.7 * Math.pow(R, 1.3));
const safeNumber = (x, fallback) => x == null || !Number.isFinite(Number(x)) ? fallback : Number(x);



const DPS = Object.freeze({ thermal: 12, radiation: 10.5, dwarfFlares: 1.15, gravity: 13, surface: 60 });

export function computeSurvival(p = {}) {
  const rawRadius = safeNumber(p.pl_rade, 1);
  const R = clamp(rawRadius, 0.05, 100);
  const hasMass = p.pl_bmasse != null && Number.isFinite(Number(p.pl_bmasse)) && Number(p.pl_bmasse) > 0;
  const M = hasMass ? Number(p.pl_bmasse) : estimateMass(R);
  const massEstimated = !hasMass;
  const g = M / (R * R);
  const noSurface = R > 2.5;
  const eqTempMissing = p.pl_eqt == null || !Number.isFinite(Number(p.pl_eqt));
  const greenhouseApplied = R < 1.6;
  const T = safeNumber(p.pl_eqt, 255) + (greenhouseApplied ? 33 : 0);
  const d = Math.max(0, 273 - T, T - 310);
  const mDwarf = p.st_teff != null && Number.isFinite(Number(p.st_teff)) && Number(p.st_teff) < 3900;
  const insolMissing = p.pl_insol == null || !Number.isFinite(Number(p.pl_insol));
  const insol = Math.max(0, safeNumber(p.pl_insol, 1));
  const flux = insol * (mDwarf ? 3 : 1);
  const thermalSev = clamp(d / 200) ** 2;
  const radiationSev = clamp(Math.log10(Math.max(flux, 1)) / 3) ** 2;
  const gravitySev = g > 1.6 ? clamp((g - 1.6) / 3) : g < 0.4 ? clamp((0.4 - g) / 0.4) * 0.3 : 0;
  const hazards = [
    { id: 'thermal', label: 'Temperature', source: 'pl_eqt', sev: thermalSev, dps: thermalSev * DPS.thermal, value: `${Math.round(T)} K${eqTempMissing ? ' (estimated)' : ''}${greenhouseApplied ? ' · +33 K assumed' : ''}` },
    { id: 'radiation', label: 'Radiation', source: 'pl_insol · st_teff', sev: radiationSev, dps: radiationSev * DPS.radiation + (mDwarf ? DPS.dwarfFlares : 0), value: `${insol.toFixed(1)}× Earth flux${insolMissing ? ' (assumed)' : ''}${mDwarf ? ' + M-dwarf flare penalty' : ''}` },
    { id: 'gravity', label: 'Gravity', source: 'pl_bmasse · pl_rade', sev: gravitySev, dps: gravitySev * DPS.gravity, value: `${g.toFixed(2)} g${massEstimated ? ' (estimated)' : ''} · 70 kg reference weighs ${(70 * g).toFixed(0)} kg` },
    { id: 'surface', label: 'No solid ground', source: 'pl_rade', sev: noSurface ? 1 : 0, dps: noSurface ? DPS.surface : 0, value: noSurface ? 'Gas/ice giant (assumed)' : 'Solid surface (assumed)' },
  ];
  const totalDps = hazards.reduce((sum, hazard) => sum + hazard.dps, 0);
  const timeToDeath = totalDps <= 0 ? 1e9 : 100 / totalDps;
  const main = [...hazards].sort((a, b) => b.dps - a.dps)[0];
  const orbit = safeNumber(p.pl_orbper, 365);
  const tidallyLocked = p.pl_orbper != null && orbit < 50 && mDwarf;
  const axis = safeNumber(p.pl_orbsmax, 0);
  const starRadius = safeNumber(p.st_rad, 0);
  const angular = axis > 0 && starRadius > 0 ? 2 * Math.atan((starRadius * 6.957e8) / (axis * 1.496e11)) * 180 / Math.PI : 0.53;
  const starAngularDeg = Number.isFinite(angular) ? angular : 0.53;
  return {
    hazards, totalDps, timeToDeath, cause: main.id, g, T, massEstimated, tidallyLocked,
    dayLength: tidallyLocked ? 'Tidally locked' : `${(orbit / 365 * 24).toFixed(1)} h (assumed)`,
    starAngularDeg, starAngularEstimated: !(axis > 0 && starRadius > 0), starTemp: p.st_teff == null ? null : safeNumber(p.st_teff, null),
    radiationFlux: flux,
    assumptions: { massEstimated, greenhouseDeltaK: greenhouseApplied ? 33 : 0, flareMultiplier: mDwarf ? 3 : 1, gravityReferenceKg: 70, noSolidGroundRadiusEarth: 2.5, dpsWeights: DPS },
  };
}

export function survivalPercent(sim, elapsedSeconds) {
  return Math.max(0, 100 - (sim?.totalDps ?? 0) * Math.max(0, elapsedSeconds));
}


export function applyLocalConditions(sim = {}, { s = 0.6, sheltered = false } = {}) {
  const coordinate = clamp(safeNumber(s, 0.6), -1, 1);
  const isSheltered = Boolean(sheltered);
  const T = safeNumber(sim.T, 255);
  const localTemperature = sim.tidallyLocked
    ? (T - 20) + ((T + 60) - (T - 20)) * Math.max(coordinate, 0)
      - ((T - 20) - Math.max(T - 140, 40)) * Math.max(-coordinate, 0)
    : T;

  const twilightThermalFactor = sim.tidallyLocked ? Math.max(0.01, Math.abs(coordinate)) : 1;
  const hazards = (Array.isArray(sim.hazards) ? sim.hazards : []).map(hazard => {
    const next = { ...hazard, sev: Math.max(0, safeNumber(hazard.sev, 0)), dps: Math.max(0, safeNumber(hazard.dps, 0)) };
    if (next.id === 'thermal' && sim.tidallyLocked) {
      const distance = Math.max(0, 273 - localTemperature, localTemperature - 310);
      next.sev = (clamp(distance / 200) ** 2) * twilightThermalFactor;
      next.dps = next.sev * DPS.thermal;
      next.value = `${Math.round(localTemperature)} K (local) · ${next.value || 'pl_eqt'}`;
    }
    if (isSheltered && next.id === 'thermal') {
      next.sev *= 0.75;
      next.dps *= 0.75;
    }
    if (isSheltered && next.id === 'radiation') {
      next.sev *= 0.4;

      next.dps *= 0.4;
    }
    next.sev = Number.isFinite(next.sev) ? next.sev : 0;
    next.dps = Number.isFinite(next.dps) ? next.dps : 0;
    return next;
  });
  const totalDps = hazards.reduce((sum, hazard) => sum + hazard.dps, 0);
  const main = [...hazards].sort((a, b) => b.dps - a.dps)[0];
  return {
    ...sim, hazards, totalDps: Number.isFinite(totalDps) ? totalDps : 0,
    timeToDeath: totalDps > 0 ? 100 / totalDps : 1e9,
    cause: main?.id || sim.cause || 'thermal', localTemperature,
    dayNightCoordinate: coordinate, sheltered: isSheltered, twilightThermalFactor,
  };
}

export const survivalTuning = DPS;
