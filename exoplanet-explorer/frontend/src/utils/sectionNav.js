


export function pickActiveSection(order, visible, previous, atBottom = false) {
  if (atBottom) return order[order.length - 1] ?? previous
  return order.find((id) => visible.has(id)) ?? previous ?? order[0] ?? null
}
