# Match

Applies hard filters from `Requirements.md` and scores remaining inbox jobs with a local embedding model. Public entry point: `match_jobs`. Does not fetch listings, call Gemini, or write cover letters. Keep scoring logic in `matcher.py`; do not fold scout or write into this folder.
