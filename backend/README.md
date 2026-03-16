# 3DS Printing Backend

Minimal Express/MySQL API for the 3DS Printing site.

## Setup
1) Install deps:
```bash
cd backend
npm install
```
2) Copy env template and adjust as needed (defaults match your local DB at port 3307, root/1234):
```bash
cp .env.example .env
```
3) Ensure the database/schema exists (see `schema.sql` you already have), then run:
```bash
npm run dev   # or: npm start
```

## Endpoints
- `GET /api/health` → `{ ok: true }` when DB reachable.
- `POST /api/signup` → body `{ name, email, password }`; creates user with bcrypt hash; returns `{ id, email, name }`.
- `POST /api/login` → body `{ email, password }`; verifies credentials; returns `{ id, name, email }`.

Notes:
- DB credentials come from env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Defaults are set for local dev.  
- You can add auth tokens/sessions later; currently it returns basic user info after login.
