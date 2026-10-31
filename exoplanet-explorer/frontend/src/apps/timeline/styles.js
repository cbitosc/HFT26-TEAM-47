import style from './style.css?inline'
import components from './components.css?inline'
import flash from './flash.css?inline'
import timeline from './timeline.css?inline'
import theme from './theme.css?inline'
import tidy from './tidy.css?inline'
import exoverse from './exoverse.css?inline'

// Cascade order matches the original entry file, then the site-integration overrides.
export default `${style}\n${components}\n${flash}\n${timeline}\n${theme}\n${tidy}\n${exoverse}
/* integration: the site's navbar already carries the brand */
.topbar .brand { display: none; }
/* the timeline's own navbar scrolls with the page instead of sticking to the top */
.exoverse-topbar { position: static !important; }
/* the archive index and the planetary scale panel scroll with the page too */
.index-panel, .details-panel { position: static !important; }
/* no empty space below the side panels: they stretch to the full height of their row (the index spans both rows when
   the plot wraps under the scene, and scrolls its own list instead of setting the row height) */
.details-panel { align-self: stretch; max-height: none !important; }
.frontier-suite.apple-glass { max-height: none !important; height: 100%; }
@media (min-width: 801px) {
  .index-panel { align-self: stretch; height: auto !important; min-height: 0 !important; max-height: none !important; contain: size; }
}
@media (min-width: 801px) and (max-width: 1320px) {
  .workspace.with-index.with-details .index-panel { grid-row: 1 / span 2; }
}
/* the timeline slider sits directly under the visualisation, in the page flow (it used to be a docked bar at the bottom) */
.timeline-bar { width: auto !important; bottom: auto !important; margin: 14px 0 0 !important; }
.exoverse-shell { padding-bottom: 24px !important; }`
