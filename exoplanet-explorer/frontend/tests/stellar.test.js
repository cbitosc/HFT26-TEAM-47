import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CLASS_RANGES, classFromTemperature, classifyStar, parseSpectralType } from '../src/utils/stellarClassification.js'
import { NEUTRAL_STAR_RGB, rgbToHex, starColor, temperatureToRgb } from '../src/utils/stellarColorMapping.js'
import { luminosityLog, starScaleFromRadius, starVisuals } from '../src/utils/stellarScaling.js'
import { starColorFromTemp } from '../src/components/3d/scaling.js'
import { groupSystems } from '../src/utils/systems.js'

// Star records shaped like the app's data (values copied from the NASA Exoplanet Archive composite table).
const TRAPPIST1 = { host: 'TRAPPIST-1', star_temperature_k: 2566, star_radius_solar: 0.1192, star_luminosity_log_solar: -3.2573, star_spectral_type: 'M8.0 V' }
const KEPLER186 = { host: 'Kepler-186', star_temperature_k: 3788, star_radius_solar: 0.472, star_luminosity_log_solar: -1.385, star_spectral_type: 'M1' }
const KEPLER452 = { host: 'Kepler-452', star_temperature_k: 5757, star_radius_solar: 1.11, star_luminosity_log_solar: 0.0845, star_spectral_type: 'G2' }
const HD189733 = { host: 'HD 189733', star_temperature_k: 5052, star_radius_solar: 0.75, star_luminosity_log_solar: -0.461, star_spectral_type: 'K2 V' }
const WASP17 = { host: 'WASP-17', star_temperature_k: 6550, star_radius_solar: 1.49, star_luminosity_log_solar: 0.613, star_spectral_type: 'F4' }

test('temperature decides the class, using the approximate ranges', () => {
  const cases = [[45000, 'O'], [30000, 'O'], [29999, 'B'], [10000, 'B'], [9999, 'A'], [7500, 'A'], [7499, 'F'], [6000, 'F'], [5999, 'G'], [5200, 'G'], [5199, 'K'], [3700, 'K'], [3699, 'M'], [2566, 'M']]
  for (const [t, c] of cases) assert.equal(classFromTemperature(t), c, `${t} K`)
  assert.equal(classFromTemperature(null), null)
  assert.equal(classFromTemperature(0), null)
  assert.equal(classFromTemperature(NaN), null)
  assert.equal(CLASS_RANGES.length, 7)
})

test('spectral types are parsed (class, subclass, luminosity class); non O-M types are rejected', () => {
  assert.deepEqual(parseSpectralType('M8.0 V'), { cls: 'M', subclass: 8, lumClass: 'V' })
  assert.deepEqual(parseSpectralType('G5V'), { cls: 'G', subclass: 5, lumClass: 'V' })
  assert.deepEqual(parseSpectralType('K2 V'), { cls: 'K', subclass: 2, lumClass: 'V' })
  assert.deepEqual(parseSpectralType('F4'), { cls: 'F', subclass: 4, lumClass: null })
  assert.equal(parseSpectralType('K0 III').lumClass, 'III')
  assert.equal(parseSpectralType('B2 Ia').lumClass, 'Ia')
  for (const bad of ['', '   ', null, undefined, 'DA', 'xyz', 42]) assert.equal(parseSpectralType(bad), null, String(bad))
})

test('classification labels follow the data and are only as specific as it allows', () => {
  assert.equal(classifyStar(TRAPPIST1).label, 'M-type · Red dwarf')
  assert.equal(classifyStar(KEPLER452).label, 'G-type · Yellow dwarf') // G2, radius 1.11 -> dwarf
  assert.equal(classifyStar(HD189733).label, 'K-type · Orange dwarf')
  assert.equal(classifyStar(WASP17).label, 'F-type · Yellow-white dwarf')
  assert.equal(classifyStar({ star_temperature_k: 40000 }).label, 'O-type · Blue star')
  assert.equal(classifyStar({ star_temperature_k: 15000 }).label, 'B-type · Blue-white star')
  assert.equal(classifyStar({ star_temperature_k: 8500 }).label, 'A-type · White star')
  // luminosity class from the spectral type wins; otherwise only a measured radius may justify "giant"/"dwarf"
  assert.equal(classifyStar({ star_spectral_type: 'K0 III' }).label, 'K-type · Orange giant')
  assert.equal(classifyStar({ star_temperature_k: 4500, star_radius_solar: 12 }).label, 'K-type · Orange giant')
  assert.equal(classifyStar({ star_temperature_k: 3300 }).label, 'M-type · Red star') // no radius, no luminosity class: no dwarf claim
})

