import { Info } from 'lucide-react'

export default function ScientificDisclaimer() {
  return (
    <div role="note" className="flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-relaxed text-amber-100/80">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p>
        This assessment is an educational screening tool based on available astronomical measurements. It does not
        establish whether a planet supports life or has suitable surface conditions.
      </p>
    </div>
  )
}
