import pytest
from jobhunt.config import AppConfig
from jobhunt.features.write import letters


def _boom(config, packet):
    raise RuntimeError("billing")


def test_gemini_fails_uses_ollama():
    """Test that when Gemini fails, it falls back to Ollama."""
    # Mock the functions
    original_call_gemini = letters._call_gemini
    original_call_ollama = letters._call_ollama

    # Set up mocks
    letters._call_gemini = _boom
    letters._call_ollama = lambda c, p: ("L", 1, 2)

    try:
        result = letters._write_one(AppConfig(), "P")
        assert result == ("L", 1, 2, "ollama", "qwen3:8b")
    finally:
        # Restore original functions
        letters._call_gemini = original_call_gemini
        letters._call_ollama = original_call_ollama


def test_both_fail():
    """Test that when both Gemini and Ollama fail, it raises LetterWriteError."""
    # Mock the functions
    original_call_gemini = letters._call_gemini
    original_call_ollama = letters._call_ollama

    # Set up mocks
    letters._call_gemini = _boom
    letters._call_ollama = _boom

    try:
        with pytest.raises(letters.LetterWriteError, match="Ollama fallback failed"):
            letters._write_one(AppConfig(), "P")
    finally:
        # Restore original functions
        letters._call_gemini = original_call_gemini
        letters._call_ollama = original_call_ollama


def test_gemini_ok_skips_ollama():
    """Test that when Gemini succeeds, it doesn't call Ollama."""
    # Mock the functions
    original_call_gemini = letters._call_gemini
    original_call_ollama = letters._call_ollama

    # Set up mocks
    letters._call_gemini = lambda c, p: ("G", 1, 1)
    letters._call_ollama = _boom

    try:
        result = letters._write_one(AppConfig(), "P")
        assert result[3] == "gemini"
    finally:
        # Restore original functions
        letters._call_gemini = original_call_gemini
        letters._call_ollama = original_call_ollama


def test_no_fallback():
    """Test that when writer_fallback is False, it doesn't fall back to Ollama."""
    # Mock the function
    original_call_gemini = letters._call_gemini

    # Set up mock
    letters._call_gemini = _boom

    try:
        with pytest.raises(RuntimeError):
            letters._write_one(AppConfig(writer_fallback=False), "P")
    finally:
        # Restore original function
        letters._call_gemini = original_call_gemini
