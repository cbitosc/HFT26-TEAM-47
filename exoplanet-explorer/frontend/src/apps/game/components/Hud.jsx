import { API_BASE } from '../data/apiBase.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, Heart, Info, LoaderCircle, Shield } from 'lucide-react';
import { useGame } from '../store/useGame.js';
import PostMortem from './PostMortem.jsx';
import AssumptionsModal from './AssumptionsModal.jsx';

function formatTimer(value){const total=Math.max(0,value);return `00:${(total%60).toFixed(1).padStart(4,'0')}`;}
function fallbackCallout(sim){const top=sim?.hazards?.find(h=>h.id===sim.cause)||sim?.hazards?.[0];return `Warning: ${top?.label||'Environmental hazard'} reads ${top?.value||'unknown'}; model contribution is ${Number(top?.dps||0).toFixed(2)} HP/s.`;}

function Typewriter({text,id}){
  const [shown,setShown]=useState('');
  useEffect(()=>{if(!text){setShown('');return;}setShown('');let position=0;const timer=window.setInterval(()=>{position+=1;setShown(text.slice(0,position));if(position>=text.length)window.clearInterval(timer);},19);return()=>window.clearInterval(timer);},[text,id]);
  return <span className="narrator-typewriter">{shown}<i/></span>;
}

