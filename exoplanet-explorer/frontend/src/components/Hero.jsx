import { ChevronDown, Globe2 } from 'lucide-react'

export default function Hero({ total }) {
  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
      {/* subtle decorative planet + orbit */}
      <div aria-hidden className="pointer-events-none absolute -right-24 top-6 hidden h-96 w-96 md:block">
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-indigo-400/40 via-violet-600/30 to-transparent shadow-[0_0_100px_10px_rgb(99_102_241/0.25)]" />
        <div className="absolute inset-0 rotate-[-18deg] rounded-full border border-white/10" style={{ transform: 'rotate(-18deg) scaleY(0.3)' }} />
      </div>
      <div className="relative max-w-2xl">
        <h1 className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-6xl">
          Explore Worlds Beyond Our Solar System
        </h1>
        <p className="mt-6 text-base text-slate-400 sm:text-lg">
          Discover distant planetary systems, explore real astronomical data, and uncover the fascinating
          characteristics of worlds beyond our solar system.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-3 text-sm font-medium shadow-[0_0_24px_-4px_rgb(99_102_241/0.8)] transition hover:bg-indigo-400"
          >
            Explore Exoplanets <ChevronDown className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Globe2 className="h-4 w-4 text-violet-400" />
            {total == null ? 'Loading…' : <><b className="text-white">{total}</b> confirmed planets available</>}
          </div>
        </div>
      </div>
    </section>
  )
}
