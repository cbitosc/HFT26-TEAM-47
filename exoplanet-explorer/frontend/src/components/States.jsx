import { AlertTriangle, Loader2, SearchX } from 'lucide-react'

export const Loading = ({ text = 'Loading data from NASA…' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
    <Loader2 className="h-5 w-5 animate-spin" /> {text}
  </div>
)

export const ErrorBox = ({ error }) => (
  <div className="panel mx-auto flex max-w-lg items-start gap-3 p-5 text-sm">
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
    <div>
      <p className="font-medium">Could not load planet data</p>
      <p className="mt-1 text-slate-400">{error?.message}. Make sure the backend is running on port 8000.</p>
    </div>
  </div>
)

export const Empty = ({ onClear }) => (
  <div className="panel flex flex-col items-center gap-3 py-14 text-center">
    <SearchX className="h-8 w-8 text-slate-500" />
    <p className="font-medium">No planets match your filters</p>
    <p className="text-sm text-slate-400">Try a different search term or widen the radius range.</p>
    <button onClick={onClear} className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-500/30">
      Clear filters
    </button>
  </div>
)
