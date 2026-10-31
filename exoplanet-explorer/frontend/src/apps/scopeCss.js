// The embedded apps were written as standalone pages: their CSS styles :root, html, body and #root. They run inside a
// shadow root (see ShadowApp), so those selectors are re-targeted at the shadow host / app container, viewport heights
// become the height of the area under the site's navbar, and Tailwind's directives and font @imports (fonts load once,
// in the site's index.html) are dropped.
export function scopeCss(css) {
  return css
    .replace(/@tailwind[^;]*;/g, '')
    .replace(/@import[^;]*;/g, '')
    .replace(/:root(?![\w-])/g, ':host')
    .replace(/(^|[}\s,;{])(html|body|#root)(?=\s*[,{])/g, '$1.app-root')
    .replace(/100d?vh/g, 'var(--app-h)')
    // readability: nothing under 12px (the embedded apps used 6 to 11px for labels), in both `font-size` and `font` shorthand
    .replace(/(font(?:-size)?\s*:\s*(?:[\w-]+\s+)?)(\d*\.?\d+)px/g, (m, pre, n) => (parseFloat(n) < 12 ? `${pre}12px` : m))
}

/** One typeface across the site: the apps' own display and monospace faces are replaced by the site's. */
export const FONT_OVERRIDE = '.app-root, .app-root * { font-family: var(--font-ui) !important; }'
