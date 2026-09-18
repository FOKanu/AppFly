from jobhunt.match import hard_filter, why_match
from jobhunt.models import Job, Requirements


def _job(**overrides) -> Job:
    data = dict(
        source_id="1",
        source="inbox",
        title="Python Engineer",
        company="Acme",
        description="We need Python and APIs in Berlin.",
        location="Berlin",
    )
    data.update(overrides)
    return Job(**data)


def test_banned_agency_term_skips_job() -> None:
    job = _job(title="Python Rolle über Personalvermittlung")
    ok, reason = hard_filter(job, Requirements(banned_terms=["Personalvermittlung"]))
    assert ok is False
    assert reason.startswith("banned:")


def test_must_have_enforced() -> None:
    job = _job(title="Backend Engineer", description="Java only")
    ok, reason = hard_filter(job, Requirements(must_have=["Python"]))
    assert ok is False
    assert "Python" in reason


def test_skip_company() -> None:
    job = _job(company="Evil Staffing")
    ok, _ = hard_filter(job, Requirements(skip_companies=["Evil Staffing"]))
    assert ok is False


def test_why_match_uses_shared_skills() -> None:
    bullets = why_match(
        _job(),
        Requirements(nice_to_have=["Python"], languages=["de"]),
        "Python developer",
    )
    assert any("Python" in item for item in bullets)
