import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react'
import RichText from './RichText.jsx'

export default function MessageBubble({ message: m, onRetry, canRetry }) {
  if (m.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-500/25 px-4 py-2 text-sm text-white">
          {m.content}
        </div>
        {m.error && (
          <div role="alert" className="flex max-w-[85%] items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span>{m.error}</span>
            {canRetry && (
              <button onClick={onRetry} className="ml-2 inline-flex shrink-0 items-center gap-1 text-cyan-200 hover:underline">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-violet-300" aria-hidden />
      <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.07] px-4 py-3">
        <RichText text={m.content} />
        {m.compared?.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">NASA records used for comparison: {m.compared.join(', ')}</p>
        )}
      </div>
    </div>
  )
}
