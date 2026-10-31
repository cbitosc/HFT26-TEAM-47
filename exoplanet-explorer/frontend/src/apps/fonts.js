const loaded = new Set()

export function loadFonts(href) {
  if (loaded.has(href)) return
  loaded.add(href)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

export const GAME_FONTS = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap'
export const TIMELINE_FONTS = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap'
