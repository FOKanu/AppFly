from __future__ import annotations

import base64
import re
import time
from typing import Any

import httpx

from jobhunt.config import AppConfig
from jobhunt.models import Job

JOBSUCHE_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service"
SEARCH_PATH = "/pc/v6/jobs"
DETAIL_PATH = "/pc/v4/jobdetails/{code}"
PAGE_SIZE = 25
MAX_PAGES = 4
REQUEST_PAUSE_S = 0.4


def fetch_agentur_jobs(config: AppConfig) -> list[Job]:
    headers = {
        "X-API-Key": config.jobsuche_api_key,
        "User-Agent": "jobhunt/0.1 (personal job search; +local)",
        "Accept": "application/json",
    }
    jobs: list[Job] = []
    seen: set[str] = set()
    query = " ".join(config.keywords).strip() or "Software Engineer"

    with httpx.Client(base_url=JOBSUCHE_BASE, headers=headers, timeout=30.0) as client:
        for page in range(1, MAX_PAGES + 1):
            payload = _search(client, config, query, page)
            items = _extract_items(payload)
            if not items:
                break
            for item in items:
                ref = _refnr(item)
                if not ref or ref in seen:
                    continue
                seen.add(ref)
                time.sleep(REQUEST_PAUSE_S)
                details = _details(client, ref)
                jobs.append(_to_job(item, details, ref))
            max_page = int(payload.get("maxSeiten") or payload.get("pageCount") or page)
            if page >= max_page:
                break
    return jobs


def _search(client: httpx.Client, config: AppConfig, query: str, page: int) -> dict[str, Any]:
    params: dict[str, Any] = {
        "was": query,
        "wo": config.location,
        "umkreis": config.radius_km,
        "page": page,
        "size": PAGE_SIZE,
        "veroeffentlichtseit": config.published_days,
    }
    response = client.get(SEARCH_PATH, params=params)
    response.raise_for_status()
    data = response.json()
    return data if isinstance(data, dict) else {}


def _details(client: httpx.Client, refnr: str) -> dict[str, Any]:
    code = base64.b64encode(refnr.encode("utf-8")).decode("ascii")
    response = client.get(DETAIL_PATH.format(code=code))
    if response.status_code >= 400:
        return {}
    data = response.json()
    return data if isinstance(data, dict) else {}


def _extract_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    for key in ("stellenangebote", "jobs", "items", "results"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def _refnr(item: dict[str, Any]) -> str:
    for key in ("referenznummer", "refnr", "refNr", "jobReference"):
        value = item.get(key)
        if value:
            return str(value)
    return ""


def _to_job(item: dict[str, Any], details: dict[str, Any], ref: str) -> Job:
    title = _first_str(details, item, "stellenangebotsTitel", "titel", "title") or "Untitled"
    company = _first_str(details, item, "arbeitgeber", "firma", "company") or "Unknown"
    location = _location(details) or _location(item)
    description = _description(details) or _first_str(details, item, "kurztext", "teaser") 
    url = _first_str(details, item, "externeUrl", "url", "href") or _agentur_url(ref)
    address = _address(details)
    salary = _first_str(details, item, "verguetung", "gehalt", "salary")
    posted = _first_str(details, item, "aktuelleVeroeffentlichungsdatum", "eintrittsdatum")
    return Job(
        source_id=ref,
        source="agentur",
        title=title,
        company=company,
        url=url,
        location=location,
        description=description,
        salary=salary,
        address=address,
        posted=posted,
        extra={"refnr": ref},
    )


def _first_str(primary: dict[str, Any], secondary: dict[str, Any], *keys: str) -> str:
    for blob in (primary, secondary):
        for key in keys:
            value = blob.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return ""


def _location(blob: dict[str, Any]) -> str:
    ort = blob.get("arbeitsort") or blob.get("arbeitsorte")
    if isinstance(ort, str):
        return ort
    if isinstance(ort, dict):
        return _format_place(ort)
    if isinstance(ort, list) and ort:
        first = ort[0]
        if isinstance(first, dict):
            return _format_place(first)
        return str(first)
    parts = [blob.get("ort"), blob.get("plz"), blob.get("region")]
    return " ".join(str(part) for part in parts if part)


def _format_place(place: dict[str, Any]) -> str:
    parts = [
        place.get("ort"),
        place.get("plz"),
        place.get("region"),
        place.get("land"),
    ]
    return ", ".join(str(part) for part in parts if part)


def _description(details: dict[str, Any]) -> str:
    for key in (
        "stellenangebotsBeschreibung",
        "stellenbeschreibung",
        "beschreibung",
        "jobDescription",
    ):
        value = details.get(key)
        if isinstance(value, str) and value.strip():
            return _strip_tags(value)
    return ""


def _address(details: dict[str, Any]) -> str:
    for key in ("arbeitgeberAdresse", "adresse", "impressum"):
        value = details.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            parts = [
                value.get("strasse"),
                value.get("hausnummer"),
                value.get("plz"),
                value.get("ort"),
            ]
            formatted = " ".join(str(part) for part in parts if part)
            if formatted:
                return formatted
    place = details.get("arbeitsort")
    if isinstance(place, dict):
        return _format_place(place)
    return ""


def _agentur_url(ref: str) -> str:
    return f"https://www.arbeitsagentur.de/jobsuche/jobdetail/{ref}"


def _strip_tags(text: str) -> str:
    return " ".join(re.sub(r"<[^>]+>", " ", text).split())
