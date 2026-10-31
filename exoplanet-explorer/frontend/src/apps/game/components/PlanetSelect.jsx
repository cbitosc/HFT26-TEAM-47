import  { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, ArrowRight,  Search,  Sparkles } from 'lucide-react';
import { computeSurvival } from '../sim/survival.js';
import { useGame } from '../store/useGame.js';
import { unlockAudio, playTone, startDescentRumble } from '../audio/sfx.js';
import AssumptionsModal from './AssumptionsModal.jsx';
import { planetTextureFor } from './planetTextures.js';
import BackButton from './BackButton.jsx';
import { cardPose, cardTransform, carouselLayout, stageHeight } from './carouselLayout.js';

const DEMO_ORDER=['Earth','TRAPPIST-1 e','TRAPPIST-1 f','Proxima Cen b','Kepler-186 f','55 Cnc e','HD 209458 b','Kepler-452 b'];
const fmt=(value,digits=0,suffix='')=>value==null||!Number.isFinite(Number(value))?'unknown':`${Number(value).toFixed(digits)}${suffix}`;
function typeFor(p){const sim=computeSurvival(p);if(Number(p.pl_rade)>2.5)return 'giant';if(sim.T>700)return 'lava';if(sim.T>310)return 'hot';if(sim.T<273)return 'ice';return 'temperate';}
function tint(type){return ({temperate:'#54b9a6',ice:'#88c8ef',hot:'#e9894f',lava:'#ff4935',giant:'#b57ddd'})[type]||'#8ab8ac';}

