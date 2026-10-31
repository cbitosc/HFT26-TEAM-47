"""Featherless AI (OpenAI-compatible) chat client. The only module that touches the API key."""
import httpx

from . import config

MAX_REPLY_CHARS = 6000


class AstronomerError(Exception):
    """Failure the API layer should report to the user. Messages never contain the API key."""

    def __init__(self, status_code: int, detail: str, retry_after: str | None = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.retry_after = retry_after


def is_configured() -> bool:
    return bool(config.FEATHERLESS_API_KEY.strip())


def chat_completion(messages: list[dict]) -> dict:
    """Send chat messages to Featherless; return {"content", "model"} or raise AstronomerError."""
    if not is_configured():
        raise AstronomerError(503, "Virtual Astronomer is not configured. Set FEATHERLESS_API_KEY in backend/.env and restart the backend.")

    try:
        resp = httpx.post(
            f"{config.FEATHERLESS_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {config.FEATHERLESS_API_KEY.strip()}"},
            json={
                "model": config.FEATHERLESS_MODEL,
                "messages": messages,
                "temperature": config.FEATHERLESS_TEMPERATURE,
                "max_tokens": config.FEATHERLESS_MAX_TOKENS,
            },
            timeout=config.FEATHERLESS_TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException:
        raise AstronomerError(504, "The AI service took too long to respond. Please try again.")
    except httpx.HTTPError:
        raise AstronomerError(502, "Could not reach the AI service. Please try again.")

    if resp.status_code in (401, 403):
        raise AstronomerError(502, "The AI service rejected the backend's API key. Check FEATHERLESS_API_KEY and that your plan can use this model.")
    if resp.status_code == 429:
        raise AstronomerError(429, "The AI service is busy or rate limited. Please wait a moment and try again.", resp.headers.get("retry-after"))
    if resp.status_code >= 400:
        raise AstronomerError(502, f"The AI service returned an error (HTTP {resp.status_code}).")

    try:
        choice = resp.json()["choices"][0]
        content = choice["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise AstronomerError(502, "The AI service returned an unexpected response.")
    if not isinstance(content, str) or not content.strip():
        raise AstronomerError(502, "The AI service returned an empty response.")
    text = content.strip()[:MAX_REPLY_CHARS]
    if choice.get("finish_reason") == "length":  # hit the token limit: say so rather than end mid-sentence silently
        text += "\n\n*(This answer was cut short by the length limit. Ask me to continue or to focus on one part.)*"
    return {"content": text, "model": config.FEATHERLESS_MODEL}
