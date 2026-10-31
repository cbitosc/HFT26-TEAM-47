import style from './style.css?inline'
import components from './components.css?inline'
import flash from './flash.css?inline'
import timeline from './timeline.css?inline'
import theme from './theme.css?inline'
import tidy from './tidy.css?inline'
import exoverse from './exoverse.css?inline'


export default `${style}\n${components}\n${flash}\n${timeline}\n${theme}\n${tidy}\n${exoverse}

.topbar .brand { display: none; }

.exoverse-topbar { position: static !important; }

.index-panel, .details-panel { position: static !important; }

.details-panel { align-self: stretch; max-height: none !important; }
.frontier-suite.apple-glass { max-height: none !important; height: 100%; }
@media (min-width: 801px) {
  .index-panel { align-self: stretch; height: auto !important; min-height: 0 !important; max-height: none !important; contain: size; }
}
@media (min-width: 801px) and (max-width: 1320px) {
  .workspace.with-index.with-details .index-panel { grid-row: 1 / span 2; }
}

.timeline-bar { width: auto !important; bottom: auto !important; margin: 14px 0 0 !important; }
.exoverse-shell { padding-bottom: 24px !important; }`
