# Pipeline Ledger — local setup

## 1. Prerequisites
- Node.js 18+ installed (check with `node -v`)

## 2. Install & run
```bash
cd pipeline-ledger
npm install
npm run dev
```
This starts a local dev server (usually `http://localhost:5173`) — open it in your browser.

## 3. Demo it to your team on the same wifi/network
```bash
npm run dev -- --host
```
Vite will print a "Network" URL (like `http://192.168.1.42:5173`). Share that URL and
anyone on the same network can open the board on their own laptop/phone at the same time.

Note: with the included storage shim, each browser/device stores its own data
(via `localStorage`), so it won't be a truly shared live board across devices — good
enough for a "let me walk you through it" style demo, not real concurrent use.
See `src/storageShim.js` for how to wire up a real shared backend later.

## 4. Build a static version (to deploy or just double-check the production build)
```bash
npm run build
npm run preview   # serves the built dist/ folder locally
```
The `dist/` folder is a plain static site — you can drag-and-drop it onto Netlify,
or run `vercel deploy` / `netlify deploy` from this folder, or serve it from any
static host (S3, GitHub Pages, etc.).

## 5. What's different from the Claude.ai artifact version
- `src/storageShim.js` replaces Claude.ai's built-in `window.storage` (shared across
  everyone viewing the artifact) with a `localStorage`-based version (per-browser only).
  Everything else — the board, log, dashboard, projections — is the identical code.
- If/when you want a real always-on shared CRM for the team (not just a local demo),
  swap the shim for a small backend (Supabase/Firebase/a tiny Express+SQLite API) that
  implements the same `get/set/delete/list` shape — no changes needed elsewhere.
