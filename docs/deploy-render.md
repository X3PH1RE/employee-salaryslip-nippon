# Deploy backend on Render

The API runs as a **Web Service** on [Render](https://render.com) with Gunicorn. No bundle size limits like serverless — use full `requirements.txt` (pandas, WeasyPrint/ReportLab, supabase).

## Option A — Blueprint (recommended)

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo — Render reads [`render.yaml`](../render.yaml) at the repo root.
4. After the service is created, open **Environment** and set secrets marked `sync: false` in the blueprint:
   - `DATABASE_URL` — Supabase Postgres URI (pooler port **6543** or direct **5432**)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
5. **Manual Deploy** (or wait for auto-deploy on push).
6. Health check: `https://<your-service>.onrender.com/api/health`
7. Create admin (once): `POST https://<your-service>.onrender.com/api/auth/setup`

## Option B — Manual Web Service

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn "run:app" --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| **Health Check Path** | `/api/health` |

Set the same environment variables as [backend/.env.example](../backend/.env.example), with `USE_SQLITE=false`.

## Database

- Tables are created on startup via SQLAlchemy `create_all()`, or run [schema.sql](schema.sql) once in Supabase SQL Editor.
- **Session pooler** (`:6543`) or **direct** (`db.*.supabase.co:5432`) both work on Render.

## Frontend (Vercel or Render)

Point the React app at the Render API:

```env
VITE_API_URL=https://<your-service>.onrender.com/api
```

Redeploy the frontend after changing env vars.

## Free tier notes

- Service **spins down** after ~15 minutes idle; first request may take 30–60s.
- PDF/email jobs run **inline** (`CELERY_TASK_ALWAYS_EAGER=true`) — no separate worker needed.
