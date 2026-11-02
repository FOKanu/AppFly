import httpx

from jobhunt.config import AppConfig
from jobhunt.features.write import preflight


class _R:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"models": [{"name": "qwen3:8b"}]}


def _down(*a, **k):
    raise httpx.ConnectError("refused")


def _key(monkeypatch, value: str) -> None:
    monkeypatch.setattr(preflight, "_gemini_key", lambda c: value)
    monkeypatch.delenv("OLLAMA_MODEL", raising=False)
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)


def test_data_dir_ok(tmp_path):
    assert preflight.data_dir_problem(tmp_path / "d") is None


def test_data_dir_not_writable(tmp_path):
    f = tmp_path / "file"
    f.write_text("x")
    assert "not writable" in preflight.data_dir_problem(f / "sub")


def test_no_key_is_a_problem(monkeypatch):
    _key(monkeypatch, "")
    monkeypatch.setattr(preflight.httpx, "get", lambda *a, **k: _R())
    assert "No letter writer: Gemini key missing (Ollama is only a fallback for failed Gemini calls)" in preflight.writer_problem(AppConfig())


def test_writer_ok_with_key(monkeypatch):
    monkeypatch.setattr(preflight, "_gemini_key", lambda c: "k")
    assert preflight.writer_problem(AppConfig()) is None


def test_ollama_ok(monkeypatch):
    _key(monkeypatch, "k")
    monkeypatch.setattr(preflight.httpx, "get", lambda *a, **k: _R())
    assert preflight.writer_problem(AppConfig()) is None


def test_ollama_down(monkeypatch):
    _key(monkeypatch, "k")
    monkeypatch.setattr(preflight.httpx, "get", _down)
    assert "tunnel" in preflight.writer_problem(AppConfig())


def test_key_no_fallback_skips_ollama(monkeypatch):
    _key(monkeypatch, "k")
    monkeypatch.setattr(preflight.httpx, "get", _down)
    assert preflight.writer_problem(AppConfig(writer_fallback=False)) is None


def test_run_preflight_reports(monkeypatch, tmp_path):
    _key(monkeypatch, "k")
    monkeypatch.setattr(preflight.httpx, "get", _down)
    r = preflight.run_preflight(AppConfig(), tmp_path)
    assert r["ok"] is False
    assert len(r["problems"]) == 1
