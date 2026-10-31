import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Spherical, Vector3 } from 'three'
import {
  FOCUS_SECONDS, MAX_VIEW_DISTANCE, REFRAME_SECONDS, planetFrameDistance, clamp01, easeInOutCubic, frameSpherical, galaxyFrameSpherical, journeyDuration, journeyPose,
  lerpSpherical, peakRadius, planJourney, systemCloseEnough, systemTooSmall,
} from './framing.js'

const ZERO = new Vector3()


export default function CameraDirector({
  controlsRef, frameKey, requestKey, shownKey, outerOf, placeOf, insets, focusId, getFocusFrame, onLoad, onUnload, onBusy, onTravel, onPhase, onView,
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const m = useRef({
    mode: 'idle', phase: 'idle', viewKey: 'galaxy', focused: null, t: 0, dur: 1, j: null, tween: null, timer: null,
    sph: new Spherical(), target: new Vector3(), startT: new Vector3(), destT: new Vector3(),
  })

  const live = useRef({})
  live.current = { focusId, getFocusFrame, requestKey, shownKey, outerOf, placeOf, insets, size, onLoad, onUnload, onBusy, onTravel, onPhase, onView }
  const lastFrameKey = useRef(null)

  const controls = () => controlsRef.current?.instance?.() ?? null
  const setPhase = (p) => { if (m.current.phase !== p) { m.current.phase = p; live.current.onPhase?.(p) } }

  const framing = () => {
    const { insets: i, size: sz } = live.current
    return {
      fov: camera.fov, aspect: sz.width / sz.height,
      fx: (sz.width - i.left - i.right) / sz.width, fy: (sz.height - i.top - i.bottom) / sz.height,
    }
  }

  const frameOf = (key) => {
    if (key === 'galaxy') return { target: ZERO.clone(), sph: galaxyFrameSpherical(framing()) }
    const p = live.current.placeOf(key)
    return { target: new Vector3(p.x, p.y, p.z), sph: frameSpherical(live.current.outerOf(key), framing()) }
  }

  const focusFrame = (id) => {
    const f = live.current.getFocusFrame?.(id)
    if (!f) return null
    const out = new Vector3().subVectors(f.target, f.star)
    out.y = 0
    if (out.lengthSq() < 1e-18) out.set(1, 0, 0)
    out.normalize()
    const tangent = new Vector3(0, 1, 0).cross(out).normalize()
    const dir = out.multiplyScalar(-0.35).addScaledVector(tangent, 0.85).add(new Vector3(0, 0.25, 0)).normalize()
    return { target: f.target, sph: new Spherical().setFromVector3(dir.multiplyScalar(planetFrameDistance(f.radius, framing()))), radius: f.radius }
  }
  const endFrame = () => (m.current.focused && focusFrame(m.current.focused)) || frameOf(m.current.viewKey)
  const relative = () => new Spherical().setFromVector3(camera.position.clone().sub(controls()?.target ?? ZERO))

  const lock = () => {
    const c = controls()
    if (c) { c.enabled = false; c.enableDamping = false; c.minDistance = 0.0005; c.maxDistance = MAX_VIEW_DISTANCE * 4 }
    live.current.onBusy?.(true)
  }
  const unlock = (key, target, radius, focusR = 0) => {
    const c = controls()
    if (c) {
      c.target.copy(target)
      c.minDistance = focusR ? focusR * 1.35 : key === 'galaxy' ? 0.15 : radius * 0.08
      c.maxDistance = focusR ? radius * 4 : MAX_VIEW_DISTANCE
      c.enableDamping = true
      c.enabled = true
      c.update()
      c.saveState()
    }
    live.current.onBusy?.(false)
  }
  const place = (target, sph) => {
    const mm = m.current
    mm.target.copy(target)
    camera.position.setFromSpherical(sph).add(target)
    camera.lookAt(target)
  }



  const startJourney = () => {
    const mm = m.current
    const c = controls()
    if (!c) return
    lock()
    mm.focused = null
    const { requestKey: dest, shownKey: shown } = live.current
    const end = frameOf(dest)
    const startSph = relative()
    mm.startT.copy(c.target)
    mm.destT.copy(end.target)
    const systemToSystem = shown !== 'none' && dest !== 'galaxy' && shown !== dest
    const frameA = systemToSystem ? frameOf(shown).sph.radius : 0
    const peak = peakRadius({ startR: startSph.radius, endR: end.sph.radius, frameA, frameB: dest === 'galaxy' ? 0 : end.sph.radius, dist: mm.startT.distanceTo(mm.destT), systemToSystem })
    mm.j = planJourney({ startR: startSph.radius, endR: end.sph.radius, peak, startSph, endSph: end.sph })
    mm.dur = journeyDuration(mm.j)
    mm.t = 0
    mm.mode = 'journey'
    setPhase(shown === 'none' ? 'approaching' : 'departing')
    live.current.onTravel?.(true)
  }

  const arrive = () => {
    const mm = m.current
    const { requestKey: req, shownKey: shown } = live.current
    const end = frameOf(req)

    if (req === 'galaxy' && shown !== 'none') live.current.onUnload()
    if (req !== 'galaxy' && shown !== req) live.current.onLoad()
    place(end.target, end.sph)
    unlock(req, end.target, end.sph.radius)
    mm.viewKey = req
    mm.mode = 'idle'
    setPhase('idle')
    live.current.onView?.(req === 'galaxy' ? 'galaxy' : 'system')
    live.current.onTravel?.(false)
    if (live.current.requestKey !== req) startJourney()
    else if (live.current.focusId) { mm.focused = live.current.focusId; startReframe('focusing') }
  }



  const startReframe = (kind) => {
    const mm = m.current
    const c = controls()
    if (!c || mm.mode === 'journey') return
    lock()
    const key = mm.viewKey
    const end = endFrame()
    mm.tween = { from: relative(), to: end.sph, fromT: c.target.clone(), toT: end.target, key, focus: mm.focused, fr: end.radius }
    mm.t = 0
    mm.dur = kind ? FOCUS_SECONDS : REFRAME_SECONDS
    mm.mode = 'reframe'
    if (kind) setPhase(kind)
  }
  const instantFrame = () => {
    const end = frameOf(m.current.viewKey)
    place(end.target, end.sph)
    const c = controls()
    if (c) { c.target.copy(end.target); c.minDistance = m.current.viewKey === 'galaxy' ? 0.15 : end.sph.radius * 0.08; c.update(); c.saveState() }
  }


  useEffect(() => {
    const prev = lastFrameKey.current
    lastFrameKey.current = frameKey
    const mm = m.current
    if (mm.mode === 'journey') return
    if (prev === null) instantFrame()
    else if (mm.viewKey !== 'galaxy') startReframe()
  }, [frameKey])


  useEffect(() => {
    const mm = m.current
    if (mm.mode === 'journey' || !controls()) return
    if (focusId) {
      if (mm.viewKey !== live.current.shownKey) return
      mm.focused = focusId
      startReframe('focusing')
    } else if (mm.focused) {
      mm.focused = null
      startReframe('unfocusing')
    }
  }, [focusId])


  useEffect(() => {
    if (requestKey === 'pending') return
    const mm = m.current
    if (mm.mode === 'journey' || requestKey !== mm.viewKey) startJourney()
  }, [requestKey])


  useEffect(() => {
    clearTimeout(m.current.timer)
    m.current.timer = setTimeout(() => { if (m.current.mode === 'idle') startReframe() }, 250)
    return () => clearTimeout(m.current.timer)
  }, [insets.left, insets.right, insets.top, insets.bottom, size.width, size.height])

  const pose = useRef({})
  useFrame((_, dt) => {
    const mm = m.current
    if (mm.mode === 'idle') return
    mm.t += Math.min(dt, 0.25)
    const s = clamp01(mm.t / mm.dur)

    if (mm.mode === 'reframe') {
      const tw = mm.tween

      const end = tw.focus ? focusFrame(tw.focus) : frameOf(tw.key)
      if (end) { tw.to = end.sph; tw.toT = end.target; tw.fr = end.radius }
      const e = easeInOutCubic(s)
      lerpSpherical(tw.from, tw.to, e, mm.sph)
      mm.sph.radius = Math.exp(Math.log(tw.from.radius) + (Math.log(tw.to.radius) - Math.log(tw.from.radius)) * e)
      place(new Vector3().lerpVectors(tw.fromT, tw.toT, e), mm.sph)
      if (s >= 1) {
        place(tw.toT, tw.to)
        unlock(tw.key, tw.toT, tw.to.radius, tw.focus ? tw.fr : 0)
        mm.mode = 'idle'
        setPhase(mm.focused ? 'focused' : 'idle')
      }
      return
    }


    const p = journeyPose(s, mm.j, pose.current)
    mm.sph.set(p.radius, p.phi, p.theta)
    place(new Vector3().lerpVectors(mm.startT, mm.destT, p.t), mm.sph)

    const { shownKey: shown, requestKey: req } = live.current
    if (shown !== 'none' && shown !== req) {

      if (systemTooSmall(p.radius, frameOf(shown).sph.radius)) live.current.onUnload()
      else setPhase('departing')
    } else if (shown === 'none' && req !== 'galaxy') {

      const dest = frameOf(req)
      if (systemCloseEnough(p.radius, dest.sph.radius, mm.target.distanceTo(dest.target))) { live.current.onLoad(); setPhase('arriving') }
      else setPhase(req === 'galaxy' ? 'arriving' : 'approaching')
    } else if (req === 'galaxy' && shown === 'none') {
      setPhase('arriving')
    } else {
      setPhase('arriving')
    }
    if (s >= 1) arrive()
  })

  return null
}
