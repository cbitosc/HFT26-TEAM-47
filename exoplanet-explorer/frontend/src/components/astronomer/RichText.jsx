

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
      : part)
}

export default function RichText({ text }) {
  const blocks = []
  let list = null
  const flush = () => { if (list) { blocks.push(list); list = null } }

  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/)
    const heading = line.match(/^#{1,4}\s+(.*)/) || line.match(/^\*\*([^*]+)\*\*:?$/)
    if (bullet) {
      if (!list) list = { type: 'ul', items: [], key: i }
      list.items.push(bullet[1])
    } else if (!line.trim()) {
      flush()
    } else {
      flush()
      blocks.push(heading ? { type: 'h', text: heading[1], key: i } : { type: 'p', text: line.trim(), key: i })
    }
  })
  flush()

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-200">
      {blocks.map((b) => {
        if (b.type === 'ul') {
          return <ul key={b.key} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>
        }
        if (b.type === 'h') return <h4 key={b.key} className="pt-1 font-medium text-cyan-200">{b.text}</h4>
        return <p key={b.key}><Inline text={b.text} /></p>
      })}
    </div>
  )
}
