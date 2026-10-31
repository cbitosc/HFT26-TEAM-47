import { API_BASE } from '../data/apiBase.js';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, Shield, TriangleAlert, X } from 'lucide-react';
import { useGame } from '../store/useGame.js';
import { playOutcome } from '../audio/sfx.js';

const NUMBERS=/(?:^|[^\w.])(-?\d[\d,]*(?:\.\d+)?)(?![\w.])/g;
const UNITS={pl_eqt:' K',pl_rade:' R⊕',pl_bmasse:' M⊕',pl_orbper:' days',pl_orbsmax:' AU',pl_insol:'× Earth flux',st_teff:' K',st_rad:' R☉',st_mass:' M☉',sy_dist:' pc',disc_year:'',dps:' HP/s',totalDps:' HP/s',elapsed:' s',health:'%'};

Object.assign(UNITS, { distanceWalked: ' m', timeSheltered: ' s', closestApproachToTerminator: ' m' });

function numericTokens(value) {
  const result=[]; let match;
  while((match=NUMBERS.exec(String(value)))!==null) result.push({raw:match[1],value:Number(match[1].replaceAll(',',''))});
  NUMBERS.lastIndex=0; return result;
}

function sourceEntries(value,path,entries) {
  if(typeof value==='number'&&Number.isFinite(value)) {
    const variants=new Set([value]); for(const places of [0,1,2,3])variants.add(Number(value.toFixed(places)));
    const field=path.split('.').at(-1).replace(/\]$/, ''); const unit=UNITS[field]||'';
    for(const variant of variants)entries.push({value:variant,label:`${field}: ${variant}${unit}`});
  } else if(typeof value==='string') {
    for(const token of numericTokens(value))entries.push({value:token.value,label:`${path}: ${token.raw}`});
  } else if(Array.isArray(value))value.forEach((item,i)=>sourceEntries(item,`${path}[${i}]`,entries));
  else if(value&&typeof value==='object')Object.entries(value).forEach(([key,item])=>sourceEntries(item,path?`${path}.${key}`:key,entries));
}

export function checkNumberClaims(text,planet,sim) {
  const entries=[]; sourceEntries(planet,'',entries); sourceEntries(sim,'sim',entries);
  return numericTokens(text).map((token,index)=>{
    const match=entries.find(entry=>Math.abs(entry.value-token.value)<1e-8);
    return {id:`${index}-${token.raw}`,raw:token.raw,verified:Boolean(match),source:match?.label||`Unverified claim: ${token.raw}`};
  });
}

function fallbackText(planet,sim) {
  const p=planet||{}; const top=sim?.hazards?.find(h=>h.id===sim.cause);
  const elapsed=Number(sim?.run?.elapsed??sim?.elapsed??0).toFixed(1);
  const health=Math.round(Number(sim?.run?.health??sim?.health??0));
  const total=Number(sim?.totalDps||0).toFixed(2); const dps=Number(top?.dps||0).toFixed(2);
  const measurement=top?.value||'the available catalog measurements';
  const metrics = metricSummary(sim);
  if((sim?.run?.outcome||sim?.outcome)==='survived')return `You survived 60 seconds on ${p.pl_name||'this world'} with ${health}% suit integrity; ${top?.label||'Environmental stress'} led at ${dps} HP/s from ${measurement}, within ${total} total modeled HP/s. ${metrics} NASA does not know this planet's atmosphere, magnetic field, or verified surface conditions. No exoplanet is confirmed habitable.`;
  return `You lasted ${elapsed} seconds on ${p.pl_name||'this world'} before ${top?.label||'environmental stress'} ended the run at ${dps} HP/s from ${measurement}, within ${total} total modeled HP/s; integrity reached ${health}%. ${metrics} NASA does not know this planet's atmosphere, magnetic field, or verified surface conditions. No exoplanet is confirmed habitable.`;
}

function metricSummary(sim) {
  const metrics = sim?.runMetrics || {};
  const walked = Number(metrics.distanceWalked || 0).toFixed(1);
  const sheltered = Number(metrics.timeSheltered || 0).toFixed(1);
  const approach = Number.isFinite(metrics.closestApproachToTerminator)
    ? `${Number(metrics.closestApproachToTerminator).toFixed(1)} m from the terminator`
    : 'not modeled for this world';
  return `You walked ${walked} m and spent ${sheltered} seconds sheltered; closest terminator approach was ${approach}.`;
}

function chartPoints(history) {
  const points=history?.length?history:[{t:0,health:100},{t:60,health:0}];
  return points.map((point,index)=>`${index/Math.max(1,points.length-1)*100},${100-Math.max(0,Math.min(100,point.health))}`).join(' ');
}

