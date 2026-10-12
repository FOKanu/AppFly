from jobhunt.features.match import hard_filter, why_match
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


def test_match_jobs_hard_filtered_sets_score_none() -> None:
    # Test that hard-filtered jobs get score=None, not score=0
    from jobhunt.features.match.matcher import match_jobs
    from jobhunt.vault import Vault
    from unittest.mock import Mock

    # Create a mock vault that returns a job with banned terms
    vault = Mock(spec=Vault)
    job = _job(title="Python Rolle über Personalvermittlung")
    vault.iter_job_notes.return_value = [Mock(metadata={"status": "inbox"}, source_id="1")]
    vault.job_from_note.return_value = job
    vault.load_requirements.return_value = Requirements(banned_terms=["Personalvermittlung"])
    vault.read_cv.return_value = ""

    # Mock the update_job_meta to capture the arguments
    update_job_meta_calls = []
    def mock_update_job_meta(source_id, **kwargs):
        update_job_meta_calls.append(kwargs)
        return None

    vault.update_job_meta.side_effect = mock_update_job_meta

    # Run match_jobs
    match_jobs(Mock(shortlist_size=5), vault, cv_text="")

    # Verify that score=None was passed to update_job_meta
    assert len(update_job_meta_calls) == 1
    assert update_job_meta_calls[0]["score"] is None
    assert update_job_meta_calls[0]["status"] == "skipped"
    assert update_job_meta_calls[0]["skip_reason"].startswith("banned:")


def test_why_match_uses_shared_skills() -> None:
    bullets = why_match(
        _job(),
        Requirements(nice_to_have=["Python"], languages=["de"]),
        "Python developer",
    )
    assert any("Python" in item for item in bullets)
