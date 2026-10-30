import { GitCompare } from 'lucide-react'

export default function Compare() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <GitCompare className="mx-auto h-10 w-10 text-indigo-400" />
      <h1 className="mt-4 text-3xl font-semibold">Compare Planets</h1>
      <p className="mt-3 text-slate-400">Side-by-side planet comparison is coming in a future phase.</p>
    </main>
  )
}
