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
