"""Virtual Astronomer: system prompt, grounded planet context and conversation assembly.

Planet data is always looked up from the NASA-backed dataset by the backend; nothing numeric
comes from the client or is calculated by the LLM.
"""
import re

from .habitability import WEIGHTS, calculate_habitability, stellar_luminosity

MAX_HISTORY_MESSAGES = 8
MAX_HISTORY_CHARS = 6000
MAX_PLANETS_IN_CONTEXT = 3  # selected planet + up to two others named in the message

SYSTEM_PROMPT = """You are Virtual Astronomer, an intelligent scientific assistant specializing in exoplanets, planetary systems, astronomy, and astrobiology.
Your role is to help users understand planets beyond our solar system using scientifically grounded information.

RULES:
1. Use the supplied NASA Exoplanet Archive data as the primary source for planet-specific measurements.
2. Never invent missing measurements.
3. If information is unavailable, explicitly say that the data is unavailable.
4. Distinguish between measured values, estimates, scientific interpretations, and illustrative assumptions.
5. Explain complex scientific concepts in beginner-friendly language.
6. Use Earth as a reference when explaining planetary size, mass, temperature, and orbital properties.
7. Explain the difference between equilibrium temperature and actual surface temperature.
8. Never claim that a planet supports life without scientific evidence.
9. Never equate habitable-zone location with confirmed habitability.
10. When discussing habitability, consider atmospheric composition, surface conditions, water availability, stellar activity, and other relevant factors.
11. If a planet's properties are unknown, explain the limitations.
12. When comparing planets, use actual supplied measurements and clearly identify unavailable values.
13. Answer general astronomy questions when relevant.
14. Keep responses structured, engaging, informative, and concise unless the user requests greater detail.
15. Do not pretend that illustrative 3D planetary textures represent actual photographs.
16. Do not present the application's educational habitability screening score as a scientific probability of life.
17. If the user asks something outside astronomy, politely explain your specialization.

The assistant must prioritize scientific accuracy over speculation.

RESPONSE FORMAT: Use short bold headings and bullet points (markdown "**Heading**" and "- item"). Do not use tables. Quote numbers exactly as given in the data below, with units. Put planet-specific measurements and general astronomy knowledge in clearly separate parts when you mix them. Never present a number that is not in the supplied data as a measurement of that planet."""

CONTEXT_INTRO = (
    "DATA FOR THIS CONVERSATION (from the NASA Exoplanet Archive via the app's backend; values marked "
    "UNAVAILABLE are not reported and must not be estimated):"
)


def _val(v, unit="", digits=4):
    if v is None:
        return "UNAVAILABLE"
    text = f"{v:.{digits}f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)
    return f"{text} {unit}".strip()


# Conversions are computed here so the model never has to do arithmetic on measurements.
def _celsius(k):
    return "" if k is None else f" = {k - 273.15:.1f} degrees C. Compare with Earth's own equilibrium temperature of about 255 K (-18 degrees C); Earth's actual mean surface temperature is about 15 degrees C only because of its greenhouse effect"


def _years(days):
    return "" if days is None else f" = {days / 365.25:.3f} Earth years"


def _habitability_lines(p: dict) -> list[str]:
    h = calculate_habitability(p)
    lines = ["  Habitability screening (the app's EDUCATIONAL screening, not a probability of life):"]
    total = "no overall score (insufficient data)" if h["total"] is None else f"{h['total']}/100, {h['category']}"
    lines.append(f"  - Overall: {total}")
    for key, label, mx in (("habitable_zone", "Habitable-zone suitability", WEIGHTS["habitable_zone"]), ("temperature", "Temperature suitability", WEIGHTS["temperature"]),
                           ("planet_size", "Planet size suitability", WEIGHTS["planet_size"])):
        i = h["indicators"][key]
        if i["available"]:
            lines.append(f"  - {label}: {i['score']:g}/{mx} ({i['status']})")
        else:
            lines.append(f"  - {label}: UNKNOWN ({i['note']})")
    if h["indicators"]["habitable_zone"]["available"]:
        z = h["indicators"]["habitable_zone"]["zone"]
        src = h["indicators"]["habitable_zone"]["luminosity_source"]
        lines.append(
            f"  - Habitable zone for this star (Kopparapu 2013, luminosity {src}): conservative {z['conservative'][0]:.3f}-{z['conservative'][1]:.3f} AU, "
            f"optimistic {z['optimistic'][0]:.3f}-{z['optimistic'][1]:.3f} AU")
    c = h["completeness"]
    lines.append(f"  - Data completeness: {c['count']} of {c['total']} key measurements reported"
                 + (f"; missing: {', '.join(c['missing'])}" if c["missing"] else ""))
    return lines


