// Deterministic, tile-independent value noise shared by terrain rendering and footsteps.
const fract = (x) => x - Math.floor(x);
const hash = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7 + 19.19) * 43758.5453) * 2 - 1;
const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(x, z) {
  const ix = Math.floor(x); const iz = Math.floor(z);
  const fx = smooth(x - ix); const fz = smooth(z - iz);
  const a = hash(ix, iz); const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1); const d = hash(ix + 1, iz + 1);
  const top = a + (b - a) * fx; const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fz;
}

const PROFILES = {
  rocky: { amp: 2.3, scale: .035, rough: .42 },
  hot: { amp: 1.8, scale: .055, rough: .65 },
  lava: { amp: 3.4, scale: .075, rough: 1.1 },
  cold: { amp: 1.15, scale: .025, rough: .18 },
};

// Shelter centers are part of the game's deterministic terrain layout, in meters.
export function getShelterSpotsNear(x, z, range = 220) {
  const spots = [];
  const minX = Math.floor((x - range) / 200); const maxX = Math.floor((x + range) / 200);
  const minZ = Math.floor((z - range) / 200); const maxZ = Math.floor((z + range) / 200);
  for (let gx = minX; gx <= maxX; gx++) for (let gz = minZ; gz <= maxZ; gz++) {
    spots.push({ x: gx * 200 + (gx === 0 ? 0 : 100), z: gz * 200 + (gz === 1 ? 50 : 100) });
  }
  return spots;
}

export function rocksInTerrainBounds(centerX, centerZ) {
  const firstCellX = Math.floor((centerX - 100) / 50); const firstCellZ = Math.floor((centerZ - 100) / 50);
  const rocks = [];
  for (let gx = firstCellX; gx < firstCellX + 4; gx++) for (let gz = firstCellZ; gz < firstCellZ + 4; gz++) {
    let seed = (Math.imul(gx, 73856093) ^ Math.imul(gz, 19349663) ^ 0x5f3759df) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 9; i++) rocks.push({ x: gx * 50 + rand() * 50, z: gz * 50 + rand() * 50, s: .2 + rand() * .65, rot: rand() * Math.PI * 2 });
  }
  return rocks;
}

export function terrainHeight(x, z, type = 'rocky') {
  const profile = PROFILES[type] || PROFILES.rocky;
  const broad = valueNoise(x * profile.scale, z * profile.scale) * profile.amp;
  const detail = valueNoise(x * profile.scale * 3.7 + 31, z * profile.scale * 3.7 - 17) * profile.amp * profile.rough * .28;
  const fine = valueNoise(x * profile.scale * 11 + 7, z * profile.scale * 11 + 43) * profile.amp * profile.rough * .07;
  return broad + detail + fine;
}

