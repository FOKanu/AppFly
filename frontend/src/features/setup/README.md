# Setup (M6 first-launch wizard)

Purpose: Full-screen `/setup` flow — init workspace → Gemini key → upload CV.
Gate: redirect when `!has_gemini || !has_cv` unless dismissed in localStorage.
Does not: Show CV bodies, echo API keys, fetch job boards, or invent endpoints.

Design: [docs/workflow/briefs/M6-claude-decision.md](../../../../docs/workflow/briefs/M6-claude-decision.md).
