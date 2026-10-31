



const MODES = {
  desktop: { angle: 20, depth: 80, lift: 20, visible: 3, stepRatio: 0.94, ch: 450 },
  tablet: { angle: 14, depth: 50, lift: 14, visible: 2, stepRatio: 0.88, ch: 430 },
  mobile: { angle: 10, depth: 30, lift: 12, visible: 1, stepRatio: 0.8, ch: 420 },
};


export function carouselLayout(W) {
  const mode = W >= 900 ? 'desktop' : W >= 600 ? 'tablet' : 'mobile'
  const m = MODES[mode]
  const cw = mode === 'mobile' ? Math.min(280, Math.round(W * 0.72)) : Math.min(320, Math.max(240, Math.round(W * 0.27)))
  return { mode, cw, step: Math.round(cw * m.stepRatio), angle: m.angle, depth: m.depth, lift: m.lift, visible: m.visible, ch: m.ch }
}


export function cardPose(offset, L) {
  const a = Math.abs(offset), s = Math.sign(offset)
  return {
    x: offset * L.step,
    y: L.lift * a ** 1.6,
    z: a === 0 ? 0 : -L.depth * Math.min(a, 3),
    rotateY: a === 0 ? 0 : -s * Math.min(a * L.angle, 45),
    scale: a === 0 ? 1 : Math.max(0.8, 1 - 0.06 * Math.min(a, 3)),
    zIndex: 100 - Math.round(a * 10),
    hidden: a > L.visible,
  }
}

const PERSPECTIVE = 1400


export function stageHeight(L) {
  const oy = 0.3 * L.ch
  let bottom = L.ch
  for (let o = 1; o <= L.visible; o++) {
    const p = cardPose(o, L)
    const k = PERSPECTIVE / (PERSPECTIVE - p.z)
    const centre = oy + (L.ch / 2 + p.y - oy) * k
    bottom = Math.max(bottom, centre + (L.ch / 2) * p.scale * k)
  }
  return Math.ceil(bottom) + 12
}

export const cardTransform = (p) => `translateX(${p.x}px) translateY(${p.y}px) translateZ(${p.z}px) rotateY(${p.rotateY}deg) scale(${p.scale})`
