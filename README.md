# Employee Salary Slip Automation System

Admin portal (**Slip Desk**) to upload employee and payroll data, generate payslip PDFs, download them, and email them to employees.

## Features

- JWT admin login with session expiry handling
- Employee roster and monthly payroll upload (CSV / Excel) with validation preview and sample CSV downloads
- Password-protected PDF generation (`first 4 letters of name` + `birth year`) with per-employee download or ZIP export
- SMTP email dispatch with sent / failed / pending status in the UI
- Optional Supabase PostgreSQL + Storage, or local SQLite and filesystem
- Audit log of uploads, PDF jobs, and email runs

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TypeScript, Tailwind, TanStack Query & Table |
| Backend | Flask, SQLAlchemy, JWT |
| Database | SQLite (local default) or Supabase Postgres |
| PDF / email | ReportLab or WeasyPrint, `pypdf` (PDF encryption), SMTP (runs inline — no Redis required by default) |

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- *(Optional)* [Supabase](https://supabase.com) project for hosted DB + file storage
- *(Optional)* Gmail [App Password](https://myaccount.google.com/apppasswords) for sending email

## Local setup

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt   # WeasyPrint, pandas — optional but recommended locally
copy .env.example .env
```

Edit **`backend/.env`**. For the quickest start, defaults work out of the box:

- `USE_SQLITE=true` — uses `backend/dev.db` (no Postgres install)
- `CELERY_TASK_ALWAYS_EAGER=true` — PDFs and emails run inside Flask (no Redis)
- Leave Supabase vars empty — files go to `backend/storage/`

See [backend/.env.example](backend/.env.example) for all variables (SMTP, Supabase, admin credentials).

Start the API:

```powershell
python run.py
```

- API: http://localhost:5000  
- Health: http://localhost:5000/api/health  

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- API calls proxy to `http://localhost:5000` — no frontend `.env` needed for local dev

### 3. Sign in

Default credentials (from `.env`):

| | |
|---|---|
| Email | `admin@company.com` |
| Password | `admin123` |

Change via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.

## Usage

1. **Employees** — Upload a roster CSV (use **Download sample CSV** on the page) → preview → import. Include `birth_year` so payslip PDFs can be password-protected.
2. **Payroll** — Upload monthly salary data (sample CSV available on the page) → preview → save batch.  
   Payroll rows must match existing employee IDs.
3. **Generate PDFs** — Click **Generate PDFs** on a batch. A spinner shows in the job card while PDFs are being created; the job status updates when complete. Each PDF is password-protected (`first 4 letters of name` + `birth year`, e.g. Johny 1996 → `john1996`). Regenerate PDFs after changing employee data or deploying password changes.
4. **Download** — **Download all (ZIP)** or individual **PDF** buttons when the job completes.
5. **Send emails** — **Send payslip emails** (requires SMTP in `.env`). The email body includes the PDF password.
6. **Activity** — View the audit trail.

Sample files are also in [`samples/`](samples/) at the repo root.

**Net salary:** `Base + HRA + Allowances − Deductions` (validated on upload).

## Optional configuration

### Supabase (Postgres + Storage)

1. Run [docs/schema.sql](docs/schema.sql) in the Supabase SQL Editor.
2. In `backend/.env`:

   ```env
   USE_SQLITE=false
   DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:6543/postgres?sslmode=require
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

   Use the **Session pooler** URI (port **6543**), not direct `db.*:5432`.  
   See [docs/supabase-storage.md](docs/supabase-storage.md) for bucket setup.

### Gmail SMTP

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=you@gmail.com
SMTP_USE_TLS=true
```

Requires 2-Step Verification and an App Password on your Google account.

### Background jobs (local default)

With `CELERY_TASK_ALWAYS_EAGER=true`, PDF generation and email dispatch run **synchronously inside the Flask request**.

## Deploy (Vercel)

Two separate Vercel projects:

| Project | Root directory | Notes |
|---------|----------------|-------|
| Backend | `backend` | Flask entry: `main.py`. Install: `requirements-vercel.txt`. Set env vars from `.env.example`. Run `docs/schema.sql` in Supabase first. |
| Frontend | `frontend` | Set `VITE_API_URL` to your backend URL. `vercel.json` handles SPA routing. |

Test backend: `GET /api/health` → `{"status":"ok"}`.

## Project structure

```
├── backend/          Flask API, models, PDF/email services
├── frontend/         React admin UI (Slip Desk)
├── samples/          Example CSV files
└── docs/             Schema, architecture, Supabase notes
```

