import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, ArrowRight, Info, Search, Shield, Sparkles } from 'lucide-react';
import { computeSurvival } from '../sim/survival.js';
import { useGame } from '../store/useGame.js';
import { unlockAudio, playTone, startDescentRumble } from '../audio/sfx.js';
import AssumptionsModal from './AssumptionsModal.jsx';
import '../components/planet-select.css';

const DEMO_ORDER=['Earth','TRAPPIST-1 e','TRAPPIST-1 f','Proxima Cen b','Kepler-186 f','55 Cnc e','HD 209458 b','Kepler-452 b'];
const fmt=(value,digits=0,suffix='')=>value==null||!Number.isFinite(Number(value))?'unknown':`${Number(value).toFixed(digits)}${suffix}`;
function typeFor(p){const sim=computeSurvival(p);if(Number(p.pl_rade)>2.5)return 'giant';if(sim.T>700)return 'lava';if(sim.T>310)return 'hot';if(sim.T<273)return 'ice';return 'temperate';}
function tint(type){return ({temperate:'#54b9a6',ice:'#88c8ef',hot:'#e9894f',lava:'#ff4935',giant:'#b57ddd'})[type]||'#8ab8ac';}

function PreviewSpheres({ planets, rootRef }) {
  const refs=useRef([]); const {camera,gl}=useThree(); const colors=useMemo(()=>planets.map(p=>tint(typeFor(p))),[planets]);
  useFrame((_,dt)=>{
    const root=rootRef.current; const canvasRect=gl.domElement.getBoundingClientRect();
    if(!root||!canvasRect.width||!canvasRect.height)return;
    const slots=root.querySelectorAll('[data-preview-slot]');
    const distance=camera.position.z; const viewHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*distance;
    slots.forEach((slot,index)=>{
      const mesh=refs.current[index]; const rect=slot.getBoundingClientRect();
      if(!mesh||rect.width===0||rect.right<canvasRect.left||rect.left>canvasRect.right){if(mesh)mesh.visible=false;return;}
      mesh.visible=true;
      const nx=((rect.left+rect.width/2-canvasRect.left)/canvasRect.width)*2-1;
      const ny=1-((rect.top+rect.height/2-canvasRect.top)/canvasRect.height)*2;
      mesh.position.set(nx*viewHeight*camera.aspect/2,ny*viewHeight/2,0);
      mesh.scale.setScalar((rect.height*.41/canvasRect.height)*viewHeight);
      mesh.rotation.y+=dt*(index%2?.36:.48); mesh.rotation.x=Math.sin(performance.now()*.0004+index)*.08;
    });
  });
  return <>
    {planets.map((p,i)=><mesh key={`${p.pl_name}-${i}`} ref={el=>refs.current[i]=el} visible={false}>
      <sphereGeometry args={[1,32,24]}/><meshStandardMaterial color={colors[i]} roughness={.72} metalness={.08} emissive={colors[i]} emissiveIntensity={.08}/>
    </mesh>)}
  </>;
}

function Starfield({ planets, rootRef, lowQuality }) {
  return <>
    <color attach="background" args={['#070b13']}/><fog attach="fog" args={['#0b1420',18,65]}/>
    <ambientLight intensity={.7} color="#a9bbcf"/><directionalLight position={[-4,6,8]} intensity={1.8} color="#fff0d8"/>
    <Stars radius={65} depth={45} count={lowQuality?600:1450} factor={2.2} saturation={.5} fade speed={.18}/>
    <PreviewSpheres planets={planets} rootRef={rootRef}/>
    {!lowQuality&&<EffectComposer multisampling={0}><Bloom intensity={.68} luminanceThreshold={.68} mipmapBlur/></EffectComposer>}
  </>;
}

