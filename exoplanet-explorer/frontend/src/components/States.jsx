import { AlertTriangle, Loader2 } from 'lucide-react'

export const Loading = ({ text = 'Loading data from NASA…' }) => (
  <div className="glass mx-auto flex max-w-md items-center justify-center gap-3 px-6 py-6 text-sm text-slate-200" role="status">
    <Loader2 className="h-5 w-5 animate-spin text-sky-200" /> {text}
  </div>
)

export const ErrorBox = ({ error }) => (
  <div className="glass mx-auto flex max-w-lg items-start gap-3 p-5 text-sm" role="alert">
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
    <div>
      <p className="font-medium">Could not load planet data</p>
      <p className="mt-1 text-slate-300">{error?.message}. Make sure the backend is running on port 8000.</p>
    </div>
  </div>
)
