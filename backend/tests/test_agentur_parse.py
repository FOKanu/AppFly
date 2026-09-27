"""Agentur Jobsuche response parsing (v6 ergebnisliste shape)."""

from __future__ import annotations

from jobhunt.features.scout.agentur import _extract_items, _pages_from_total, _to_job


def test_extract_items_reads_ergebnisliste() -> None:
    payload = {
        "ergebnisliste": [
            {"referenznummer": "REF-1", "stellenangebotsTitel": "Dev"},
        ],
        "maxErgebnisse": 1,
        "size": 25,
    }
    items = _extract_items(payload)
    assert len(items) == 1
    assert items[0]["referenznummer"] == "REF-1"


def test_extract_items_still_reads_legacy_stellenangebote() -> None:
    payload = {"stellenangebote": [{"referenznummer": "LEGACY"}]}
    assert _extract_items(payload)[0]["referenznummer"] == "LEGACY"


def test_pages_from_total() -> None:
    assert _pages_from_total({"maxErgebnisse": 64, "size": 25}, 1) == 3
    assert _pages_from_total({}, 2) == 2


def test_to_job_reads_externeURL_and_stellenlokationen() -> None:
    item = {
        "stellenangebotsTitel": "Softwareentwickler (m/w/d)",
        "firma": "bayoonet AG",
        "externeURL": "https://www.example.com/jobs/1",
        "referenznummer": "REF-99",
        "stellenlokationen": [{"adresse": {"plz": "10115", "ort": "Berlin", "region": "BERLIN"}}],
        "datumErsteVeroeffentlichung": "2026-09-15",
    }
    job = _to_job(item, {}, "REF-99")
    assert job.title.startswith("Softwareentwickler")
    assert job.company == "bayoonet AG"
    assert job.url == "https://www.example.com/jobs/1"
    assert "Berlin" in job.location
    assert job.posted == "2026-09-15"
