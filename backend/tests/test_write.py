"""Letter writer tests: sealed packet, Gemini client base URL, key lookup order."""

from __future__ import annotations

from types import SimpleNamespace
from typing import ClassVar

import pytest
from google import genai

from jobhunt.config import AppConfig, load_config
from jobhunt.features.secrets.names import SecretName
from jobhunt.features.write import build_packet
from jobhunt.features.write.letters import (
    LetterWriteError,
    MISSING_KEY_MESSAGE,
    _call_gemini,
    regenerate_letter_for_job,
    write_letters,
)
from jobhunt.models import Job, Requirements


class FakeGenaiClient:
    calls: ClassVar[list[dict]] = []

    def __init__(self, **kwargs) -> None:
        self.calls.append(kwargs)
        self.models = self

    def generate_content(self, model, contents):
        return SimpleNamespace(
            text="Subject: Hi\n\nDear team",
            usage_metadata=SimpleNamespace(prompt_token_count=10, candidates_token_count=5)
        )


class FakeVault:
    def __init__(self, companies: list[str]):
        self.posts = [
            SimpleNamespace(metadata={"status": "shortlist", "company": c})
            for c in companies
        ]
        self.letters: list[str] = []

    def load_requirements(self):
        return Requirements(tone="plain", languages=["en"])

    def read_cv(self):
        return "I build APIs."

    def read_voice_samples(self):
        return ""

    def read_company_body(self, company):
        return ""

    def iter_job_notes(self):
        return self.posts

    def job_from_note(self, post):
        return Job(
            source_id=post.metadata["company"],
            source="agentur",
            title="Backend Engineer",
            company=post.metadata["company"],
            url="https://example.com/job",
            location="Berlin",
            description="Work on APIs.",
        )

    def write_letter(self, job, body, *, model, tokens_in, tokens_out):
        self.letters.append(job.company)


@pytest.fixture(autouse=True)
def fake_genai(monkeypatch):
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    FakeGenaiClient.calls = []
    monkeypatch.setattr(genai, "Client", FakeGenaiClient)
    return FakeGenaiClient.calls


def _job() -> Job:
    """Return a test job."""
    return Job(
        source_id="a1",
        source="agentur",
        title="Backend Engineer",
        company="Acme",
        url="https://example.com/acme",
        location="Berlin",
        description="Work on APIs. " * 200,
    )


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


def test_base_url_unset_uses_default_endpoint(secret_store, fake_genai) -> None:
    secret_store.save(SecretName.gemini, "test-key")
    result = _call_gemini(AppConfig(), "packet")
    assert result == ("Subject: Hi\n\nDear team", 10, 5)
    assert fake_genai == [{"api_key": "test-key"}]


def test_base_url_from_config_is_passed_to_client(secret_store, fake_genai) -> None:
    secret_store.save(SecretName.gemini, "test-key")
    result = _call_gemini(AppConfig(gemini_api_base="https://gateway.example.test"), "packet")
    assert result == ("Subject: Hi\n\nDear team", 10, 5)
    assert len(fake_genai) == 1
    call = fake_genai[0]
    assert call["api_key"] == "test-key"
    assert call["http_options"].base_url == "https://gateway.example.test"


def test_base_url_env_fallback_and_yaml_precedence(monkeypatch, secret_store) -> None:
    """Test base URL env fallback and YAML precedence."""
    assert AppConfig().gemini_base_url is None
    assert AppConfig(gemini_api_base="   ").gemini_base_url is None

    monkeypatch.setenv("GEMINI_API_BASE", "https://env-gw.example.test")
    assert AppConfig().gemini_base_url == "https://env-gw.example.test"

    config = AppConfig(gemini_api_base="https://yaml.example.test")
    assert config.gemini_base_url == "https://yaml.example.test"


def test_blank_yaml_base_falls_back_to_env(monkeypatch, secret_store) -> None:
    monkeypatch.setenv("GEMINI_API_BASE", "https://env-gw.example.test")
    assert AppConfig(gemini_api_base="   ").gemini_base_url == "https://env-gw.example.test"


def test_load_config_parses_gemini_api_base(tmp_path) -> None:
    """Test that load config parses gemini API base."""
    config_content = (
        f"vault_path: {tmp_path}/vault"
        f"\ngemini_api_base: https://gateway.example.test\n"
    )
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)
    cfg = load_config(path=config_file)
    assert cfg.gemini_api_base == "https://gateway.example.test"

    config_content_no_key = f"vault_path: {tmp_path}/vault\n"
    config_file.write_text(config_content_no_key)
    cfg = load_config(path=config_file)
    assert cfg.gemini_api_base is None


def test_api_key_lookup_order(secret_store, monkeypatch) -> None:
    secret_store.save(SecretName.gemini, "from-keychain")
    monkeypatch.setenv("GEMINI_API_KEY", "from-env")
    assert AppConfig().gemini_api_key == "from-keychain"

    secret_store.delete(SecretName.gemini)
    assert AppConfig().gemini_api_key == "from-env"

    monkeypatch.delenv("GEMINI_API_KEY")
    assert AppConfig().gemini_api_key == ""


def test_missing_key_raises_clear_error(secret_store, fake_genai) -> None:
    with pytest.raises(LetterWriteError) as exc_info:
        regenerate_letter_for_job(AppConfig(), object(), _job())

    assert MISSING_KEY_MESSAGE in exc_info.value.args[0]
    assert "Keychain" in exc_info.value.args[0]
    assert "GEMINI_API_KEY" in exc_info.value.args[0]
    assert fake_genai == []
    assert exc_info.value.kind == "missing_key"


def test_write_letters_continues_after_one_failure(secret_store, monkeypatch) -> None:
    """Test that write_letters continues after one failed job."""
    secret_store.save(SecretName.gemini, "test-key")

    vault = FakeVault(["Alpha", "Beta", "Gamma"])

    call_log = []

    def fake_call_gemini(config, packet):
        call_log.append(packet)
        if "Company: Beta" in packet:
            raise RuntimeError("429 RESOURCE_EXHAUSTED")
        return ("Subject: Hi\n\nDear team", 10, 5)

    monkeypatch.setattr("jobhunt.features.write.letters._call_gemini", fake_call_gemini)

    stats = write_letters(AppConfig(letter_cap=5), vault)

    assert stats["written"] == 2
    assert stats["failed"] == 1
    assert vault.letters == ["Alpha", "Gamma"]
    assert len(stats["errors"]) == 1
    assert "Beta" in stats["errors"][0]
    assert "429" in stats["errors"][0]
    # Check that old keys are still present
    assert "skipped" in stats
    assert "capped" in stats


def test_write_letters_missing_key_raises_before_loop(secret_store, monkeypatch) -> None:
    """Test that write_letters raises before the loop when no key is available."""
    call_log = []

    def fake_call_gemini(config, packet):
        call_log.append(packet)
        return ("Subject: Hi\n\nDear team", 10, 5)

    monkeypatch.setattr("jobhunt.features.write.letters._call_gemini", fake_call_gemini)

    vault = FakeVault(["Alpha"])
    with pytest.raises(RuntimeError, match="Keychain"):
        write_letters(AppConfig(), vault)

    # Assert that the call was never made
    assert len(call_log) == 0
    # Assert that no letters were written
    assert vault.letters == []


def test_missing_key_message_has_no_env_file_hint() -> None:
    """Test that MISSING_KEY_MESSAGE doesn't mention .env files."""
    assert ".env" not in MISSING_KEY_MESSAGE
