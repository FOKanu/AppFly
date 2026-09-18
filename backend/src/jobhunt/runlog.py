"""Markdown snippet for a pipeline run.

Purpose: Format today's scout/match/write counts for ``Runs/YYYY-MM-DD.md``.
Inputs: Timestamps and integer stats from ``jobhunt run``.
Returns: A Markdown string (not written to disk here).
Does not: Touch the vault or call Gemini.
"""

from __future__ import annotations

from datetime import datetime


def format_run_note(
    *,
    started: datetime,
    scouted: int,
    shortlisted: int,
    skipped: int,
    written: int,
    write_skipped: int,
    model: str,
    errors: list[str],
) -> str:
    """Build one run section.

    Purpose: Human-readable log block appended by the vault.
    Inputs: Start time, counts, Gemini model name, optional error strings.
    Returns: Markdown with a time range and bullet stats.
    Does not: Write the file (``Vault.append_run_note`` does).
    """

    finished = datetime.now().astimezone()
    lines = [
        f"## {started.strftime('%H:%M')}–{finished.strftime('%H:%M')}",
        "",
        f"- Scouted new jobs: {scouted}",
        f"- Shortlisted: {shortlisted}",
        f"- Skipped by matcher: {skipped}",
        f"- Letters written ({model}): {written}",
        f"- Letters skipped (already present or gemini: false): {write_skipped}",
    ]
    if errors:
        lines.extend(["", "### Errors", ""])
        lines.extend(f"- {item}" for item in errors)
    return "\n".join(lines)
