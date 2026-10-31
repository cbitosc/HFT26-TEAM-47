import { useLocation, useNavigate } from 'react-router-dom'
import ShadowApp from '../apps/ShadowApp.jsx'
import GameApp from '../apps/game/ui/App.jsx'
import css from '../apps/game/styles.js'

// Survive 60 Seconds, fullscreen and part of the page (source: src/apps/game; its narration API runs from game/ via /game-api).
// The game has no site navbar; its own Back button leaves through the router (no page reload).
export default function Game() {
  const navigate = useNavigate()
  const { key } = useLocation()
  const exit = () => (key === 'default' ? navigate('/') : navigate(-1)) // first page of the session: go to the explorer instead
  return <ShadowApp css={css} label="Survive 60 Seconds" fullscreen><GameApp onExit={exit} /></ShadowApp>
}