test('a spectral type that disagrees with temperature at a class boundary is reported honestly', () => {
  const c = classifyStar(KEPLER186) // NASA: M1, but 3788 K falls in the K range
  assert.equal(c.spectralClass, 'M'); assert.equal(c.basis, 'spectral-type')
  assert.equal(c.tempClass, 'K'); assert.equal(c.mismatch, true)
  assert.equal(classifyStar(TRAPPIST1).mismatch, false)
  // the COLOUR still follows temperature: reddish-orange, between the M and K anchors
  const [r, g, b] = starColor(KEPLER186).rgb
  assert.ok(r >= 250 && g > 120 && g < 175 && b < 100)
})

test('fallbacks: spectral type when there is no temperature, neutral when there is neither; nothing is invented', () => {
  const onlyType = classifyStar({ star_spectral_type: 'G2 V' })
  assert.equal(onlyType.available, true); assert.equal(onlyType.basis, 'spectral-type')
  assert.equal(starColor({ star_spectral_type: 'G2 V' }).basis, 'spectral-type')
  const none = classifyStar({})
  assert.equal(none.available, false); assert.equal(none.label, 'Classification unavailable'); assert.equal(none.basis, 'unavailable')
  assert.deepEqual(starColor({}).rgb, NEUTRAL_STAR_RGB); assert.equal(starColor({}).basis, 'unavailable')
  assert.equal(starColor(null).basis, 'unavailable')
  const v = starVisuals({})
  assert.equal(v.colorBasis, 'unavailable'); assert.equal(v.luminosityLog, null); assert.equal(v.cls.available, false)
  assert.equal(starColorFromTemp(null), rgbToHex(NEUTRAL_STAR_RGB))
  assert.ok(!('star_temperature_k' in classifyStar({ star_spectral_type: 'K2 V' }))) // classification never returns a temperature
})

const sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b)

test('colour follows temperature: red dwarfs red, K orange, Sun-like yellow-white, hot stars white/blue', () => {
  const m = temperatureToRgb(2566), k = temperatureToRgb(4500), g = temperatureToRgb(5772), f = temperatureToRgb(6800), a = temperatureToRgb(8500), b = temperatureToRgb(15000), o = temperatureToRgb(40000)
  // M: deep red / red-orange, strongly red-dominant
  assert.ok(m[0] >= 250 && m[1] < 110 && m[2] < 70, `M ${m}`)
  // K: warm orange (red high, green mid, blue low)
  assert.ok(k[0] >= 250 && k[1] > 160 && k[1] < 200 && k[2] < 130, `K ${k}`)
  // G: yellow-white (all channels high, blue a little behind)
  assert.ok(g[0] >= 250 && g[1] >= 225 && g[2] >= 180 && g[2] < g[0], `G ${g}`)
  // F: pale yellow-white
  assert.ok(f[0] >= 250 && f[1] >= 240 && f[2] >= 215, `F ${f}`)
  // A: white / faintly blue
  assert.ok(a[2] >= a[0] && a[0] >= 215 && a[1] >= 225, `A ${a}`) // white, leaning slightly blue
  // B and O: blue-white to blue, blue clearly dominant
  assert.ok(b[2] - b[0] >= 40, `B ${b}`)
  assert.ok(o[2] - o[0] >= 90, `O ${o}`)
  // each class is distinguishable from the next
  const order = [m, k, g, f, a, b, o]
  for (let i = 1; i < order.length; i++) assert.notDeepEqual(order[i], order[i - 1])
})

test('colour ramp is monotonic from red to blue and never garish', () => {
  let prev = -Infinity
  for (let t = 2200; t <= 50000; t += 100) {
    const c = temperatureToRgb(t)
    const blueness = c[2] - c[0]
    assert.ok(blueness >= prev - 1, `blueness must rise with temperature (${t} K)`)
    prev = blueness
    assert.ok(c.every((v) => v >= 0 && v <= 255))
    assert.ok(sat(c) <= 0.86, `${t} K is too saturated: ${c}`) // no neon
  }
  assert.deepEqual(temperatureToRgb(1000), temperatureToRgb(2300)) // clamped, never extrapolated
  assert.deepEqual(temperatureToRgb(99999), temperatureToRgb(45000))
})