function PreviewSpheres({ planets, rootRef }) {
  const refs=useRef([]); const {camera,gl}=useThree(); const info=useMemo(()=>planets.map(p=>{const sim=computeSurvival(p);return {type:typeFor(p),locked:Boolean(sim.tidallyLocked)};}),[planets]); const colors=useMemo(()=>info.map(i=>tint(i.type)),[info]);
  useFrame((_,dt)=>{
    const root=rootRef.current; const canvasRect=gl.domElement.getBoundingClientRect();
    if(!root||!canvasRect.width||!canvasRect.height)return;
    const slots=root.querySelectorAll('[data-preview-slot]');
    const distance=camera.position.z; const viewHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*distance;
    slots.forEach((slot,index)=>{
      const mesh=refs.current[index]; const rect=slot.getBoundingClientRect(); const card=slot.closest('.planet-card');
      if(!mesh||rect.width===0||card?.dataset.hidden==='1'||rect.right<canvasRect.left||rect.left>canvasRect.right){if(mesh)mesh.visible=false;return;}

      if(card){const hole=`${Math.round(slot.offsetLeft+slot.offsetWidth/2)}|${Math.round(slot.offsetTop+slot.offsetHeight/2)}|${Math.round(slot.offsetHeight*.41*1.05+2)}`;
        if(card.dataset.hole!==hole){card.dataset.hole=hole;const[hx,hy,hr]=hole.split('|');card.style.setProperty('--hx',`${hx}px`);card.style.setProperty('--hy',`${hy}px`);card.style.setProperty('--hr',`${hr}px`);}}
      mesh.visible=true;
      if(!mesh.userData.textured){
        const{type,locked}=info[index]; const mat=mesh.material; mat.map=planetTextureFor(planets[index],type,locked); mat.color.set('#ffffff');
        if(type==='lava'){mat.emissiveMap=mat.map;mat.emissive.set('#ff5a1f');mat.emissiveIntensity=.55;}else{mat.emissive.set('#000000');mat.emissiveIntensity=0;}
        mat.needsUpdate=true; mesh.userData.textured=true;
      }
      const nx=((rect.left+rect.width/2-canvasRect.left)/canvasRect.width)*2-1;
      const ny=1-((rect.top+rect.height/2-canvasRect.top)/canvasRect.height)*2;
      mesh.position.set(nx*viewHeight*camera.aspect/2,ny*viewHeight/2,0);
      mesh.scale.setScalar((rect.height*.41/canvasRect.height)*viewHeight);
      if(info[index].locked){mesh.rotation.y=Math.sin(performance.now()*.0004+index)*.22;}else{mesh.rotation.y+=dt*(index%2?.36:.48);} mesh.rotation.x=Math.sin(performance.now()*.0004+index)*.08;
    });
  });
  return <>
    {planets.map((p,i)=><mesh key={`${p.pl_name}-${i}`} ref={el=>refs.current[i]=el} visible={false}>
      <sphereGeometry args={[1,32,24]}/><meshStandardMaterial color={colors[i]} roughness={.78} metalness={.04}/>
      {info[i].type!=='lava'&&info[i].type!=='hot'&&<mesh scale={1.035}><sphereGeometry args={[1,32,24]}/><meshBasicMaterial color={colors[i]} transparent opacity={.14} depthWrite={false}/></mesh>}
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

export default function PlanetSelect({ planets, source, lowQuality, loading=false, toolbar=null, onBack }) {
  const [query,setQuery]=useState(''); const [searchActive,setSearchActive]=useState(false); const [assumptionsOpen,setAssumptionsOpen]=useState(false); const rootRef=useRef(null); const rowRef=useRef(null); const [stageW,setStageW]=useState(940); const swipe=useRef({x:null,moved:false}); const lastWheel=useRef(0);
  const planet=useGame(s=>s.planet); const selectPlanet=useGame(s=>s.selectPlanet); const drop=useGame(s=>s.drop); const records=useGame(s=>s.sessionLeaderboard);
  const displayed=useMemo(()=>{
    if(query.trim())return planets.filter(p=>String(p.pl_name||'').toLowerCase().includes(query.trim().toLowerCase())).slice(0,32);
    const demo=DEMO_ORDER.map(name=>planets.find(p=>p.pl_name===name)).filter(Boolean);
    return demo.length?demo:planets.slice(0,8);
  },[query,planets]);
  const selected=planet&&displayed.some(p=>p.pl_name===planet.pl_name)?planet:displayed[0];
  const begin=()=>{if(!selected)return;unlockAudio();playTone(520,.16,'triangle');drop(selected);startDescentRumble();};
  const selectedIndex=Math.max(0,displayed.findIndex(p=>p.pl_name===selected?.pl_name));
  const L=useMemo(()=>carouselLayout(stageW),[stageW]);
  useEffect(()=>{const el=rowRef.current;if(!el)return;const ro=new ResizeObserver(([e])=>setStageW(Math.round(e.contentRect.width)||940));ro.observe(el);setStageW(Math.round(el.getBoundingClientRect().width)||940);return()=>ro.disconnect();},[]);

  const moveRow=direction=>{const next=displayed[Math.max(0,Math.min(displayed.length-1,selectedIndex+direction))];if(next&&next.pl_name!==selected?.pl_name)selectPlanet(next);};
  const onKeyDown=e=>{if(e.key==='ArrowLeft'){e.preventDefault();moveRow(-1);}else if(e.key==='ArrowRight'){e.preventDefault();moveRow(1);}};
  const onWheel=e=>{if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&Math.abs(e.deltaX)>20&&performance.now()-lastWheel.current>320){lastWheel.current=performance.now();moveRow(e.deltaX>0?1:-1);}};
  const onPointerDown=e=>{swipe.current={x:e.clientX,moved:false};};
  const onPointerUp=e=>{const s0=swipe.current;if(s0.x==null)return;const dx=e.clientX-s0.x;if(Math.abs(dx)>50){s0.moved=true;moveRow(dx<0?1:-1);}s0.x=null;};
  const previous=selected?records.filter(r=>r.planet===selected.pl_name):[];
  return <section className="planet-select-screen" ref={rootRef}>
    <div className="select-scene"><Canvas dpr={lowQuality?[.8,1]:[1,1.2]} gl={{alpha:false,antialias:false,powerPreference:'high-performance'}} camera={{position:[0,0,10],fov:40}}><Starfield planets={displayed} rootRef={rootRef} lowQuality={lowQuality}/></Canvas></div>
    <div className="select-nav"><BackButton onClick={onBack} label="Back"/><span className="select-brand"><b>EXO</b>—VERSE</span></div>
    <div className="select-content">
      <div className="select-title-row"><div><div className="select-eyebrow"><Sparkles size={13}/> CHOOSE YOUR WORLD · NASA ARCHIVE</div><h1>Pick your <em>planet.</em></h1><p>Every surface below is shaped by measured planetary data. Survival is a simulation.</p></div>
        <label className={`planet-search ${searchActive||query?'active':''}`}><Search size={16}/><input id="planet-search" value={query} onFocus={()=>setSearchActive(true)} onBlur={()=>setSearchActive(Boolean(query))} onChange={e=>setQuery(e.target.value)} placeholder="Search all NASA planets by name"/><kbd>↵</kbd></label>
      </div>
      <div className="carousel-title"><span>{query?`${displayed.length} MATCHING WORLDS${displayed.length===32?' · REFINE SEARCH FOR MORE':''}`:loading?'LOADING CACHED + NASA CATALOG…':'DEMO DESTINATIONS'}</span><div className="carousel-tools">{toolbar}<div className="carousel-arrows"><button onClick={()=>moveRow(-1)} aria-label="Previous planets"><ArrowLeft size={15}/></button><button onClick={()=>moveRow(1)} aria-label="Next planets"><ArrowRight size={15}/></button></div><button className="big-drop-button" disabled={!selected} onClick={begin}>DROP <ArrowDown size={18}/></button></div></div>
      <div className="planet-carousel" ref={rowRef} role="group" aria-label="Destination planets" tabIndex={0} style={{height:stageHeight(L)}} onKeyDown={onKeyDown} onWheel={onWheel} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>{displayed.map((p,i)=>{
        const pose=cardPose(i-selectedIndex,L);
        const type=typeFor(p); const chosen=selected?.pl_name===p.pl_name; const sim=computeSurvival(p); const record=[...records].reverse().find(r=>r.planet===p.pl_name);
        return <button key={p.pl_name} className={`planet-card ${chosen?'chosen':''} type-${type}`} data-hidden={pose.hidden?1:0} tabIndex={chosen?0:-1} onClick={()=>{if(swipe.current.moved){swipe.current.moved=false;return;}selectPlanet(p);}} aria-pressed={chosen}
          style={{width:L.cw,height:L.ch,marginLeft:-L.cw/2,transform:cardTransform(pose),zIndex:pose.zIndex,opacity:pose.hidden?0:1,pointerEvents:pose.hidden?'none':'auto'}}>
          <div className="card-topline"><span className="card-type"><i style={{background:tint(type)}}/>{type.toUpperCase()}</span><span className="card-host">{p.hostname||'unknown host'}</span></div>
          <div className="sphere-slot" data-preview-slot="true"><span className="sphere-aura"/></div>
          <div className="card-info"><h2>{p.pl_name||'Unknown planet'}</h2><p>{p.discoverymethod||'Discovery method unknown'} <i/> {p.disc_year??'year unknown'}</p>
            <div className="card-stats"><div><small>RADIUS <b>pl_rade</b></small><strong>{fmt(p.pl_rade,2,' R⊕')}</strong></div><div><small>TEMP <b>pl_eqt</b></small><strong>{fmt(p.pl_eqt,0,' K')}{p.pl_eqt==null&&<i> EST.</i>}</strong></div><div><small>ORBIT <b>pl_orbper</b></small><strong>{fmt(p.pl_orbper,2,' d')}</strong></div></div>
            <div className="survival-teaser"><span>PREDICTED SURVIVAL</span><b>{record?`${record.survivalTime.toFixed(1)}s · ${record.outcome==='survived'?'SURVIVED':'SIGNAL LOST'}`:'???'}</b></div>
          </div>
        </button>;
      })}{displayed.length===0&&<div className="no-results">No planet names match “{query}”. Try another search.</div>}</div>
      {records.length>0&&<section className="session-board"><div className="board-heading"><span>SESSION LEADERBOARD</span><i/>{records.length} ATTEMPT{records.length===1?'':'S'}</div><div className="board-scroll"><div className="board-row board-header"><span>PLANET</span><span>SURVIVAL TIME</span><span>OUTCOME / CAUSE</span></div>{[...records].reverse().map((r,i)=><div className="board-row" key={`${r.planet}-${i}`}><b>{r.planet}</b><span>{r.survivalTime.toFixed(2)} sec</span><span className={r.outcome==='survived'?'board-safe':'board-cause'}>{r.outcome==='survived'?'SIGNAL STABLE':r.causeOfDeath}</span></div>)}</div></section>}
      <footer className="select-footer"><span>SIMULATION MODEL · NOT A HABITABILITY CLAIM</span><span>DATA SOURCE: NASA EXOPLANET ARCHIVE <i/> CACHED VALUES APPROXIMATE</span></footer>
    </div>
    <AssumptionsModal open={assumptionsOpen} onClose={()=>setAssumptionsOpen(false)} planets={planets} source={source} planet={selected}/>
  </section>;
}
