import { Suspense, lazy } from 'react'
import { Navigate, Routes, Route, useMatch } from 'react-router-dom'
import TopBar from './components/TopBar.jsx'
import Explorer from './pages/Explorer.jsx'
import SpaceBackdrop from './components/SpaceBackdrop.jsx'

const Compare = lazy(() => import('./pages/Compare.jsx'))
const Astronomer = lazy(() => import('./pages/Astronomer.jsx'))
const Game = lazy(() => import('./pages/Game.jsx'))
const Timeline = lazy(() => import('./pages/Timeline.jsx'))
import { UniverseSettingsProvider } from './context/UniverseSettings.jsx'

export default function App() {
  // Hooks must run unconditionally, so evaluate every match before combining them.
  const matches = [useMatch('/'), useMatch('/planet/:id'), useMatch('/system/:id')]
  const onExplorer = matches.some(Boolean)
  const onGame = !!useMatch('/game') // the game is a fullscreen, immersive route: no site navbar, no reserved top space
  return (
    <UniverseSettingsProvider>
      {/* The explorer draws its own full-screen scene; the other pages get a quiet Milky Way backdrop. */}
      {!onExplorer && !onGame && <SpaceBackdrop />}
      <div className="relative z-10 min-h-screen overflow-x-hidden" style={onExplorer || onGame ? undefined : { paddingTop: 'calc(var(--topbar-h, 5rem) + 0.25rem)' }}>
        {!onGame && <TopBar />}
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Explorer />}>
            <Route path="planet/:id" element={null} />
            <Route path="system/:id" element={null} />
          </Route>
          <Route path="/compare" element={<Compare />} />
          <Route path="/astronomer" element={<Astronomer />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/game" element={<Game />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
    </UniverseSettingsProvider>
  )
}
