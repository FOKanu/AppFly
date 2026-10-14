"""Gemini cover-letter writer from a sealed one-job packet.

Purpose: Draft letters for shortlisted jobs using only packet text.
Inputs: Vault notes, CV slice, voice samples, Gemini key from the Keychain
(``gemini``) or ``GEMINI_API_KEY``; optional ``gemini_api_base``.
Returns: Write stats; letters land in ``Letters/``.
Does not: Submit applications, include a second job, or crawl listing URLs.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from jobhunt.config import AppConfig
from jobhunt.models import Job, Requirements
from jobhunt.vault import Vault

WRITER_SYSTEM = """You write a single job application letter.
Use only the packet below. Do not invent employers, jobs, or skills that are not in the packet.
Match the language of the job posting when possible (German or English).
Follow the tone instructions. Keep the letter under 350 words.
Return Markdown with a Subject line, then the letter body. No preamble."""

MISSING_KEY_MESSAGE = (
    "Gemini API key is not set. Save it in Settings "
    "(Keychain entry 'gemini') or set GEMINI_API_KEY."
)

KEY_REJECTED_MESSAGE = "Gemini rejected the API key. Replace it in Settings → API keys."

EMPTY_LETTER_MESSAGE = "Gemini returned an empty letter. Try again."

class LetterWriteError(RuntimeError):
    """Error raised when writing a letter fails."""

    def __init__(self, message: str, *, kind: str) -> None:
        super().__init__(message)
        self.kind = kind


def write_letters(
    config: AppConfig,
    vault: Vault,
    should_stop: Callable[[], bool] | None = None,
    on_letter: Callable[[int, int], None] | None = None,
    *,
    cv_text: str | None = None,
) -> dict[str, Any]:
    """Write up to ``letter_cap`` letters for shortlisted jobs.

    Purpose: CLI ``jobhunt write`` pipeline step.
    Inputs: Config (model, cap, excerpt length) and vault; key from the Keychain
    (``gemini``) or ``GEMINI_API_KEY``; optional ``should_stop`` checked before each letter;
    optional ``on_letter(written, skipped)`` called after each letter attempt (B1 live counts);
    optional ``cv_text`` (M2) — when set, used for every sealed packet instead of ``read_cv``.
    Returns: ``written`` / ``skipped`` / ``capped`` / ``failed`` counts and ``errors``
    (one string per failed job); ``stopped`` (True when cancelled between letters).
    Does not: Overwrite jobs that already have a letter or ``gemini: false``; stop the
    batch when one Gemini call fails (the missing-key case still raises); mix two CVs.
    """

    if not config.gemini_api_key:
        raise RuntimeError(MISSING_KEY_MESSAGE)

    requirements = vault.load_requirements()
    if cv_text is None:
        cv_text = vault.read_cv()
    cv_text = _cv_slice(cv_text)
    samples = vault.read_voice_samples()
    written = 0
    skipped = 0
    failed = 0
    stopped = False
    errors: list[str] = []

    candidates: list[Job] = []
    for post in vault.iter_job_notes():
        if str(post.metadata.get("status") or "") != "shortlist":
            continue
        if post.metadata.get("gemini") is False:
            skipped += 1
            continue
        if post.metadata.get("letter"):
            skipped += 1
            continue
        candidates.append(vault.job_from_note(post))

    for job in candidates[: config.letter_cap]:
        if should_stop is not None and should_stop():
            stopped = True
            break
        company_note = vault.read_company_body(job.company)
        packet = build_packet(
            job,
            cv_text=cv_text,
            samples=samples,
            company_note=company_note,
            requirements=requirements,
            excerpt_chars=config.jd_excerpt_chars,
        )
        try:
            letter, tokens_in, tokens_out = _call_gemini(config, packet)
        except Exception as exc:  # noqa: BLE001 - one failed letter must not stop the batch
            failed += 1
            errors.append(f"{job.company} - {job.title}: {type(exc).__name__}: {exc}")
            if on_letter is not None:
                on_letter(written, skipped)
            continue
        vault.write_letter(
            job,
            letter,
            model=config.gemini_model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )
        written += 1
        if on_letter is not None:
            on_letter(written, skipped)
    return {
        "written": written,
        "skipped": skipped,
        "capped": max(0, len(candidates) - config.letter_cap),
        "failed": failed,
        "stopped": stopped,
        "errors": errors,
    }


def regenerate_letter_for_job(config: AppConfig, vault: Any, job: Job) -> str:
    """Force-generate a letter for one job, overwriting any existing draft.

    Purpose: Packet ``Regenerate`` control.
    Inputs: Config, store/vault duck-type, single Job.
    Returns: Letter markdown body.
    Does not: Submit the application or include another job.
    """

    if not config.gemini_api_key:
        raise LetterWriteError(MISSING_KEY_MESSAGE, kind="missing_key")
    requirements = vault.load_requirements()
    cv_text = _cv_slice(vault.read_cv())
    samples = vault.read_voice_samples()
    company_note = vault.read_company_body(job.company)
    packet = build_packet(
        job,
        cv_text=cv_text,
        samples=samples,
        company_note=company_note,
        requirements=requirements,
        excerpt_chars=config.jd_excerpt_chars,
    )
    try:
        letter, tokens_in, tokens_out = _call_gemini(config, packet)
    except LetterWriteError:
        raise
    except Exception as exc:
        mapped = _classify_gemini_error(exc)
        if mapped is None:
            raise
        raise mapped from exc
    vault.write_letter(
        job,
        letter,
        model=config.gemini_model,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
    )
    return letter


def build_packet(
    job: Job,
    *,
    cv_text: str,
    samples: str,
    company_note: str,
    requirements: Requirements,
    excerpt_chars: int = 1200,
) -> str:
    """Assemble the sealed writer packet for one job.

    Purpose: The only prompt body sent to Gemini.
    Inputs: A single job, CV slice, voice samples, company note, tone/languages.
    Returns: Markdown packet string with a truncated job excerpt.
    Does not: Add any other employer or job.
    """

    excerpt = job.description.strip().replace("\r\n", "\n")[:excerpt_chars]
    languages = ", ".join(requirements.languages)
    company_block = company_note.strip()[:800] if company_note.strip() else "(none yet)"
    samples_block = samples.strip()[:2500] if samples.strip() else "(none yet — write plainly)"
    return "\n".join(
        [
            "## Job",
            f"Title: {job.title}",
            f"Company: {job.company}",
            f"Location: {job.location}",
            f"URL: {job.url}",
            "",
            "## Job description excerpt",
            excerpt or "(no description)",
            "",
            "## Company note",
            company_block,
            "",
            "## Candidate CV (slice)",
            cv_text or "(CV missing — keep the letter generic and honest)",
            "",
            "## Voice samples",
            samples_block,
            "",
            "## Constraints",
            f"Tone: {requirements.tone}",
            f"Preferred languages: {languages}",
            "Do not mention any other job or employer.",
        ]
    )


def _cv_slice(cv_text: str, limit: int = 3500) -> str:
    return cv_text.strip()[:limit]


def _classify_gemini_error(exc: Exception) -> LetterWriteError | None:
    """Classify a Gemini error into a LetterWriteError with appropriate kind."""
    from google.genai import errors as genai_errors
    import httpx

    if isinstance(exc, genai_errors.APIError):
        code = getattr(exc, "code", None)
        status = getattr(exc, "status", None)
        message = getattr(exc, "message", None)
        details = getattr(exc, "details", None)

        if code in (401, 403):
            return LetterWriteError(
                KEY_REJECTED_MESSAGE,
                kind="key_rejected"
            )
        elif code == 400 and status == "INVALID_ARGUMENT":
            # Check for API_KEY_INVALID in details or message
            if (
                (details and "API_KEY_INVALID" in str(details)) or
                (message and "api key" in message.lower())
            ):
                return LetterWriteError(
                    KEY_REJECTED_MESSAGE,
                    kind="key_rejected"
                )
            # For non-key 400 INVALID_ARGUMENT, fall through to generic upstream error
            # by not returning here
        elif code == 429:
            return LetterWriteError(
                "Gemini rate limit or quota reached. Wait a minute, then try again.",
                kind="rate_limited"
            )
        else:
            # Other Gemini 4xx/5xx errors
            if status:
                detail = f"Gemini request failed (HTTP {code} {status}). Try again later."
            else:
                detail = f"Gemini request failed (HTTP {code}). Try again later."
            return LetterWriteError(detail, kind="upstream")
    elif isinstance(exc, httpx.HTTPError):
        return LetterWriteError(
            "Couldn't reach Gemini. Check your internet connection, then try again.",
            kind="upstream"
        )
    return None


def _call_gemini(config: AppConfig, packet: str) -> tuple[str, int, int]:
    from google import genai
    from google.genai import types

    base_url = config.gemini_base_url
    if base_url:
        client = genai.Client(
            api_key=config.gemini_api_key,
            http_options=types.HttpOptions(base_url=base_url),
        )
    else:
        client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(
        model=config.gemini_model,
        contents=f"{WRITER_SYSTEM}\n\n{packet}",
    )
    text = (response.text or "").strip()
    usage = getattr(response, "usage_metadata", None)
    tokens_in = int(getattr(usage, "prompt_token_count", 0) or 0)
    tokens_out = int(getattr(usage, "candidates_token_count", 0) or 0)
    if not text:
        raise LetterWriteError(EMPTY_LETTER_MESSAGE, kind="upstream")
    return text, tokens_in, tokens_out