def _derived(p: dict, field: str) -> str:
    return " [derived by exoverse from NASA values; not reported by NASA]" if field in (p.get("derived_fields") or []) else ""


def planet_block(p: dict, role: str) -> str:
    lum = stellar_luminosity(p)
    lum_text = "UNAVAILABLE" if not lum else f"{lum[0]:.4g} L_sun ({lum[1]})"
    ly = p.get("distance_light_years")
    lines = [
        f"{role}: {p['name']}",
        f"  Host star: {p.get('host_star') or 'UNAVAILABLE'}"
        + (f" ({p['system_planet_count']} known planet(s) in the system)" if p.get("system_planet_count") else ""),
        f"  Discovery: {_val(p.get('discovery_method'))}, year {_val(p.get('discovery_year'))}",
        f"  Radius: {_val(p.get('radius_earth'), 'Earth radii')}",
        f"  Mass: {_val(p.get('mass_earth'), 'Earth masses')}",
        f"  Orbital period: {_val(p.get('orbital_period_days'), 'days')}" + _years(p.get("orbital_period_days")),
        f"  Semi-major axis: {_val(p.get('semi_major_axis_au'), 'AU')}{_derived(p, 'semi_major_axis_au')}",
        f"  Orbital eccentricity: {_val(p.get('eccentricity'))}",
        f"  Stellar flux received: {_val(p.get('insolation_earth'), 'x Earth')}{_derived(p, 'insolation_earth')}",
        f"  Equilibrium temperature: {_val(p.get('equilibrium_temperature_k'), 'K')}{_celsius(p.get('equilibrium_temperature_k'))} (theoretical; not a surface temperature){_derived(p, 'equilibrium_temperature_k')}",
        "  Distance from Earth: " + (f"{_val(ly, 'light-years', 2)} ({_val(p.get('distance_parsecs'), 'parsecs', 3)})" if ly is not None else "UNAVAILABLE"),
        f"  Host star temperature: {_val(p.get('star_temperature_k'), 'K')}; radius: {_val(p.get('star_radius_solar'), 'R_sun')}; "
        f"mass: {_val(p.get('star_mass_solar'), 'M_sun')}; luminosity: {lum_text}; spectral type: {_val(p.get('star_spectral_type'))}",
    ]
    return "\n".join(lines + _habitability_lines(p))


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def find_mentioned_planets(message: str, planets: list[dict], exclude_id: str | None) -> list[dict]:
    """Planets whose full NASA name appears in the message (ignoring case, spaces and hyphens)."""
    msg = _norm(message)
    hits = [p for p in planets if p["id"] != exclude_id and len(_norm(p["name"])) >= 4 and _norm(p["name"]) in msg]
    # prefer the longest names, in order of appearance in the message
    hits.sort(key=lambda p: msg.index(_norm(p["name"])))
    return hits[: MAX_PLANETS_IN_CONTEXT - (1 if exclude_id else 0)]


def trim_history(history: list[dict]) -> list[dict]:
    """Most recent turns only, within a character budget (a rough proxy for tokens)."""
    recent = history[-MAX_HISTORY_MESSAGES:]
    while recent and sum(len(t["content"]) for t in recent) > MAX_HISTORY_CHARS:
        recent = recent[1:]
    while recent and recent[0]["role"] != "user":  # keep the conversation starting on a user turn
        recent = recent[1:]
    return recent


def build_messages(message: str, selected: dict | None, others: list[dict], history: list[dict]) -> list[dict]:
    blocks = []
    if selected:
        blocks.append(planet_block(selected, "SELECTED PLANET (the planet the user is currently exploring)"))
    else:
        blocks.append("No planet is currently selected; answer general astronomy questions from general knowledge and say so.")
    for o in others:
        blocks.append(planet_block(o, "OTHER PLANET NAMED IN THE USER'S MESSAGE"))
    system = f"{SYSTEM_PROMPT}\n\n{CONTEXT_INTRO}\n\n" + "\n\n".join(blocks)
    return [{"role": "system", "content": system}, *trim_history(history), {"role": "user", "content": message}]
