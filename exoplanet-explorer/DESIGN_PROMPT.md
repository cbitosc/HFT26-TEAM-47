# exoverse: visual identity prompt

Paste this into any design or code assistant to produce screens that belong to exoverse.

---

Design a screen for **exoverse**, a full-screen 3D exoplanet explorer built on real NASA Exoplanet Archive data. The interface is a quiet layer of **liquid glass** floating over deep space. The universe is the page; UI never boxes it in.

**Mood.** Calm, scientific, cinematic. Think observatory at night, not sci-fi game HUD. Restrained, precise, a little awe. Never neon, never cartoonish, never cluttered.

**Canvas and backdrop.** Near-black blue space (`#030711`, scene `#02040b`) filling the whole viewport. Behind everything: a procedurally generated Milky Way (spiral arms, bright core, faint outer disk) with thousands of fine star specks and soft coloured light (cobalt `#2a5bd7`, violet `#7a3ff0`, teal `#0fb5a6`) bleeding through so the glass has something to refract. The backdrop drifts almost imperceptibly. A soft vignette keeps text readable over bright regions.

**Surfaces: liquid glass, three tiers.**
1. *Panel glass*: translucent white gradient fill (about 15% to 4.5% to 8%), strong backdrop blur (30px) with saturation 150%, a bright specular rim (1px gradient border, white 75% at top-left fading to transparent, returning 40% at bottom-right), a 1px inner highlight on the top edge, a faint inner glow, and a deep soft shadow. Corner radius 28px.
2. *Lite glass*: for sidebars and popovers. Barely-there fill, hairline white border at 10%, blur 18px, radius 22px.
3. *Tiles*: nested stat cards with no extra blur (a blurred child inside a blurred parent just blurs the parent). Radius 18px, subtle gradient and rim.
Pills and buttons are fully rounded glass with a top highlight; the single primary action uses a cool blue gradient with a soft blue glow. Inputs are dark, inset, pill-shaped.

**Colour.** White text on glass; secondary text slate (`slate-300` / `slate-400`). One cool accent family: cyan-to-violet (`#67e8f9`, `#a78bfa`) for emphasis and charts; emerald for "positive/live" dots; amber (`amber-300`, at 80%) reserved for "Data unavailable" and warnings. Stars are coloured by real temperature (red, orange, yellow-white, white, blue-white, blue); never by name. Planets use muted, believable palettes (rust rock, ocean blue, banded gas giants).

**Typography.** System UI stack (SF Pro, Inter, Segoe UI), 14px base. Headings are light-to-medium weight, tight tracking, sentence case. Labels and eyebrows are small caps: 10px, uppercase, 0.18em letter-spacing, slate-400. Brand wordmark: EXOVERSE, 15px, 0.2em tracking, beside a small square "E" mark with a hairline white border. Numbers use tabular figures; units are always shown (R⊕, M⊕, K, AU, ly).

**Layout.** Edge-to-edge scene with floating panels at a consistent gap (16 to 20px) from the navbar, screen edges and a floating bottom dock. Left: a slim 264px index panel (search, list rows with a status dot, name, quiet meta, count). Right: a 320 to 640px details panel, collapsible. The planet detail view is a split: enlarged 3D planet on the left (about 55 to 60%), scientific panel on the right; on phones they stack. The scene is always centred in the free area between panels. Max content width 1600px.

**Navigation.** A transparent top bar: brand on the left, a **dynamic-island pill** in the centre showing the current page and expanding smoothly (spring, layout animation) into the full list with a sliding highlight, Controls on the right. The same island pattern navigates sections inside a panel and follows scroll position. No second navbar, no status badges.

**Motion.** Slow, eased and physical: log-scale camera flights between galaxy, star system and planet; springs for UI (stiffness about 420, damping about 34); 150 to 300ms fades. Orbits move slowly by default. Respect reduced motion.

**Content rules.** Honest science. Show "Data unavailable" rather than inventing values; label derived values as derived; say when visuals are illustrative. The habitability number is an *educational screening score*, always with the line: "This assessment is an educational screening tool based on available astronomical measurements. It does not establish whether a planet supports life or has suitable surface conditions."

**Avoid.** Opaque cards, heavy borders, drop-shadow-only depth, saturated gradients, emoji, rounded-rectangle "dashboard" grids filling the screen, anything that hides the universe.

**Stack hints.** React, Tailwind, Framer Motion, React Three Fiber, lucide icons (1.5px strokes).
