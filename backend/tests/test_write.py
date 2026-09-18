from jobhunt.models import Job, Requirements
from jobhunt.features.write import build_packet


def test_packet_contains_only_the_given_job() -> None:
    job = Job(
        source_id="a1",
        source="agentur",
        title="Backend Engineer",
        company="Acme",
        url="https://example.com/acme",
        location="Berlin",
        description="Work on APIs. " * 200,
    )
    other = "Frontend Designer at OtherCorp"
    packet = build_packet(
        job,
        cv_text="I build APIs.",
        samples="Dear team, I would like to apply.",
        company_note="Acme makes software.",
        requirements=Requirements(tone="plain", languages=["en"]),
        excerpt_chars=120,
    )
    assert "Backend Engineer" in packet
    assert "Acme" in packet
    assert other not in packet
    excerpt = packet.split("## Job description excerpt", 1)[1].split("## Company note", 1)[0]
    assert len(excerpt.strip()) <= 200
