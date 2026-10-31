import { CircleSlash } from 'lucide-react'

export default function Unavailable({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm text-amber-300/70 ${className}`}>
      <CircleSlash className="h-3.5 w-3.5" /> Data unavailable
    </span>
  )
}
