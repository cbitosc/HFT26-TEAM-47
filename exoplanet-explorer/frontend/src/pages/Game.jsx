import { useLocation, useNavigate } from 'react-router-dom'
import ShadowApp from '../apps/ShadowApp.jsx'
import { GAME_FONTS, loadFonts } from '../apps/fonts.js'
import GameApp from '../apps/game/ui/App.jsx'
import css from '../apps/game/styles.js'



loadFonts(GAME_FONTS)

export default function Game() {
  const navigate = useNavigate()
  const { key } = useLocation()
  const exit = () => (key === 'default' ? navigate('/') : navigate(-1))
  return <ShadowApp css={css} label="Survive 60 Seconds" fullscreen><GameApp onExit={exit} /></ShadowApp>
}
