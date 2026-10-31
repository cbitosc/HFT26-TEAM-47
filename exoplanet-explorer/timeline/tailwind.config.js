export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { space: '#030711', scene: '#02040b', cobalt: '#2a5bd7', 'violet-glow': '#7a3ff0', teal: '#0fb5a6', cyan: '#67e8f9', violet: '#a78bfa' },
    fontFamily: { ui: ['var(--font-ui)'], display: ['var(--font-ui)'] },
  } },
  plugins: [],
};
