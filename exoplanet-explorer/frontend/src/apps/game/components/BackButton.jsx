import React from 'react';
import { ArrowLeft } from 'lucide-react';

/** Compact back control for the game HUD (not a navbar). */
export default function BackButton({ onClick, label = 'Back' }) {
  return <button type="button" className="game-back" onClick={onClick} aria-label={label}><ArrowLeft size={15} aria-hidden="true"/><span>{label}</span></button>;
}
