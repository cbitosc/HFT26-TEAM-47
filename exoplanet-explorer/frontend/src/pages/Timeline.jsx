import ShadowApp from '../apps/ShadowApp.jsx'
import TimelineApp from '../apps/timeline/App.jsx'
import css from '../apps/timeline/styles.js'

// Discovery Timeline, part of the page (source: src/apps/timeline).
export default function Timeline() {
  return <ShadowApp css={css} label="Discovery Timeline"><TimelineApp /></ShadowApp>
}
