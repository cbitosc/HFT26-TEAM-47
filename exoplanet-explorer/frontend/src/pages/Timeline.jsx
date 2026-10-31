import ShadowApp from '../apps/ShadowApp.jsx'
import { TIMELINE_FONTS, loadFonts } from '../apps/fonts.js'
import TimelineApp from '../apps/timeline/App.jsx'
import css from '../apps/timeline/styles.js'

// Discovery Timeline, part of the page (source: src/apps/timeline).
loadFonts(TIMELINE_FONTS)

export default function Timeline() {
  return <ShadowApp css={css} label="Discovery Timeline"><TimelineApp /></ShadowApp>
}
