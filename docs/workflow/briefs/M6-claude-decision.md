# M6 Claude decision — first-launch wizard

Source: Mac Claude Code CLI (`-p`) against [M6-claude-ask.md](M6-claude-ask.md), tip `759b508`.
Cloud check-in: Composer resolved flags below before coding.

## 1. Decision

Full-screen `/setup` **outside** AppShell. Gate on `GET /workspace/status`: redirect when `!has_gemini || !has_cv` unless `localStorage["appfly.setup.dismissed"] === "1"`. Same in desktop and browser. Steps: (1) init workspace → (2) Gemini key → (3) upload CV. Voice/keywords optional on Done. Skip allowed on 2/3; "Set up later" dismisses. Reopen from Settings → WorkspacePanel.

## 2–4

See Claude output in session (states table, acceptance, privacy pass). Full states live in the ask transcript; implementers use acceptance in §3 of Claude reply + flag resolutions.

## 5. Flags — cloud resolutions

| Flag | Resolution |
| --- | --- |
| F1 unreadable CV finishes | **Accept** with warning banner; no new backend field |
| F2 `active_cv=true` on upload | **Verified:** `SqliteStore.add_document` clears other `active_cv` when true. Use `uploadDocument(file, "cv", true)` |
| F3 env `GEMINI_API_KEY` → already configured | **Accept** for MVP |
| F4 keychain PUT error | Use `describeApiError`; never echo key |
| F5 API spawn race | Gate **retries status up to ~5s** before giving up (no redirect on persistent failure) |
| F6 formats | Copy: **PDF, DOCX, or TXT/MD** (matches `extract_document_text`) |
| F7 markdown backend | **Show wizard**; Step 1 shows vault path when `storage_backend=markdown` |

## Slicing (Composer implements)

1. Route + gate + dismissed flag + SetupPage shell/steps wiring  
2. Step 1 init + Step 2 key (ConnectorKeyField / putConnectorSecret)  
3. Step 3 upload + Done + WorkspacePanel link + CSS  
