# Deploy backend on Vercel

Uses slim `requirements-vercel.txt` (no pandas/WeasyPrint/Celery) to stay under Vercel’s **245 MB** bundle limit.

## 1. Vercel project settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Framework Preset** | Other |
| **Build Command** | *(leave empty)* |
| **Install Command** | `pip install --upgrade pip && pip install --prefer-binary -r requirements-vercel.txt` |
| **Output Directory** | *(leave empty)* |

`backend/vercel.json` and `backend/pyproject.toml` also set the install command if dashboard overrides are off.

Entry point: **`run:app`** (from `pyproject.toml` `[tool.vercel]`).

## 2. Environment variables

Set in Vercel → **Settings → Environment Variables**:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase **Session pooler**, port **6543** — not `db.*:5432` |
| `USE_SQLITE` | `false` |
| `SECRET_KEY`, `JWT_SECRET_KEY` | Random secrets |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Service role key (`sb_secret_…` needs `storage3>=2.28`) |
| `CELERY_TASK_ALWAYS_EAGER` | `true` |
| `SMTP_*`, `ADMIN_*`, `COMPANY_NAME` | See [backend/.env.example](../backend/.env.example) |

## 3. Database schema

Run [schema.sql](schema.sql) once in Supabase **SQL Editor** (Vercel skips auto `create_all` on cold start).

## 4. Verify

- `GET https://your-api.vercel.app/api/health` → `{"status":"ok","storage":{"ok":true,...}}`
- `POST https://your-api.vercel.app/api/auth/setup` (note **`/api`** prefix)

## 5. Frontend

Separate Vercel project, Root Directory `frontend`:

```env
VITE_API_URL=https://your-api.vercel.app/api
```

Redeploy frontend after setting env vars.

## Common errors

| Error | Fix |
|-------|-----|
| Bundle > 245 MB | Ensure install uses `requirements-vercel.txt`, not full `requirements.txt` |
| `Cannot assign requested address` on `:5432` | Switch `DATABASE_URL` to Session pooler `:6543` |
| `Invalid API key` (storage) | Use service_role secret; redeploy after fixing env |
| `FUNCTION_INVOCATION_FAILED` | Check Deployments → Logs |
