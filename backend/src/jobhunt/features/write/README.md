# Write

Purpose: Build a sealed packet (one job + CV slice + voice samples) and draft a letter with Gemini. Human submits in the browser.

## Main files

- `__init__.py` — `write_letters`, `build_packet`

Compatibility imports: `jobhunt.write`.

## How to extend

Keep packets sealed: never include a second job or employer. Do not log `GEMINI_API_KEY`. Tests: `backend/tests/test_write.py`.