export default function Hud({planets=[],source='CACHED',narration={}}){
  const phase=useGame(s=>s.phase); const planet=useGame(s=>s.planet); const sim=useGame(s=>s.sim); const health=useGame(s=>s.health); const elapsed=useGame(s=>s.elapsed); const descentElapsed=useGame(s=>s.descentElapsed); const playerState=useGame(s=>s.playerState);
  const [callout,setCallout]=useState(''); const [calloutId,setCalloutId]=useState(0); const [assumptionsOpen,setAssumptionsOpen]=useState(false);
  const previousHealth=useRef(100); const fired=useRef(new Set());
  const thresholds=[75,50,25];
  const topHazard=useMemo(()=>sim?.hazards.reduce((best,h)=>h.dps>best.dps?h:best,sim.hazards[0]),[sim]);
  const critical=phase==='alive'&&health<35; const danger=phase==='alive'&&health<50;
  const pulsePeriod=1.3-Math.min(1,Math.max(0,35-health)/35)*.95;
  const strength=phase==='alive'?Math.max(0,1-health/100):0;
  const pointerLocked=useGame(s=>s.pointerLocked); const hasPointerLocked=useGame(s=>s.hasPointerLocked); const coarsePointer=typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches;
  const type=planet?.pl_rade>2.5?'giant':(sim?.T??288)>700?'lava':(sim?.T??288)>310?'hot':(sim?.T??288)<273?'cold':'rocky';
  const effects=sim?.hazards.filter(h=>h.id==='radiation'?h.dps>.25:h.sev>.05).map(h=>h.id)||[];

  useEffect(()=>{
    if(phase==='select'||phase==='descent'){previousHealth.current=100;fired.current.clear();setCallout('');return;}
    if(phase!=='alive'||!sim||!planet)return;
    const previous=previousHealth.current;
    for(const threshold of thresholds){
      if(previous>threshold&&health<=threshold&&!fired.current.has(threshold)){
        fired.current.add(threshold);setCalloutId(id=>id+1);
        const cached=source==='CACHED'?narration?.[planet.pl_name]?.[String(threshold)]:null;
        if(cached){setCallout(cached);}
        else if(narration?.[planet.pl_name]){setCallout(fallbackCallout(sim));}
        else{
          fetch(`${API_BASE}/narrate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'callout',tier:threshold,planet,sim})})
            .then(r=>r.ok?r.json():Promise.reject(new Error('Narrator unavailable')))
            .then(data=>{const text=String(data.text||fallbackCallout(sim)).trim();const sentences=(text.match(/[.!?](?:\s|$)/g)||[]).length;setCallout(text.split(/\s+/).length<=20&&sentences===1?text:fallbackCallout(sim));})
            .catch(()=>setCallout(fallbackCallout(sim)));
        }
      }
    }
    previousHealth.current=health;
  },[phase,health,planet,sim,source,narration]);

  if(phase==='select')return null;
  const remaining=phase==='descent'?3-descentElapsed:60-elapsed;
  return <div className={`hud-layer phase-${phase} world-${type} ${effects.map(x=>`hazard-${x}`).join(' ')}`}>
    <div className={`red-vignette ${critical?'pulse':''}`} style={{'--vignette':strength,'--pulse-period':`${pulsePeriod}s`}}/>
    <div className="desaturation-overlay" style={{opacity:strength*.62}}/>
    {(type==='hot'||type==='lava')&&<div className="heat-shimmer"/>}{type==='cold'&&<div className="frost-edge"/>}
    {effects.includes('radiation')&&<div className="radiation-grain"/>}
    <section className="hud-top-left"><div className="hud-brand"><span className="hud-brand-icon">EXO</span><span>FIELD SURVIVAL <i>·</i> {source}</span></div>
      <div className="integrity-readout"><div><span><Heart size={13}/> SUIT INTEGRITY</span><b className={critical?'low':''}>{Math.ceil(health)}<i>%</i></b></div><div className="integrity-track"><i style={{width:`${health}%`}}/></div></div>
      {sim&&<div className="hazard-list">{sim.hazards.map(h=><div className={`hazard-entry ${h.id===topHazard?.id?'top-hazard':''}`} key={h.id}><div className="hazard-heading"><span className={`hazard-symbol ${h.id}`}>{h.id==='thermal'?'◈':h.id==='radiation'?'☼':h.id==='gravity'?'⌖':'⌂'}</span><b>{h.label.toUpperCase()}</b><small>NASA · {h.source}</small></div><div className="hazard-detail"><span>{h.value}</span><strong>{h.dps.toFixed(2)} <i>HP/s</i></strong></div><div className="hazard-track"><i style={{width:`${Math.min(100,h.dps/60*100)}%`}}/></div></div>)}</div>}
      <div className="data-source-note"><Info size={12}/> NASA field tags are shown with each modeled hazard.</div>
    </section>
    <div className="hud-top-right"><span className="timer-caption">{phase==='descent'?'POD ENTRY':'SURVIVAL WINDOW'}</span><div className={`countdown ${critical?'countdown-critical':''}`}>{formatTimer(remaining)}</div><span className="timer-subline">{phase==='descent'?'TO SURFACE CONTACT':`T+ ${formatTimer(elapsed)}`}</span></div>
    <div className="hud-bottom-left">{danger&&<div className="warning-ticker"><AlertTriangle size={14}/><span>WARNING: {topHazard?.label.toUpperCase()} CRITICAL</span><i>·</i><span>INTEGRITY {Math.ceil(health)}%</span></div>}<div className="planet-ident"><span className="planet-signal"/><span>{planet?.pl_name||'UNKNOWN PLANET'}</span><i>·</i><span>{planet?.hostname||'HOST UNKNOWN'}</span></div></div>
    {playerState?.sheltered&&phase==='alive'&&<div className="shelter-tag">◈ SHELTERED <small>ROCK COVER</small></div>}
    <div className="hud-bottom-right"><div className="assumption-access"><span>{sim?.tidallyLocked?'TIDALLY LOCKED':'DAY LENGTH ASSUMED'}</span><span>STAR {sim?.starAngularDeg?.toFixed(2)??'unknown'}°{sim?.starAngularEstimated?' · EST.':''}</span></div><button className="assumption-button" onClick={()=>setAssumptionsOpen(true)}><Info size={14}/> ASSUMPTIONS</button><span className="catalog-chip">{source==='LIVE NASA'?'LIVE':'CACHED'} <i/> NASA TAP</span></div>
    {phase==='descent'&&<div className="descent-callout"><span className="descent-ring"><ArrowDown size={20}/></span><small>DESCENT INITIATED</small><b>BRACE FOR IMPACT</b><span>3 second entry sequence</span></div>}
        <div className="hud-bottom-center">
      {phase==='alive'&&type!=='giant'&&!coarsePointer&&!pointerLocked&&<div className="lock-hint" role="status">CLICK TO {hasPointerLocked?'RESUME':'LOOK AROUND'}<small>ESC TO RELEASE · SURVIVAL TIMER CONTINUES</small></div>}
      {phase==='alive'&&(sim?.tidallyLocked&&<div className="terminator-compass"><b>TERMINATOR</b><span className="compass-disc"><i style={{transform:`rotate(${playerState?.terminatorBearing||0}deg)`}}>▲</i></span><small>{playerState?.s>0?'MOVE AWAY FROM STAR':'MOVE TOWARD STAR'} · {Number.isFinite(playerState?.s)?playerState.s.toFixed(2):'unknown'}</small></div>)}
      {(phase==='descent'||(phase==='alive'&&callout))&&<div className="narrator-subtitle" aria-live="polite">{callout?<Typewriter text={callout} id={calloutId}/>:phase==='descent'?<span className="entry-line"><LoaderCircle size={13}/> Descending to surface <i/></span>:null}</div>}
      {phase==='alive'&&<><div className="movement-help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>MOVE · SHIFT SPRINT · SPACE JUMP</span></div><div className="g-feel"><b>G-FEEL</b><span>Jump height {sim?.g>0?((4.5*4.5)/(2*9.81*sim.g)).toFixed(1):'unknown'} m</span><small>{sim?.g>1.6?'HIGH GRAVITY':sim?.g<.8?'LOW GRAVITY':'EARTH-LIKE'} · g {Number.isFinite(sim?.g)?sim.g.toFixed(2):'unknown'}</small></div>{type!=='giant'&&<div className="stamina-block"><span>STAMINA</span><div className="stamina-track" role="progressbar" aria-label="Stamina" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playerState?.stamina??100)}><i style={{width:`${playerState?.stamina??100}%`}}/></div></div>}</>}
      <div className="star-angle-note">STAR ANGLE {sim?.starAngularDeg?.toFixed(2) ?? 'unknown'}° {sim?.starAngularEstimated?'· EST.':''} <span>VISUAL SIZE EXAGGERATED</span></div>
    </div>
    <AssumptionsModal open={assumptionsOpen} onClose={()=>setAssumptionsOpen(false)} planets={planets} source={source} planet={planet}/>
    <PostMortem onClose={()=>useGame.getState().reset()}/>
  </div>;
}
