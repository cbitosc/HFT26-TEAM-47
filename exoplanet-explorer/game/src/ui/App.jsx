import React, { useEffect, useState } from 'react';
import { useGame } from '../store/useGame.js';
import { loadNarration, loadPlanets } from '../data/loadPlanets.js';
import PlanetSelect from '../components/PlanetSelect.jsx';
import Surface from '../components/Surface.jsx';
import Hud from '../components/Hud.jsx';
import Settings from '../components/Settings.jsx';
import { setMutedAudio, syncAudioToGame, unlockAudio } from '../audio/sfx.js';
import '../components/hud.css';

export default function App(){
  const [planets,setPlanets]=useState([]);const [source,setSource]=useState('CACHED');const [catalogSource,setCatalogSource]=useState('CACHED');const [narration,setNarration]=useState({});const [lowQuality,setLowQuality]=useState(false);const [loading,setLoading]=useState(true);
  const phase=useGame(s=>s.phase);const muted=useGame(s=>s.muted);const selectPlanet=useGame(s=>s.selectPlanet);const toggleMuted=useGame(s=>s.toggleMuted);
  useEffect(()=>{
    let active=true;
    Promise.all([loadPlanets(),loadNarration()]).then(([catalog,cachedLines])=>{
      if(!active)return;setPlanets(catalog.planets);setSource(catalog.source);setNarration(cachedLines);
      const initial=catalog.planets.find(p=>p.pl_name==='TRAPPIST-1 e')||catalog.planets[0];if(initial)selectPlanet(initial);
      setLoading(false);
      catalog.livePromise.then(live=>{
        if(!active||!live)return;setPlanets(live.planets);setCatalogSource(live.source);
      });
    }).catch(()=>{if(active){setSource('CACHED');setPlanets([]);setLoading(false);}});
    return()=>{active=false;};
  },[selectPlanet]);
  useEffect(()=>{
    if(phase!=='select'||catalogSource===source)return;
    setSource(catalogSource);
    const current=useGame.getState().planet;
    const updated=current&&planets.find(p=>p.pl_name===current.pl_name);
    if(updated)selectPlanet(updated);
  },[phase,catalogSource,source,planets,selectPlanet]);
  const onMute=()=>{
    const wasMuted=useGame.getState().muted;toggleMuted();setMutedAudio(!wasMuted);
    if(wasMuted)unlockAudio().then(()=>syncAudioToGame());
  };

  return <main className={`app-shell new-game-shell ${phase==='select'?'select-mode':''}`}>
    {phase==='select'?<PlanetSelect planets={planets} source={source} lowQuality={lowQuality} loading={loading}/>:<>
      <div className="surface-layer"><Surface lowQuality={lowQuality}/></div>
      <header className="game-topbar"><a href="#home" className="game-logo"><span>EXO</span>—VERSE</a><div className="current-destination"><small>DESTINATION</small><b>{useGame.getState().planet?.pl_name||'UNKNOWN WORLD'}</b></div></header>
      <Hud planets={planets} source={source} narration={narration}/>
      <footer className="game-footer"><span>EXO—VERSE · SURVIVAL SIMULATOR</span><span>PLANET DATA: NASA EXOPLANET ARCHIVE · {source}</span><span>ILLUSTRATIVE GAME MODEL</span></footer>
    </>}
    <Settings muted={muted} onMute={onMute} lowQuality={lowQuality} onToggleQuality={()=>setLowQuality(v=>!v)} className={phase==='select'?'select-settings':'game-settings'}/>
  </main>;
}
