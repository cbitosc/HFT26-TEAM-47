import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import PlanetDetail from './pages/PlanetDetail.jsx'
import Compare from './pages/Compare.jsx'
import About from './pages/About.jsx'

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planet/:id" element={<PlanetDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<About notFound />} />
      </Routes>
      <footer className="mt-24 border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Data: NASA Exoplanet Archive (Caltech/IPAC). Planet artwork is illustrative, not photographic.
      </footer>
    </div>
  )
}