export default function PostMortem({onClose}) {
  const phase=useGame(s=>s.phase); const planet=useGame(s=>s.planet); const sim=useGame(s=>s.sim); const history=useGame(s=>s.history); const lines=useGame(s=>s.narrationLines); const setLines=useGame(s=>s.setNarrationLines); const board=useGame(s=>s.sessionLeaderboard); const runMetrics=useGame(s=>s.runMetrics);
  const [visible,setVisible]=useState(false); const [loading,setLoading]=useState(false); const [text,setText]=useState(''); const outcome=phase==='survived'?'survived':'dead';
  useEffect(()=>{
    if(phase!=='dead'&&phase!=='survived'){setVisible(false);setLoading(false);setText('');return;}
    const state=useGame.getState(); const runSim={...state.sim,run:{outcome:phase,elapsed:state.elapsed,health:state.health},runMetrics:state.runMetrics};
    setVisible(false);setLoading(true);setText('');playOutcome(phase==='survived');
    const reveal=window.setTimeout(()=>setVisible(true),phase==='dead'?1500:700);
    fetch(`${API_BASE}/narrate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'postmortem',planet:state.planet,sim:runSim})})
      .then(response=>response.ok?response.json():Promise.reject(new Error('Narrator unavailable')))
      .then(data=>{
        const generated=String(data.text||'').trim();
        const validSentences=(generated.match(/[.!?](?:\s|$)/g)||[]).length;
        const validEnd=generated.endsWith('No exoplanet is confirmed habitable.');
        const safe=validSentences>=3&&validSentences<=4&&validEnd?generated:fallbackText(state.planet,runSim);
        setText(safe);setLines([safe]);
      }).catch(()=>{const safe=fallbackText(state.planet,runSim);setText(safe);setLines([safe]);}).finally(()=>setLoading(false));
    return()=>window.clearTimeout(reveal);
  },[phase,setLines]);

  const claims=useMemo(()=>checkNumberClaims(text||lines[0]||'',planet,sim?{...sim,run:{outcome,elapsed:useGame.getState().elapsed,health:useGame.getState().health},runMetrics}:{}),[text,lines,planet,sim,outcome,runMetrics]);
  if(phase!=='dead'&&phase!=='survived')return null;
  if(!visible)return <div className={`result-shade ${phase}`}><div className="signal-loss"><div className="flatline"><svg viewBox="0 0 420 64" preserveAspectRatio="none"><path d="M0 32 H112 L126 32 L137 10 L153 54 L169 32 H193 L205 32 L218 16 L231 47 L244 32 H420"/></svg></div><h1>{phase==='dead'?'SIGNAL LOST':'SIGNAL STABLE'}</h1></div></div>;
  const points=chartPoints(history); const run=board.slice().reverse().find(entry=>entry.planet===planet?.pl_name);
  return <div className={`result-shade ${phase}`}><article className="postmortem-card"><div className="postmortem-top"><div className={`result-shield ${phase}`}><Shield size={19}/></div><button className="dismiss-result" aria-label="Close report" onClick={onClose}><X size={16}/></button></div>
    <small className="post-kicker">MISSION DEBRIEF · {phase==='dead'?'FATALITY REPORT':'SURVIVAL REPORT'}</small><h2>{phase==='dead'?'SIGNAL LOST':'SIGNAL STABLE'}</h2>
    <p className="post-planet">{planet?.pl_name||'unknown planet'} <span>·</span> {phase==='dead'?`${useGame.getState().elapsed.toFixed(2)}s survived`:'60.00s survived'}{run&&<span className="record-chip">SESSION RECORD SAVED</span>}</p>
    <div className="post-chart"><div><span>SUIT INTEGRITY · 0.25 S SAMPLES</span><b>{Math.round(useGame.getState().health)}%</b></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points}/></svg></div>
    <div className="analysis-copy">{loading?<span className="analysis-loading"><LoaderCircle size={14}/> Synthesizing catalog-grounded report…</span>:<p>{text||lines[0]||fallbackText(planet,{...sim,runMetrics})}</p>}</div>
    <div className="run-metric-chips"><span>WALKED <b>{Number(runMetrics?.distanceWalked||0).toFixed(1)} m</b></span><span>SHELTERED <b>{Number(runMetrics?.timeSheltered||0).toFixed(1)} s</b></span><span>TERMINATOR <b>{Number.isFinite(runMetrics?.closestApproachToTerminator)?`${runMetrics.closestApproachToTerminator.toFixed(1)} m`:'N/A'}</b></span></div>
    <div className="claim-heading"><span>NUMBER CLAIM CHECK</span><small>Text numbers compared with NASA row + simulation JSON</small></div>
    <div className="data-chips">{claims.length?claims.map(claim=><span key={claim.id} className={claim.verified?'claim-ok':'claim-warning'}>{claim.verified?<Check size={11}/>:<TriangleAlert size={11}/>}<b>{claim.verified?claim.source:claim.source}</b></span>):<span className="claim-ok"><Check size={11}/> No numeric claims in the report</span>}</div>
    <div className="debrief-board"><div className="debrief-board-title">SESSION LEADERBOARD <i/>{board.length} RUN{board.length===1?'':'S'}</div><div className="debrief-board-list">{board.slice().reverse().map((entry,index)=><div className="debrief-board-row" key={`${entry.planet}-${index}`}><b>{entry.planet}</b><span>{entry.survivalTime.toFixed(2)}s</span><span className={entry.outcome==='survived'?'board-safe':'board-cause'}>{entry.causeOfDeath}</span></div>)}</div></div>
    <div className="debrief-source"><span>NASA CATALOG DATA + SIMULATION MODEL</span><span>MODEL DPS {sim?.totalDps.toFixed(2)??'unknown'}</span></div>
    <button className="again-btn" onClick={onClose}><ArrowLeft size={14}/> RETURN TO PLANET SELECT</button>
  </article></div>;
}
