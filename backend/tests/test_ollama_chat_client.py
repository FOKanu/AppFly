from types import SimpleNamespace

from jobhunt.config import AppConfig
from jobhunt.features.write import letters


def test_call_ollama_posts_packet(monkeypatch):
    calls = []

    def fake_post(url, json, timeout):
        calls.append((url, json, timeout))
        return SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {
                "message": {"content": " Hi "},
                "prompt_eval_count": 3,
                "eval_count": 2
            }
        )

    monkeypatch.setattr(letters.httpx, "post", fake_post)
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    monkeypatch.delenv("OLLAMA_MODEL", raising=False)

    assert letters._call_ollama(AppConfig(), "PKT") == ("Hi", 3, 2)
    url, body, _ = calls[0]
    assert url == "http://127.0.0.1:11434/api/chat"
    assert body["messages"] == [
        {"role": "system", "content": letters.WRITER_SYSTEM},
        {"role": "user", "content": "PKT"}
    ]
    assert body["stream"] is False and body["model"] == "qwen3:8b"
