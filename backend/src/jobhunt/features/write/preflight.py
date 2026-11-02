"""Crawl deny-list for job boards that forbid automated access."""

from __future__ import annotations

import tempfile
from pathlib import Path

import httpx

from jobhunt.config import AppConfig
from jobhunt.store.paths import default_data_root


def data_dir_problem(root: Path | None = None) -> str | None:
    base = root or default_data_root()
    try:
        base.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=base):
            pass
    except OSError as exc:
        return f"AppFly data dir is not writable: {base} ({exc})"
    return None


def ollama_problem(config: AppConfig) -> str | None:
    url = config.ollama_url
    model = config.ollama_writer_model
    try:
        r = httpx.get(f"{url}/api/tags", timeout=3.0)
        r.raise_for_status()
        names = [m.get("name") for m in r.json().get("models", [])]
    except Exception as exc:
        return f"Ollama not reachable at {url} (is the tunnel up?): {exc}"
    if model not in names:
        return f"Ollama model {model} not found at {url}"
    return None


def _gemini_key(config: AppConfig) -> str:
    return config.gemini_api_key


def writer_problem(config: AppConfig) -> str | None:
    if _gemini_key(config):
        return None
    if not config.writer_fallback:
        return "No letter writer: Gemini key missing and Ollama fallback disabled"
    p = ollama_problem(config)
    return None if p is None else f"No letter writer: Gemini key missing; {p}"


def run_preflight(config: AppConfig, root: Path | None = None) -> dict:
    problems = [p for p in (data_dir_problem(root), writer_problem(config)) if p]
    return {"ok": not problems, "problems": problems}
