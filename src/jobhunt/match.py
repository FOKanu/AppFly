from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from jobhunt.config import AppConfig
from jobhunt.models import Job, Requirements
from jobhunt.vault import Vault

EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
SALARY_RE = re.compile(r"(\d[\d.\s]{3,})")


def match_jobs(config: AppConfig, vault: Vault) -> dict[str, int]:
    requirements = vault.load_requirements()
    cv_text = vault.read_cv()
    scored: list[tuple[Job, float, list[str], object]] = []
    skipped = 0
    unchanged = 0

    for post in vault.iter_job_notes():
        status = str(post.metadata.get("status") or "inbox")
        job = vault.job_from_note(post)
        if status in {"draft", "approved", "applied"}:
            unchanged += 1
            continue
        if status == "skipped":
            unchanged += 1
            continue
        ok, reason = hard_filter(job, requirements)
        if not ok:
            vault.update_job_meta(job.source_id, status="skipped", skip_reason=reason, score=0)
            skipped += 1
            continue
        if status == "shortlist":
            score, bullets = _score_job(config, job, requirements, cv_text)
            vault.update_job_meta(
                job.source_id,
                score=round(score, 3),
                why="\n".join(f"- {item}" for item in bullets),
            )
            unchanged += 1
            continue
        scored.append((job, 0.0, [], post))

    if not scored:
        return {"shortlisted": 0, "skipped": skipped, "unchanged": unchanged}

    jobs = [item[0] for item in scored]
    scores = score_jobs(config, jobs, requirements, cv_text)
    ranked = sorted(zip(jobs, scores, strict=True), key=lambda pair: pair[1], reverse=True)
    promote = {job.source_id for job, _ in ranked[: config.shortlist_size]}
    shortlisted = 0
    for job, score in ranked:
        bullets = why_match(job, requirements, cv_text)
        status = "shortlist" if job.source_id in promote else "inbox"
        vault.update_job_meta(
            job.source_id,
            status=status,
            score=round(float(score), 3),
            why="\n".join(f"- {item}" for item in bullets),
        )
        if status == "shortlist":
            shortlisted += 1
    return {"shortlisted": shortlisted, "skipped": skipped, "unchanged": unchanged}


def hard_filter(job: Job, requirements: Requirements) -> tuple[bool, str]:
    haystack = job.text.casefold()
    if any(company.casefold() == job.company.casefold() for company in requirements.skip_companies):
        return False, f"skip_company:{job.company}"
    for term in requirements.banned_terms:
        if term and term.casefold() in haystack:
            return False, f"banned:{term}"
    if requirements.must_have:
        missing = [term for term in requirements.must_have if term.casefold() not in haystack]
        if missing:
            return False, f"missing:{','.join(missing)}"
    if requirements.locations and not _location_ok(job.location, job.text, requirements.locations):
        return False, "location"
    if requirements.salary_floor:
        salary = _salary_value(job.salary) or _salary_value(job.description)
        if salary and salary < requirements.salary_floor:
            return False, f"salary:{salary}"
    return True, ""


def why_match(job: Job, requirements: Requirements, cv_text: str) -> list[str]:
    tokens = _skill_tokens(requirements, cv_text)
    haystack = job.text.casefold()
    hits = [token for token in tokens if token.casefold() in haystack]
    bullets: list[str] = []
    if hits:
        bullets.append("Shared skills: " + ", ".join(hits[:8]))
    if job.location:
        bullets.append(f"Location: {job.location}")
    if requirements.languages:
        bullets.append("Preferred languages: " + ", ".join(requirements.languages))
    if not bullets:
        bullets.append("Passed hard filters; review the description.")
    return bullets[:3]


def score_jobs(
    config: AppConfig,
    jobs: list[Job],
    requirements: Requirements,
    cv_text: str,
) -> list[float]:
    query = _query_text(requirements, cv_text)
    query_vec = _embed(config, query)
    scores: list[float] = []
    for job in jobs:
        job_vec = _embed(config, job.text[:4000])
        cosine = _cosine(query_vec, job_vec)
        overlap = _overlap_bonus(job, requirements, cv_text)
        scores.append(0.8 * cosine + 0.2 * overlap)
    return scores


def _score_job(
    config: AppConfig,
    job: Job,
    requirements: Requirements,
    cv_text: str,
) -> tuple[float, list[str]]:
    scores = score_jobs(config, [job], requirements, cv_text)
    return scores[0], why_match(job, requirements, cv_text)


def _query_text(requirements: Requirements, cv_text: str) -> str:
    skills = " ".join(requirements.must_have + requirements.nice_to_have)
    return f"{cv_text}\n{skills}".strip()[:4000]


def _skill_tokens(requirements: Requirements, cv_text: str) -> list[str]:
    tokens = list(requirements.must_have) + list(requirements.nice_to_have)
    for line in cv_text.splitlines():
        cleaned = line.strip(" -*\t")
        if 2 < len(cleaned) < 40 and not cleaned.endswith(":"):
            tokens.append(cleaned)
    seen: set[str] = set()
    unique: list[str] = []
    for token in tokens:
        key = token.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(token)
    return unique


def _location_ok(location: str, text: str, allowed: list[str]) -> bool:
    blob = f"{location} {text}".casefold()
    if any(term.casefold() in blob for term in allowed):
        return True
    if any(term.casefold() == "remote" for term in allowed) and "remote" in blob:
        return True
    if not location.strip():
        return True
    return False


def _salary_value(text: str) -> int | None:
    if not text:
        return None
    match = SALARY_RE.search(text.replace(",", ""))
    if not match:
        return None
    digits = re.sub(r"\D", "", match.group(1))
    if not digits:
        return None
    value = int(digits)
    if value < 1000:
        return None
    return value


def _overlap_bonus(job: Job, requirements: Requirements, cv_text: str) -> float:
    tokens = _skill_tokens(requirements, cv_text)
    if not tokens:
        return 0.0
    haystack = job.text.casefold()
    hits = sum(1 for token in tokens if token.casefold() in haystack)
    return min(1.0, hits / max(3, len(tokens[:12])))


def _embed(config: AppConfig, text: str) -> list[float]:
    cache_dir = config.cache_dir / "embeddings"
    cache_dir.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(f"{EMBED_MODEL}\n{text}".encode("utf-8")).hexdigest()
    cache_path = cache_dir / f"{key}.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    vector = _model_embed(text)
    cache_path.write_text(json.dumps(vector), encoding="utf-8")
    return vector


def _model_embed(text: str) -> list[float]:
    from sentence_transformers import SentenceTransformer

    model = _load_model()
    vector = model.encode(text, normalize_embeddings=True)
    return [float(x) for x in vector.tolist()]


_MODEL = None


def _load_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer

        _MODEL = SentenceTransformer(EMBED_MODEL)
    return _MODEL


def _cosine(left: list[float], right: list[float]) -> float:
    return float(sum(a * b for a, b in zip(left, right, strict=False)))


def empty_cache_file(path: Path) -> None:
    if path.exists():
        path.unlink()