test('stellar radius sets a bounded visual size, luminosity a bounded brightness', () => {
  assert.equal(starScaleFromRadius(null), 1)
  const rs = [0.01, 0.1192, 0.5, 1, 1.49, 5, 80].map(starScaleFromRadius)
  rs.forEach((v) => assert.ok(v >= 0.65 && v <= 1.35))
  for (let i = 1; i < rs.length; i++) assert.ok(rs[i] >= rs[i - 1])
  assert.ok(starScaleFromRadius(0.1192) < starScaleFromRadius(1.11)) // TRAPPIST-1 smaller than a Sun-like star
  // glow must stay inside the innermost orbit (3.4 units) even for the biggest star: R=1.5*1.35, corona 1.6x
  assert.ok(1.5 * 1.35 * 1.6 < 3.4)

  const dim = starVisuals(TRAPPIST1), sun = starVisuals(KEPLER452), hot = starVisuals({ ...WASP17, star_luminosity_log_solar: 4 }), floor = starVisuals({ star_temperature_k: 3000, star_luminosity_log_solar: -9 })
  assert.ok(dim.emissive < sun.emissive && sun.emissive < starVisuals(WASP17).emissive)
  for (const v of [dim, sun, hot, floor]) {
    assert.ok(v.emissive >= 0.72 && v.emissive <= 1.28)
    assert.ok(v.light >= 1.4 && v.light <= 4)
    assert.ok(v.coronaStrength >= 0.5 && v.coronaStrength <= 1.15)
  }
  assert.ok(dim.light < sun.light && dim.coronaStrength < sun.coronaStrength)
})

test('luminosity: reported value, else derived from radius and temperature, else unknown', () => {
  assert.ok(Math.abs(luminosityLog(KEPLER452) - 0.0845) < 1e-9)
  const derived = luminosityLog({ star_radius_solar: 1, star_temperature_k: 5772 })
  assert.ok(Math.abs(derived) < 1e-6) // the Sun: log10(1) = 0
  assert.equal(luminosityLog({ star_radius_solar: 1 }), null)
  assert.equal(luminosityLog({}), null)
})

test('visual parameters are deterministic per host and differ between stars', () => {
  assert.equal(starVisuals(KEPLER452).seed, starVisuals({ ...KEPLER452 }).seed)
  assert.notEqual(starVisuals(KEPLER452).seed, starVisuals(HD189733).seed)
  const m = starVisuals(TRAPPIST1), g = starVisuals(KEPLER452), a = starVisuals({ star_temperature_k: 9000 })
  assert.ok(m.activity > g.activity && g.activity > a.activity) // illustrative: cooler dwarfs are more spotted
  assert.ok(m.base[0] > m.base[2] * 3) // red dwarf: red channel dominates
  // hot/cool ramp brackets the base colour for the surface shader
  assert.ok(m.cool.every((v, i) => v <= m.base[i]) && m.hot.every((v, i) => v >= m.base[i]))
})

test('one star per system: every planet of a host shares the same star properties and the same star look', () => {
  const planets = [
    { id: 'a-b', name: 'A b', host_star: 'A', ...KEPLER452 },
    { id: 'a-c', name: 'A c', host_star: 'A', ...KEPLER452 },
    { id: 'z-b', name: 'Z b', host_star: 'Z', ...TRAPPIST1 },
  ]
  const [sysA, sysZ] = groupSystems(planets).sort((x, y) => x.host.localeCompare(y.host))
  assert.equal(sysA.count, 2)
  assert.equal(starVisuals(sysA).hex, starVisuals(planets[0]).hex)
  assert.equal(starVisuals(sysA).hex, starVisuals(planets[1]).hex)
  assert.notEqual(starVisuals(sysA).hex, starVisuals(sysZ).hex)
})

// Real NASA data (the backend's cache), when present: every system must yield a valid, sensible star.
const cache = new URL('../../backend/data/planets_cache.json', import.meta.url)
test('smoke test over the real NASA dataset', { skip: !fs.existsSync(cache) }, () => {
  const planets = JSON.parse(fs.readFileSync(cache, 'utf8')).planets
  const systems = groupSystems(planets)
  assert.ok(systems.length > 20)
  const classes = {}
  for (const s of systems) {
    const v = starVisuals(s)
    assert.ok(v.base.every(Number.isFinite) && v.radiusScale >= 0.65 && v.radiusScale <= 1.35 && Number.isFinite(v.emissive), s.host)
    classes[v.cls.spectralClass ?? 'none'] = (classes[v.cls.spectralClass ?? 'none'] ?? 0) + 1
    // colour must follow the measured temperature, never the name
    if (s.star_temperature_k != null) assert.equal(v.hex, starColorFromTemp(s.star_temperature_k), s.host)
  }
  const by = Object.fromEntries(systems.map((s) => [s.host, s]))
  if (by['TRAPPIST-1']) assert.equal(classifyStar(by['TRAPPIST-1']).spectralClass, 'M')
  if (by['Kepler-452']) assert.equal(classifyStar(by['Kepler-452']).spectralClass, 'G')
  if (by['Proxima Cen']) assert.equal(classifyStar(by['Proxima Cen']).spectralClass, 'M')
  assert.ok(Object.keys(classes).length >= 3, `class spread: ${JSON.stringify(classes)}`) // the data really does span several star types
})
