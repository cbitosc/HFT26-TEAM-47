import React, { useEffect, useRef } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { getShelterSpotsNear, terrainHeight } from '../sim/terrain.js';
import { useGame } from '../store/useGame.js';
import { playFootstep } from '../audio/sfx.js';

const STEP = 1 / 60;
const keys = new Set();
export const touchMove = { x: 0, y: 0 };
let jumpQueued = false;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function Player({ type, phase, sim }) {
  const accumulator = useRef(0); const publishTimer = useRef(0); const verticalSpeed = useRef(0);
  const playerY = useRef(1.62); const spawn = useRef(null); const hasGroundContact = useRef(false);
  const stamina = useRef(100); const stepDistance = useRef(0); const bobPhase = useRef(0); const walkedDistance = useRef(0);
  const setPlayerState = useGame(s => s.setPlayerState);
  const setRunMetrics = useGame(s => s.setRunMetrics);
  useEffect(() => {
    const down = e => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); if (e.code === 'Space' && !e.repeat) jumpQueued = true; keys.add(e.code); };
    const up = e => keys.delete(e.code);
    const clear = () => keys.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);
  useFrame(({ camera }, dt) => {
    if (typeof window !== 'undefined') window.__exoCamera = camera;
    if (type === 'giant' || phase !== 'alive') { accumulator.current = 0; if (phase !== 'alive') jumpQueued = false; return; }
    if (!spawn.current) {
      spawn.current = { x: camera.position.x, z: camera.position.z };
      playerY.current = terrainHeight(camera.position.x, camera.position.z, type) + 1.62;
      stamina.current = useGame.getState().playerState.stamina;
      verticalSpeed.current = 0; hasGroundContact.current = true;
    }
    accumulator.current = Math.min(accumulator.current + Math.min(dt, .1), .1);
    const g = Math.max(.01, Number(sim?.g) || 1);
    const gravity = 9.81 * g;
    const walk = clamp(4 / Math.sqrt(Math.max(g, .3)), 1.5, 8);
    const highGravity = g > 1.6;
    while (accumulator.current >= STEP) {
      const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')) - touchMove.y;
      const strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + touchMove.x;
      const mag = Math.hypot(forward, strafe);
      const sprintKey = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const canSprint = sprintKey && stamina.current > 0;
      const sprint = canSprint ? 1.6 : 1;
      if (canSprint && mag > .05) stamina.current = Math.max(0, stamina.current - (highGravity ? 24 : 12) * STEP);
      else stamina.current = Math.min(100, stamina.current + (highGravity ? 9 : 18) * STEP);

      const oldX = camera.position.x; const oldZ = camera.position.z;
      if (mag > .01) {
        const direction = camera.getWorldDirection(camera.userData.moveDirection || (camera.userData.moveDirection = camera.position.clone()));
        direction.y = 0; direction.normalize();
        const right = camera.userData.moveRight || (camera.userData.moveRight = camera.position.clone());
        right.crossVectors(direction, camera.up).normalize();
        const scale = Math.min(1, mag) * walk * sprint * STEP;
        camera.position.addScaledVector(direction, (forward / mag) * scale);
        camera.position.addScaledVector(right, (strafe / mag) * scale);
      }
      const moved = Math.hypot(camera.position.x - oldX, camera.position.z - oldZ);
      const ground = terrainHeight(camera.position.x, camera.position.z, type);
      const onGround = verticalSpeed.current <= 0 && playerY.current <= ground + 1.621;
      if (onGround) {
        playerY.current = ground + 1.62; verticalSpeed.current = 0;
        if (!hasGroundContact.current) { playFootstep(g, true); hasGroundContact.current = true; }
        if (jumpQueued) {
          if (stamina.current > 0) {
            verticalSpeed.current = 4.5;
            stamina.current = Math.max(0, stamina.current - 18); playFootstep(g, false); hasGroundContact.current = false;
          }
          jumpQueued = false;
        }
      } else {
        verticalSpeed.current -= gravity * STEP;
        playerY.current += verticalSpeed.current * STEP;
        hasGroundContact.current = false;
      }
      const grounded = hasGroundContact.current;
      if (grounded && moved > 0) {
        walkedDistance.current += moved;
        stepDistance.current += moved; bobPhase.current += moved * 5;
        if (stepDistance.current >= 1.55) { stepDistance.current %= 1.55; playFootstep(g); }
      }
      const bob = grounded && moved > 0 ? Math.sin(bobPhase.current) * Math.min(.11, .025 / g) : 0;
      camera.position.y = playerY.current + bob;

      publishTimer.current += STEP;
      if (publishTimer.current >= .1) {
        publishTimer.current %= .1;
        const dz = camera.position.z - spawn.current.z;
        const s = clamp(.6 - dz / 400, -1, 1); // Substellar axis is fixed along world -Z.
        const sheltered = getShelterSpotsNear(camera.position.x, camera.position.z, 6)
          .some(spot => Math.hypot(camera.position.x - spot.x, camera.position.z - spot.z) <= 6);
        const forward = camera.getWorldDirection(camera.userData.moveDirection || (camera.userData.moveDirection = camera.position.clone()));
        forward.y = 0; forward.normalize(); const targetZ = s >= 0 ? 1 : -1;
        const bearing = Math.atan2(forward.z * 0 - forward.x * targetZ, forward.x * 0 + forward.z * targetZ) * 180 / Math.PI;
        setPlayerState({ s, sheltered, stamina: stamina.current, terminatorBearing: Number.isFinite(bearing) ? bearing : 0 });
        setRunMetrics({ distanceWalked: walkedDistance.current });
      }
      accumulator.current -= STEP;
    }
  });
  const touchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return <PointerLockControls enabled={phase === 'alive' && type !== 'giant' && !touchDevice} selector=".surface-root canvas" onLock={() => useGame.getState().setPointerLocked(true)} onUnlock={() => useGame.getState().setPointerLocked(false)} />;
}

