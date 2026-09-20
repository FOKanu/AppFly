"""One-shot Obsidian vault import into NativeStore.

Purpose: Migrate Jobs/Letters/CV/Requirements/Runs without dual-write.
Inputs: Obsidian vault root and a SqliteStore.
Returns: Import report dict.
Does not: Enable live sync or crawl listing URLs.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import frontmatter

from jobhunt.store.sqlite import SqliteStore
from jobhunt.store.types import utc_now
from jobhunt.vault import Vault


def import_obsidian_vault(vault_root: Path, store: SqliteStore) -> dict[str, Any]:
    """Copy an Obsidian job vault into the native store.

    Purpose: Optional migration for existing users.
    Inputs: Path to vault (must contain Jobs/ or CV/).
    Returns: Counts and paths written; errors list.
    Does not: Delete the source vault or start dual-write.
    """

    root = vault_root.expanduser().resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"Vault not found: {root}")
    vault = Vault(root)
    report: dict[str, Any] = {
        "source": str(root),
        "jobs": 0,
        "letters": 0,
        "documents": 0,
        "runs": 0,
        "errors": [],
        "imported_at": utc_now(),
    }

    try:
        req = vault.load_requirements()
        store.save_requirements(req)
    except Exception as exc:  # noqa: BLE001
        report["errors"].append(f"requirements: {exc}")

    cv = vault.read_cv()
    if cv:
        store.add_document(
            kind="cv",
            label="Master (imported)",
            original_name="Master.md",
            mime="text/markdown",
            raw=cv.encode("utf-8"),
            extracted_text=cv,
            active_cv=True,
        )
        report["documents"] += 1

    voice = vault.read_voice_samples()
    if voice:
        store.add_document(
            kind="voice",
            label="Voice samples (imported)",
            original_name="Voice-samples.md",
            mime="text/markdown",
            raw=voice.encode("utf-8"),
            extracted_text=voice,
            active_voice=True,
        )
        report["documents"] += 1

    for post in vault.iter_job_notes():
        try:
            job = vault.job_from_note(post)
            status = str(post.metadata.get("status") or "inbox")
            store.upsert_job(job, status=status)
            score = post.metadata.get("score")
            updates: dict[str, object] = {}
            if score is not None and score != "":
                try:
                    updates["score"] = float(score)
                except (TypeError, ValueError):
                    pass
            if post.metadata.get("skip_reason"):
                updates["skip_reason"] = post.metadata.get("skip_reason")
            if updates:
                store.update_job_meta(job.source_id, **updates)
            report["jobs"] += 1

            letter_ref = str(post.metadata.get("letter") or "").strip()
            if letter_ref and letter_ref not in {"None", "null"}:
                body = _read_letter(vault, letter_ref)
                if body:
                    store.write_letter(
                        job,
                        body,
                        model=str(post.metadata.get("gemini_model") or ""),
                        tokens_in=int(post.metadata.get("tokens_in") or 0),
                        tokens_out=int(post.metadata.get("tokens_out") or 0),
                    )
                    # restore status if write_letter forced draft
                    if status in {"approved", "applied", "skipped", "shortlist", "inbox"}:
                        store.update_job_meta(job.source_id, status=status)
                    report["letters"] += 1
        except Exception as exc:  # noqa: BLE001
            report["errors"].append(f"job: {exc}")

    if vault.runs_dir.exists():
        for path in sorted(vault.runs_dir.glob("*.md")):
            try:
                text = path.read_text(encoding="utf-8")
                store.append_run_note(path.stem, text)
                report["runs"] += 1
            except Exception as exc:  # noqa: BLE001
                report["errors"].append(f"run {path.name}: {exc}")

    report_path = store.data_path() / "imports" / f"obsidian-{utc_now().replace(':', '')}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    import json

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["report_path"] = str(report_path)
    store.regenerate_home(last_run=f"import {utc_now()}")
    return report


def _read_letter(vault: Vault, letter_ref: str) -> str | None:
    import re

    match = re.match(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", letter_ref.strip())
    target = match.group(1).strip() if match else letter_ref
    stem = target.split("/")[-1]
    path = vault.letters_dir / f"{stem}.md"
    if not path.exists():
        return None
    post = frontmatter.loads(path.read_text(encoding="utf-8"))
    return (post.content or "").strip() or None
