# Supabase Storage Setup

When `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `backend/.env`, the app stores:

| Bucket | Contents |
|--------|----------|
| `uploads` | Employee & payroll CSV/Excel uploads |
| `payslips` | Generated salary slip PDFs (`job_{id}/...`) |

Paths are saved in the database as `supabase://bucket/path/to/file.pdf`.

## 1. Get credentials

In Supabase Dashboard → **Project Settings → API**:

- **Project URL** → `SUPABASE_URL`
- **service_role** key (secret) → `SUPABASE_SERVICE_KEY` — **not** the `anon` / public key

If PDF generation fails with **Invalid API key**, fix `SUPABASE_SERVICE_KEY` in `.env` (local) or Vercel env vars, restart/redeploy, then click **Generate PDFs** again.

## 2. Buckets

On first API start, the app tries to create `uploads` and `payslips` buckets automatically.

You can also create them manually: **Storage → New bucket** (private).

## 3. `.env` example

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
SUPABASE_UPLOAD_BUCKET=uploads
SUPABASE_PAYSLIP_BUCKET=payslips
```

Restart Flask after changing `.env`. A separate Celery worker is only needed when `CELERY_TASK_ALWAYS_EAGER=false`.

## 4. Verify

After uploading payroll and generating PDFs, open **Storage → payslips** in Supabase — you should see folders like `job_1/payslip_EMP006_5_2026.pdf`.
