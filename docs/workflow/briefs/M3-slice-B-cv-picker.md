You are the local coder on AppFly. Implement ONLY M3 slice B. No planning essays. Do not commit.

REPO: FOKanu/AppFly (~/work/AppFly on 5090 WSL)
BRANCH: feat/ui-cv-picker (slice A already landed @ 188e2c5)

ALLOWED FILES:
- frontend/src/app/layout/ControlHeader.tsx
- frontend/src/shared/run/CvPicker.tsx
- frontend/src/shared/run/CvPicker.module.css (only if needed; prefer existing tokens / layout CSS patterns)

FORBIDDEN: useRunController (done in A), Workflow pages (slice C), package.json, backend/**, docs/**

CONTEXT: RunContext now exposes cvId, setCvId, cvOptions, cvState, cvLabel, runDisabled, runTitle. useRun() is available. Claude decision: picker in ControlHeader before Run now; metadata only; session override; icon+sheet on narrow widths.

BRIEF:
1. Add CvPicker component that reads useRun() and renders a labelled select ("CV for this run").
2. States/copy from M3-claude-decision (loading skeleton, ready with active tag / override tooltip, empty → link to /vault, offline —, error with retry calling a refresh if exposed — if refreshCvs not on context, omit retry or call setCvId only; do not expand RunContext in this slice unless you must add refreshCvs: () => void to the controller — prefer omit retry button if not available).
3. Options with extract_status not ok / empty / unsupported / error: shown disabled with suffix copy.
4. Disabled while runDisabled from an active run (use run.ui / runDisabled).
5. Wire into ControlHeader immediately before Run now button.
6. Mobile: collapse to icon that opens a simple sheet/popover with the same select (CSS media query; keep it minimal).
7. Never fetch /documents/{id}/text. Never show CV body.

INVARIANTS: metadata only; match existing Button/tokens; keyboard operable.

CHECKS: cd frontend && npm run build

DONE WHEN: picker visible in header; build passes.

RETURN: summary, self-review, check output, flags. Do not commit.
