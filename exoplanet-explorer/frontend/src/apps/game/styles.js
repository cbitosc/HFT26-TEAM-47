import base from './style.css?inline'
import select from './components/planet-select.css?inline'
import hud from './components/hud.css?inline'


export default `${base}\n${select}\n${hud}

.topbar .brand, .select-logo { display: none; }
.app-shell { height: 100% !important; min-height: 0 !important; }

.card-stats small b { display: none; }



.game-footer { height: 32px !important; }
.hud-bottom-center { position: absolute; left: 50%; transform: translateX(-50%); bottom: 50px; z-index: 6; display: flex; flex-direction: column; align-items: center; gap: 10px; width: max-content; max-width: calc(100% - 24px); pointer-events: none; text-align: center; }
.hud-bottom-center > * { position: static !important; transform: none !important; left: auto !important; right: auto !important; bottom: auto !important; margin: 0 !important; }

.hud-bottom-center { max-width: max(260px, calc(100% - 780px)); }
.hud-bottom-center .narrator-subtitle { width: 100% !important; }
.hud-bottom-center .g-feel { gap: 4px; }
.hud-bottom-center .movement-help { display: flex !important; justify-content: center; flex-wrap: wrap; font-size: 12px; gap: 6px; text-shadow: 0 1px 6px #000; }

.lock-hint { white-space: normal !important; max-width: 100%; }
.hud-bottom-center .g-feel, .hud-bottom-center .star-angle-note, .stamina-block span { text-shadow: 0 1px 6px #000, 0 0 2px #000; }
.stamina-block { display: flex; flex-direction: column; align-items: center; gap: 6px; width: min(220px, 70vw); }
.stamina-block span { font-size: 12px; letter-spacing: .14em; color: #b3c8c0; }
.stamina-track { width: 100%; height: 6px; border-radius: 3px; overflow: hidden; background: #000000a6; border: 1px solid #a9c8bd40; }
.stamina-track i { display: block; height: 100%; background: #83dfbc; box-shadow: 0 0 7px #6df2c0; transition: width .1s linear; }
.star-angle-note { color: #9fb1b5 !important; }
.hud-bottom-left { left: 24px !important; bottom: 44px !important; }
.hud-bottom-right { right: 24px !important; bottom: 44px !important; flex-direction: column; align-items: flex-end !important; gap: 8px !important; }
.hud-bottom-right .assumption-access { position: static !important; }
@media (max-width: 900px) {
  .hud-bottom-left { left: 10px !important; } .hud-bottom-right { right: 10px !important; }
  .hud-bottom-center { bottom: 118px; max-width: calc(100% - 24px); }
}

.game-back { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid #76d8c540; border-radius: 6px; background: #0c161bd9; color: #b7e6d7; font-size: 12px; font-weight: 500; line-height: 1; letter-spacing: .08em; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
.game-back:hover { background: #13262c; border-color: #76d8c5a0; color: #e2fff6; }
.game-back:focus-visible, .again-btn:focus-visible { outline: 2px solid #79e2ce; outline-offset: 2px; }
.game-nav { display: flex; align-items: center; gap: 14px; min-width: 0; }
.select-nav { position: absolute; top: 14px; left: 18px; z-index: 6; display: flex; align-items: center; gap: 14px; }
.select-brand { font-size: 14px; font-weight: 600; letter-spacing: .18em; color: #dbe8e0; white-space: nowrap; }
.select-brand b { color: #63e6d7; font-weight: 600; }

.result-shade { place-items: stretch !important; padding: 0 !important; }
.postmortem-card { width: 100% !important; max-width: none !important; height: 100%; max-height: none !important; border: 0 !important; border-radius: 0 !important; overflow: auto; box-sizing: border-box; padding: calc(var(--game-bar-h, 53px) + clamp(12px, 2vw, 28px)) clamp(14px, 2.4vw, 36px) clamp(14px, 2.4vw, 36px) !important;
  display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); grid-template-areas: "head head" "main side" "foot foot"; gap: 20px clamp(18px, 3vw, 44px); align-content: start; }
.pm-head { grid-area: head; } .pm-main { grid-area: main; min-width: 0; }
.pm-side { grid-area: side; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.pm-foot { grid-area: foot; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.postmortem-top { display: flex; align-items: center; gap: 12px; }
.postmortem-top .result-shield { margin-left: auto; }
.post-chart { height: clamp(150px, 26vh, 280px) !important; }
.analysis-copy { max-width: 72ch; font-size: 14px !important; }
.data-chips { max-height: none !important; }
.debrief-board-list { max-height: min(38vh, 340px) !important; }
.pm-foot .debrief-source { width: 100%; }
.again-btn { display: inline-flex !important; align-items: center; justify-content: center; gap: 10px; width: min(440px, 100%) !important; height: 46px !important; padding: 0 20px; font-size: 13px !important; transition: background .15s, border-color .15s, color .15s; }
.again-btn:hover { background: #69d7c433; border-color: #76d8c5c0; color: #d8fff3; }
@media (max-width: 860px) {
  .postmortem-card { grid-template-columns: minmax(0, 1fr); grid-template-areas: "head" "main" "side" "foot"; }
  .again-btn { width: 100% !important; }
  .select-brand { display: none; }
  .postmortem-card { --game-bar-h: 48px; }
}


.select-content { inset: 0 !important; padding-top: 62px !important; }

.carousel-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.carousel-tools .settings-controls { position: static !important; flex-direction: row !important; margin: 0; }
.carousel-arrows { display: flex; gap: 6px; }
.carousel-title > .carousel-tools { display: flex !important; }
.carousel-tools button { width: auto !important; height: auto !important; white-space: nowrap; }
.carousel-tools .settings-controls { display: flex; gap: 8px; }
.carousel-tools .setting-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px !important; }
.carousel-arrows button { width: 36px !important; height: 36px !important; padding: 0 !important; }
.carousel-tools .big-drop-button { min-height: 36px; padding: 8px 20px !important; display: inline-flex; align-items: center; gap: 8px; }

.session-board { margin-top: 18px !important; }
@media (max-width: 640px) {
  .carousel-title { flex-direction: column; align-items: stretch !important; gap: 10px; }
  .carousel-tools { justify-content: center; }
  .carousel-tools .settings-controls { flex-wrap: wrap; justify-content: center; }
  .carousel-tools .setting-chip { padding: 6px 10px !important; }
  .carousel-tools .big-drop-button { order: 3; flex: 1 1 100%; justify-content: center; }
}
.select-footer { position: static !important; height: auto !important; background: none !important; border: 0 !important; padding: 8px 0 4px !important; font-size: 12px !important; }

.select-title-row { display: flex !important; flex-direction: column; align-items: center !important; text-align: center; gap: 16px; }
.select-eyebrow { justify-content: center; }
.select-title-row h1 { font-size: 40px !important; }
.select-title-row p { font-size: 14px !important; }
.select-content { overflow-y: auto; overflow-x: hidden; }


.planet-carousel { display: block !important; position: relative; flex: none !important; min-height: 0 !important; overflow-x: clip !important; overflow-y: visible !important; padding: 0 !important; perspective: 1400px; perspective-origin: 50% 30%; outline: none; touch-action: pan-y; }
.planet-card { position: absolute !important; left: 50%; top: 0; transform-origin: 50% 50%; will-change: transform; transition: transform .55s cubic-bezier(.22,.8,.2,1), opacity .35s ease, border-color .2s, box-shadow .2s; }

.planet-card { background: linear-gradient(155deg, #0d171f, #0a1017 74%) !important;
  -webkit-mask: radial-gradient(circle at var(--hx, 50%) var(--hy, 40%), transparent var(--hr, 0px), #000 calc(var(--hr, 0px) + 1px));
  mask: radial-gradient(circle at var(--hx, 50%) var(--hy, 40%), transparent var(--hr, 0px), #000 calc(var(--hr, 0px) + 1px)); }
.sphere-aura { display: none !important; }
.planet-card.chosen { box-shadow: 0 0 0 1px #67d9c660, 0 0 34px #55ddbd30, 0 22px 44px #0009 !important; }
.planet-card { display: flex; flex-direction: column; min-height: 0; }
.card-topline { position: static !important; flex: none; padding: 14px 16px 0; }
.sphere-slot { position: relative; flex: 1 1 auto; height: auto !important; min-height: 170px; width: 82% !important; margin: 8px auto !important; }
.card-info { position: static !important; flex: none; padding: 0 16px 16px; }
.card-host { flex: 1; min-width: 0; max-width: none !important; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-info h2 { font-size: 20px; margin: 0 0 4px; }
.card-info > p { white-space: normal !important; font-size: 12px !important; }
.card-stats { padding: 10px 0 !important; margin-top: 10px !important; gap: 8px !important; }
.card-stats small { font-size: 12px !important; }
.card-stats strong { font-size: 14px !important; }
.survival-teaser { padding-top: 10px !important; }
.app-root { overflow: hidden; }`
