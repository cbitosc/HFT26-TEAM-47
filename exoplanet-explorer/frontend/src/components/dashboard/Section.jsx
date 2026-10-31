const ACCENTS = {
  cyan: 'border-cyan-400/60',
  amber: 'border-amber-300/60',
  violet: 'border-violet-400/60',
}

export default function Section({ title, subtitle, accent = 'cyan', id, children }) {
  return (
    <section id={id} className="mt-8 scroll-mt-24">
      <div className={`mb-4 border-l-2 pl-3 ${ACCENTS[accent]}`}>
        <h2 className="text-lg font-medium">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}
