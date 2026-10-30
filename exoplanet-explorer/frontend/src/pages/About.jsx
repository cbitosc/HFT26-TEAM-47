import { Link } from 'react-router-dom'

export default function About({ notFound }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-semibold">{notFound ? 'Page not found' : 'About'}</h1>
      {notFound ? (
        <Link to="/" className="mt-4 inline-block text-indigo-300 hover:underline">Return home</Link>
      ) : (
        <div className="mt-4 space-y-3 text-slate-400">
          <p>Exoplanet Explorer lets you browse confirmed exoplanets using real data from the NASA Exoplanet Archive (Planetary Systems table, queried via the TAP service).</p>
          <p>Measurements marked "Not available" are not reported by NASA for that planet; no values are estimated or invented. Planet images are generated illustrations, not photographs.</p>
        </div>
      )}
    </main>
  )
}
