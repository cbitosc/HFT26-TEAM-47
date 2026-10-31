import PlanetArt from '../PlanetArt.jsx'

// Compact featured-planet chips (from /api/planets/featured).
export default function FeaturedStrip({ planets, selectedId, onSelect, error }) {
  if (error) return <p className="text-xs text-amber-300/80">Could not load featured planets.</p>
  if (!planets.length) return null
  return (
    <div aria-label="Featured exoplanets">
      <div className="mb-1.5 text-xs uppercase tracking-[0.14em] text-slate-400">Featured</div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {planets.map((p) => (
          <button key={p.id} onClick={() => onSelect(p.id)} aria-pressed={p.id === selectedId}
            className={`glass-tile flex flex-none items-center gap-1.5 !rounded-full py-1 pl-1.5 pr-3 text-xs transition hover:-translate-y-0.5 ${p.id === selectedId ? 'bg-sky-300/20 ring-1 ring-sky-200/60' : ''}`}>
            <PlanetArt planet={p} size={20} />
            <span className="whitespace-nowrap">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
