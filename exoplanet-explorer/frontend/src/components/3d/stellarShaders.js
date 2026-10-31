// Shared GLSL for the host-star renderer. All patterns are procedural and driven by a 3D position on the unit
// sphere, so they wrap the star without seams or pole pinching. They are ILLUSTRATIVE: granulation, plasma flow,
// spots and bright regions are generated, not observed surface maps of any particular star.

export const NOISE = /* glsl */ `
  float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    float a = hash13(i), b = hash13(i + vec3(1, 0, 0)), c = hash13(i + vec3(0, 1, 0)), d = hash13(i + vec3(1, 1, 0));
    float e = hash13(i + vec3(0, 0, 1)), g = hash13(i + vec3(1, 0, 1)), h = hash13(i + vec3(0, 1, 1)), k = hash13(i + vec3(1, 1, 1));
    return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
  }
  float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(7.1, 3.3, 1.7); a *= 0.5; }
    return s;
  }
  // distance to the nearest feature point (convection-cell pattern)
  float worley(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    float d = 1.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 r = g + hash33(i + g) - f;
      d = min(d, dot(r, r));
    }
    return sqrt(d);
  }
`

export const SURFACE_VERT = /* glsl */ `
  varying vec3 vObj; varying vec3 vN; varying vec3 vV;
  void main() {
    vObj = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

export const SURFACE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime, uSeed, uIntensity, uActivity, uContrast;
  uniform vec3 uBase, uHot, uCool;
  varying vec3 vObj; varying vec3 vN; varying vec3 vV;
  ${NOISE}
  void main() {
    vec3 p = normalize(vObj);
    float t = uTime * 0.03;                                   // slow: no flicker
    vec3 q = p * 2.0 + vec3(uSeed, uSeed * 0.7, uSeed * 1.3);
    // large, slow domain warp: organic, flowing plasma instead of a regular lattice
    vec3 warp = vec3(fbm(q + t), fbm(q + 11.3 - t), fbm(q + 23.7 + t)) - 0.5;

    // granulation: bright convection-cell centres with darker intergranular lanes, drifting slowly
    float g = worley(p * 13.0 + warp * 0.6 + vec3(0.0, 0.0, t * 1.4) + uSeed);
    float cell = 1.0 - smoothstep(0.42, 0.84, g);          // bright cells with thin, darker lanes between them

    // plasma flow: uneven brightness over larger scales
    float flow = fbm(p * 3.5 + warp * 1.7 + vec3(t * 0.8, -t * 0.5, t * 0.3));
    float bright = mix(0.58, 1.0, cell) * (0.8 + 0.4 * flow);
    bright = mix(1.0, bright, uContrast);                     // contrast depends on the star class

    // illustrative activity: a few dark spots in mid-latitude bands and some bright regions
    float band = smoothstep(0.08, 0.30, abs(p.y)) * (1.0 - smoothstep(0.55, 0.80, abs(p.y)));
    float sp = fbm(p * 4.2 + uSeed * 1.7 + t * 0.2);        // higher frequency: small, scattered spots
    float spot = smoothstep(0.72 - 0.08 * uActivity, 0.77 - 0.08 * uActivity, sp) * band;
    float fac = smoothstep(0.70 - 0.12 * uActivity, 0.84 - 0.12 * uActivity, fbm(p * 3.0 + uSeed * 2.9 - t * 0.15));

    // temperature-dependent colour ramp: cool lanes/spots -> base -> hot granule centres
    vec3 col = mix(uCool, uBase, smoothstep(0.30, 0.85, bright));
    col = mix(col, uHot, smoothstep(0.85, 1.15, bright));
    col = mix(col, uCool * 0.36, spot * 0.85);
    col += uHot * 0.16 * fac * (1.0 - spot);

    // limb darkening and slight limb reddening: the disc reads as a sphere, not a flat sticker
    float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    col *= mix(0.42, 1.0, pow(mu, 0.5));
    col = mix(col, col * (uCool / max(uBase, vec3(0.001))), (1.0 - mu) * 0.3);

    gl_FragColor = vec4(min(col * uIntensity, vec3(1.0)), 1.0);
  }
`

export const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

// Outer corona: soft, temperature-coloured, with gentle angular streamers. Fully transparent at the outer edge.
export const CORONA_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor; uniform float uStrength, uInner, uTime, uSeed;
  varying vec2 vUv;
  float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
  void main() {
    vec2 c = (vUv - 0.5) * 2.0;
    float x = (length(c) - uInner) / (1.0 - uInner);          // 0 at the limb, 1 at the outer edge
    if (x <= 0.0 || x >= 1.0) discard;
    float ang = atan(c.y, c.x), t = uTime * 0.04;
    float streamers = 0.6 * n1(ang * 4.0 + uSeed + t) + 0.4 * n1(ang * 9.0 - uSeed - t * 1.3);
    float a = pow(1.0 - x, 2.4) * (0.55 + 0.9 * streamers * (1.0 - 0.5 * x)) * uStrength * 0.5;
    gl_FragColor = vec4(uColor, a);
  }
`

// Tight atmospheric glow hugging the limb.
export const GLOW_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor; uniform float uStrength, uInner;
  varying vec2 vUv;
  void main() {
    vec2 c = (vUv - 0.5) * 2.0;
    float x = (length(c) - uInner) / (1.0 - uInner);
    if (x <= 0.0 || x >= 1.0) discard;
    float a = pow(1.0 - x, 1.7) * uStrength * 0.55;
    gl_FragColor = vec4(uColor, a);
  }
`
