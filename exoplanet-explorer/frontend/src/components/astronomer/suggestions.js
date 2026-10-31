// Suggested questions follow the selected planet. Wording only; answers always come from the backend/AI.
export function getSuggestions(planet) {
  if (!planet) {
    return [
      'What is an exoplanet?', 'How are exoplanets discovered?', 'What is the habitable zone?',
      'What is the transit method?', 'How do astronomers estimate planetary mass?',
    ]
  }
  const list = [
    `Explain ${planet.name}.`,
    'Compare it with Earth.',
    'Could it support liquid water?',
    'Why is this planet interesting?',
    'Explain its habitability indicators.',
  ]
  const missing = ['radius_earth', 'mass_earth', 'equilibrium_temperature_k', 'semi_major_axis_au'].some((k) => planet[k] == null)
  if (missing) list.push('Why is some data unavailable?')
  return list
}
