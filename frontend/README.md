# AppFly frontend (review shell)

Minimal Vite + React app so **Tonight** and **Workflow** can be reviewed before the copilot shell exists.

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
npm run build
npm test
```

Pages:

- `/` — Tonight dashboard (`features/tonight`)
- `/workflow` — pipeline stepper (`features/workflow`)

Data comes from `GET /health`, `GET /runs`, `GET /jobs?status=draft|shortlist`. When the local API is down, the client falls back to fixtures so the UI still renders. **Retry Gemini** calls `POST /write` only — it never fetches job-board URLs.

Preview states with `?preview=empty|running|failed` (Workflow also supports `rate_limited`).