export default function PlanetSelect({ planets, source, lowQuality, loading=false }) {
  const [query,setQuery]=useState(''); const [searchActive,setSearchActive]=useState(false); const [assumptionsOpen,setAssumptionsOpen]=useState(false); const rootRef=useRef(null); const rowRef=useRef(null);
  const planet=useGame(s=>s.planet); const selectPlanet=useGame(s=>s.selectPlanet); const drop=useGame(s=>s.drop); const records=useGame(s=>s.sessionLeaderboard);
  const displayed=useMemo(()=>{
    if(query.trim())return planets.filter(p=>String(p.pl_name||'').toLowerCase().includes(query.trim().toLowerCase())).slice(0,32);
    const demo=DEMO_ORDER.map(name=>planets.find(p=>p.pl_name===name)).filter(Boolean);
    return demo.length?demo:planets.slice(0,8);
  },[query,planets]);
  const moveRow=direction=>rowRef.current?.scrollBy({left:direction*290,behavior:'smooth'});
  const selected=planet&&displayed.some(p=>p.pl_name===planet.pl_name)?planet:displayed[0];
  const begin=()=>{if(!selected)return;unlockAudio();playTone(520,.16,'triangle');drop(selected);startDescentRumble();};
  const previous=selected?records.filter(r=>r.planet===selected.pl_name):[];
  return <section className="planet-select-screen" ref={rootRef}>
    <div className="select-scene"><Canvas dpr={lowQuality?[.8,1]:[1,1.2]} gl={{alpha:false,antialias:false,powerPreference:'high-performance'}} camera={{position:[0,0,10],fov:40}}><Starfield planets={displayed} rootRef={rootRef} lowQuality={lowQuality}/></Canvas></div>
    <header className="select-header"><a className="select-logo" href="#home"><span>EXO</span>—VERSE</a><div className="select-edition">EXOPLANET SURVIVAL SIMULATOR <i/> {source}</div><button className="search-open" onClick={()=>{setSearchActive(true);document.getElementById('planet-search')?.focus();}}><Search size={15}/> SEARCH NASA CATALOG</button><button className="select-assumptions" onClick={()=>setAssumptionsOpen(true)}><Info size={13}/> DATA NOTES</button></header>
    <div className="select-content">
      <div className="select-title-row"><div><div className="select-eyebrow"><Sparkles size={13}/> CHOOSE YOUR WORLD · NASA ARCHIVE</div><h1>Pick your <em>planet.</em></h1><p>Every surface below is shaped by measured planetary data. Survival is a simulation.</p></div>
        <label className={`planet-search ${searchActive||query?'active':''}`}><Search size={16}/><input id="planet-search" value={query} onFocus={()=>setSearchActive(true)} onBlur={()=>setSearchActive(Boolean(query))} onChange={e=>setQuery(e.target.value)} placeholder="Search all NASA planets by name"/><kbd>↵</kbd></label>
      </div>
      <div className="carousel-title"><span>{query?`${displayed.length} MATCHING WORLDS${displayed.length===32?' · REFINE SEARCH FOR MORE':''}`:loading?'LOADING CACHED + NASA CATALOG…':'DEMO DESTINATIONS'}</span><div><button onClick={()=>moveRow(-1)} aria-label="Previous planets"><ArrowLeft size={15}/></button><button onClick={()=>moveRow(1)} aria-label="Next planets"><ArrowRight size={15}/></button></div></div>
      <div className="planet-carousel" ref={rowRef}>{displayed.map(p=>{
        const type=typeFor(p); const chosen=selected?.pl_name===p.pl_name; const sim=computeSurvival(p); const record=[...records].reverse().find(r=>r.planet===p.pl_name);
        return <button key={p.pl_name} className={`planet-card ${chosen?'chosen':''} type-${type}`} onClick={()=>selectPlanet(p)} aria-pressed={chosen}>
          <div className="card-topline"><span className="card-type"><i style={{background:tint(type)}}/>{type.toUpperCase()}</span><span className="card-host">{p.hostname||'unknown host'}</span></div>
          <div className="sphere-slot" data-preview-slot="true"><span className="sphere-aura"/></div>
          <div className="card-info"><h2>{p.pl_name||'Unknown planet'}</h2><p>{p.discoverymethod||'Discovery method unknown'} <i/> {p.disc_year??'year unknown'}</p>
            <div className="card-stats"><div><small>RADIUS <b>pl_rade</b></small><strong>{fmt(p.pl_rade,2,' R⊕')}</strong></div><div><small>TEMP <b>pl_eqt</b></small><strong>{fmt(p.pl_eqt,0,' K')}{p.pl_eqt==null&&<i> EST.</i>}</strong></div><div><small>ORBIT <b>pl_orbper</b></small><strong>{fmt(p.pl_orbper,2,' d')}</strong></div></div>
            <div className="survival-teaser"><span>PREDICTED SURVIVAL</span><b>{record?`${record.survivalTime.toFixed(1)}s · ${record.outcome==='survived'?'SURVIVED':'SIGNAL LOST'}`:'???'}</b></div>
            {chosen&&<div className="card-select-indicator"><Shield size={13}/> SELECTED FOR DROP</div>}
          </div>
        </button>;
      })}{displayed.length===0&&<div className="no-results">No planet names match “{query}”. Try another search.</div>}</div>
      <div className="select-bottom-row"><span className="scroll-hint"><ArrowLeft size={12}/> SCROLL TO EXPLORE <ArrowRight size={12}/></span><div className="selected-summary"><span>SELECTED</span><b>{selected?.pl_name||'No match selected'}</b><small>{simSummary(selected,simValue(selected))}</small></div><button className="big-drop-button" disabled={!selected} onClick={begin}>DROP <ArrowDown size={18}/></button></div>
      {records.length>0&&<section className="session-board"><div className="board-heading"><span>SESSION LEADERBOARD</span><i/>{records.length} ATTEMPT{records.length===1?'':'S'}</div><div className="board-scroll"><div className="board-row board-header"><span>PLANET</span><span>SURVIVAL TIME</span><span>OUTCOME / CAUSE</span></div>{[...records].reverse().map((r,i)=><div className="board-row" key={`${r.planet}-${i}`}><b>{r.planet}</b><span>{r.survivalTime.toFixed(2)} sec</span><span className={r.outcome==='survived'?'board-safe':'board-cause'}>{r.outcome==='survived'?'SIGNAL STABLE':r.causeOfDeath}</span></div>)}</div></section>}
    </div>
    <footer className="select-footer"><span>SIMULATION MODEL · NOT A HABITABILITY CLAIM</span><span>DATA SOURCE: NASA EXOPLANET ARCHIVE <i/> CACHED VALUES APPROXIMATE</span></footer>
    <AssumptionsModal open={assumptionsOpen} onClose={()=>setAssumptionsOpen(false)} planets={planets} source={source} planet={selected}/>
  </section>;
}

function simValue(p){return p?computeSurvival(p):null;}
function simSummary(p,sim){return p&&sim?`${sim.totalDps.toFixed(2)} modeled HP/s · ${sim.cause} lead`:'';}
