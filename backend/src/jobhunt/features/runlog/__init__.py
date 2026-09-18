"""Format a day's run note body for the vault Runs/ folder.

Purpose: Turn scout/match/write counts into markdown for Home.md companions.
Inputs: Timestamps and integer stats from `jobhunt run`.
Returns: Markdown string (caller writes the file).
Does not: Read the vault or send HTTP.
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
    """Build one markdown section for a CLI run.

    Purpose: Human-readable log appended under Runs/YYYY-MM-DD.md.
    Inputs: Start time, scout/match/write counts, model name, error strings.
    Returns: Markdown without the YAML frontmatter (Vault.append_run_note adds that).
    Does not: Write disk or include API keys.
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
