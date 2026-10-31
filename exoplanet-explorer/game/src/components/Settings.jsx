import React from 'react';
import { AudioLines, Volume2, VolumeX } from 'lucide-react';

export default function Settings({ muted, onMute, lowQuality, onToggleQuality, className = '' }) {
  return <div className={`settings-controls ${className}`}>
    <button className="setting-chip" onClick={onMute} aria-label={muted ? 'Unmute audio' : 'Mute audio'} title={muted ? 'Unmute audio' : 'Mute audio'}>
      {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}<span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span>
    </button>
    <button className={`setting-chip ${lowQuality?'selected':''}`} onClick={onToggleQuality} aria-pressed={lowQuality} title="Reduce visual effects for slower devices">
      <AudioLines size={14}/><span>{lowQuality ? 'LOW QUALITY ON' : 'LOW QUALITY'}</span>
    </button>
  </div>;
}