export function PlayerOverlay({ phase, type }) {
  const locked = useGame(s => s.pointerLocked); const hasLocked = useGame(s => s.hasPointerLocked); const stamina = useGame(s => s.playerState.stamina);
  const touchDevice = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const left = useRef(null); const look = useRef(null);
  const touchStart = (e, ref, lookMode = false) => { e.preventDefault(); const p = e.changedTouches[0]; ref.current = { id: p.identifier, x: p.clientX, y: p.clientY, originX: p.clientX, originY: p.clientY, lookMode }; };
  const touchMoveHandler = (e, ref) => {
    const start = ref.current; if (!start) return;
    const p = [...e.touches].find(t => t.identifier === start.id); if (!p) return;
    e.preventDefault(); const dx = p.clientX - start.x; const dy = p.clientY - start.y;
    if (start.lookMode) {
      const camera = window.__exoCamera;
      if (camera) { camera.rotation.order = 'YXZ'; camera.rotation.y -= dx * .003; camera.rotation.x = clamp(camera.rotation.x - dy * .003, -1.35, 1.35); }
      start.x = p.clientX; start.y = p.clientY;
    } else {
      touchMove.x = clamp(dx / 48, -1, 1); touchMove.y = clamp(dy / 48, -1, 1);
      const knob = ref.current?.querySelector('i');
      if (knob) knob.style.transform = `translate(calc(-50% + ${clamp(dx, -42, 42)}px), calc(-50% + ${clamp(dy, -42, 42)}px))`;
    }
  };
  const endTouch = (e, ref, moving = false) => { if (!ref.current) return; if (![...e.touches].some(t => t.identifier === ref.current.id)) { const element = ref.current; ref.current = null; if (moving) { touchMove.x = 0; touchMove.y = 0; const knob = element?.querySelector?.('i'); if (knob) knob.style.transform = 'translate(-50%,-50%)'; } } };
  if (phase !== 'alive' || type === 'giant') return null;
  return <div className="player-overlay">
    {!locked && !touchDevice && <div className="lock-hint">CLICK TO {hasLocked ? 'RESUME' : 'LOOK AROUND'}<small>ESC TO RELEASE · SURVIVAL TIMER CONTINUES</small></div>}
    <div className="stamina-readout"><span>STAMINA</span><div><i style={{ width: `${stamina}%` }} /></div></div>
    <div className="touch-joystick" ref={left} onTouchStart={e=>touchStart(e,left)} onTouchMove={e=>touchMoveHandler(e,left)} onTouchEnd={e=>endTouch(e,left,true)} onTouchCancel={e=>endTouch(e,left,true)}><i/></div>
    <div className="touch-look" ref={look} onTouchStart={e=>touchStart(e,look,true)} onTouchMove={e=>touchMoveHandler(e,look)} onTouchEnd={e=>endTouch(e,look)} onTouchCancel={e=>endTouch(e,look)} />
  </div>;
}
