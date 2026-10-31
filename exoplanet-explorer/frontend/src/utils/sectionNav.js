// Which section the reader is in. Pure (unit tested); the hook feeds it IntersectionObserver results.

/**
 * `order`: section ids top to bottom. `visible`: Set of ids currently inside the observer band.
 * The first visible section wins; at the very bottom of the scroll the last section wins (short last sections never
 * reach the band); when nothing is visible the previous section stays active.
 */
export function pickActiveSection(order, visible, previous, atBottom = false) {
  if (atBottom) return order[order.length - 1] ?? previous
  return order.find((id) => visible.has(id)) ?? previous ?? order[0] ?? null
}
