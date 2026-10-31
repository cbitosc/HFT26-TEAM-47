



export function scopeCss(css) {
  return css
    .replace(/@tailwind[^;]*;/g, '')
    .replace(/@import[^;]*;/g, '')
    .replace(/:root(?![\w-])/g, ':host')
    .replace(/(^|[}\s,;{])(html|body|#root)(?=\s*[,{])/g, '$1.app-root')
    .replace(/100d?vh/g, 'var(--app-h)')

    .replace(/(font(?:-size)?\s*:\s*(?:[\w-]+\s+)?)(\d*\.?\d+)px/g, (m, pre, n) => (parseFloat(n) < 12 ? `${pre}12px` : m))
}


export const FONT_OVERRIDE = '.app-root, .app-root * { font-family: var(--font-ui) !important; }'
