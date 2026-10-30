import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Featured from '../components/Featured.jsx'
import Catalogue from '../components/Catalogue.jsx'
import { useApi } from '../api.js'

export default function Home() {
  const planets = useApi('/planets')
  const { hash } = useLocation()

  // Support navigating here from another page with /#catalogue
  useEffect(() => {
    if (hash === '#catalogue' && planets.data) {
      document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash, planets.data])

  return (
    <main>
      <Hero total={planets.data?.count} />
      <Featured />
      <Catalogue {...planets} />
    </main>
  )
}
