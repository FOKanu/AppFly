# Frontend (Memory & Activity)

Minimal Vite + React + TypeScript UI so `/memory` and `/activity` can ship before the full app chrome lands.

```bash
cd frontend
npm install
npm run dev    # http://127.0.0.1:5173/memory
npm run test
npm run build
```

`VITE_API_BASE_URL` defaults to `http://127.0.0.1:8787`. No connector keys belong in frontend env.
