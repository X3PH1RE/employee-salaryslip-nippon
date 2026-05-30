# Employee Salary Slip Automation System

**employee-salaryslip-nippon** — an admin portal to upload payroll data, generate salary slip PDFs, download them, and email payslips to employees. Built for HR/payroll teams that want a simple local or Supabase-backed workflow without Docker.

## Features

- **Admin dashboard** — JWT login, overview, employee master data, payroll uploads, activity audit
- **CSV / Excel uploads** — employee roster and monthly payroll with validation before commit
- **Employee ID mapping** — payroll rows joined to master data; flags missing IDs, duplicates, invalid emails
- **Preview tables** — TanStack Table preview with net salary: `Base + HRA + Allowances − Deductions`
- **PDF generation** — Jinja2 templates; WeasyPrint or ReportLab fallback on Windows
- **Downloads** — single PDF per employee or ZIP for the whole job
- **Email dispatch** — SMTP (Gmail app password supported); per-recipient failure messages in the UI
- **Supabase** — optional PostgreSQL + Storage buckets for uploads and payslips
- **Audit log** — uploads, PDF jobs, and email runs

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), TypeScript, Tailwind CSS, shadcn-style UI, TanStack Table |
| Backend | Flask, Flask-CORS, SQLAlchemy, JWT, Celery |
| Database | SQLite (local default) or Supabase PostgreSQL |
| Background jobs | Celery inline by default (`CELERY_TASK_ALWAYS_EAGER=true`) — no Redis required |
| PDF | Jinja2 + WeasyPrint / ReportLab |
| Email | SMTP |
| File storage | Supabase Storage (`uploads`, `payslips`) or local `backend/storage/` |

## Documentation

| Doc | Description |
|-----|-------------|
| [backend/.env.example](backend/.env.example) | **Environment template — copy to `backend/.env` and fill in values** |
| [docs/architecture.md](docs/architecture.md) | System diagram and request flows |
| [docs/schema.sql](docs/schema.sql) | PostgreSQL DDL |
| [docs/supabase-storage.md](docs/supabase-storage.md) | Supabase buckets and service role key |
| [docs/deploy-render.md](docs/deploy-render.md) | Deploy Flask API on Render |
| [docs/screenshots/README.md](docs/screenshots/README.md) | Suggested screenshots for submissions |

## Prerequisites

- Node.js 20+
- Python 3.11+
- (Recommended) [Supabase](https://supabase.com) project for production DB + file storage
- (Optional) Gmail account with **App Password** for sending email

**Not required:** Docker, Redis, or a separate Celery worker (default configuration).

## Configuration

All settings are driven by environment variables. **Do not commit secrets.**

1. Copy the example file:

   ```powershell
   cd backend
   copy .env.example .env
   ```

2. Open **`backend/.env`** and set values using [backend/.env.example](backend/.env.example) as the reference. Each variable is documented there.

   | Area | Key variables | Notes |
   |------|----------------|-------|
   | App / auth | `SECRET_KEY`, `JWT_SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Default admin is created on first run |
   | Database | `USE_SQLITE`, `DATABASE_URL` | `USE_SQLITE=true` uses `backend/dev.db`; set `false` + Supabase URI for hosted Postgres |
   | Branding | `COMPANY_NAME` | PDFs and emails (default: `Nippon Toyota`); regenerate PDFs after changes |
   | Background jobs | `CELERY_TASK_ALWAYS_EAGER` | `true` (default) runs PDF/email in Flask — no worker process |
   | Supabase files | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_*_BUCKET` | Service role key from **Project Settings → API** |
   | SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Gmail: use a 16-char [App Password](https://myaccount.google.com/apppasswords), not your login password |
   | Local files | `UPLOAD_FOLDER`, `PAYSLIP_FOLDER` | Used when Supabase storage keys are empty |

3. Install Python dependencies:

   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   # Optional local extras (WeasyPrint PDF styling, pandas):
   pip install -r requirements-dev.txt
   ```

## Deploy backend on Render

Hosted API uses [Render](https://render.com) (Gunicorn web service). Full guide: [docs/deploy-render.md](docs/deploy-render.md).

**Quick path (Blueprint):**

1. Render → **New** → **Blueprint** → connect this GitHub repo (`render.yaml` at repo root).
2. Set secrets in the service **Environment** tab: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, SMTP vars, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Deploy → test `https://<your-service>.onrender.com/api/health`.
4. Optional: `POST https://<your-service>.onrender.com/api/auth/setup` to ensure admin exists.

**Frontend:** keep on Vercel (or any static host). Set `VITE_API_URL=https://<your-service>.onrender.com/api` and redeploy (see [frontend/.env.example](frontend/.env.example)).


## Quick start

### Backend

```powershell
cd backend
.venv\Scripts\activate
python run.py
```

API: http://localhost:5000 — health check: http://localhost:5000/api/health

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

**Default login** (from `.env`): `admin@company.com` / `admin123` — change via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in [backend/.env.example](backend/.env.example).

## Usage workflow

1. **Employees** — Upload `samples/employees.csv` or [samples/test_ashwin_employees.csv](samples/test_ashwin_employees.csv) → preview → import.
2. **Payroll** — Upload [samples/payroll_may_2026.csv](samples/payroll_may_2026.csv) or [samples/test_ashwin_payroll.csv](samples/test_ashwin_payroll.csv) → preview (validates employee IDs) → save batch.
3. **Generate PDFs** — On a batch, click **Generate PDFs**. Job status updates when complete (`completed` / `completed_with_errors`).
4. **Download** — **Download all (ZIP)** or per-employee **PDF** buttons on the job panel.
5. **Send emails** — **Send payslip emails** (requires valid `SMTP_*` in `.env`). If a send fails, the UI shows the SMTP error (e.g. Gmail `BadCredentials`).
6. **Activity** — Review audit entries for uploads, PDF generation, and email dispatch.

## Gmail SMTP (common setup)

1. Enable **2-Step Verification** on your Google account.
2. Create an **App password** (name is optional — e.g. `employee-salaryslip-nippon`).
3. In `backend/.env`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASSWORD=your16charapppassword
   SMTP_FROM=you@gmail.com
   SMTP_USE_TLS=true
   ```

4. Restart Flask and retry **Send payslip emails**.

Test login only:

```powershell
cd backend
.venv\Scripts\python -c "import os; from dotenv import load_dotenv; load_dotenv('.env'); import smtplib; s=smtplib.SMTP(os.getenv('SMTP_HOST'), int(os.getenv('SMTP_PORT',587))); s.starttls(); s.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASSWORD')); print('SMTP OK'); s.quit()"
```

## Optional: Redis + Celery worker

For large batches, set in `backend/.env` (see [backend/.env.example](backend/.env.example)):

```env
CELERY_TASK_ALWAYS_EAGER=false
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

Install Redis locally, then:

```powershell
cd backend
.venv\Scripts\activate
celery -A celery_worker.celery worker --loglevel=info --pool=solo
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/auth/setup` | Bootstrap admin from env |
| GET | `/api/employees` | List employees |
| POST | `/api/employees/upload/preview` | Validate employee file |
| POST | `/api/employees/upload/commit` | Save employees |
| GET | `/api/payroll/batches` | List payroll batches |
| POST | `/api/payroll/upload/preview` | Validate payroll file |
| POST | `/api/payroll/upload/commit` | Save payroll batch |
| POST | `/api/payslips/generate` | Start PDF job |
| GET | `/api/payslips/jobs/:id` | Job status, documents, email stats |
| GET | `/api/payslips/documents/:id/download` | Download one PDF |
| GET | `/api/payslips/jobs/:id/download` | Download all PDFs as ZIP |
| POST | `/api/payslips/dispatch` | Send payslip emails |
| GET | `/api/audit` | Audit log |

Protected routes require header: `Authorization: Bearer <token>`.

## Project structure

```
employee-salaryslip-nippon/
├── backend/
│   ├── .env.example          # ← copy to .env
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   ├── tasks/
│   │   └── templates/
│   ├── storage/              # local fallback (uploads, payslips)
│   ├── requirements.txt
│   ├── Procfile                # Gunicorn start (Render)
│   └── run.py
├── render.yaml                 # Render Blueprint
├── frontend/                 # React admin UI (Slip Desk)
├── samples/                  # CSV templates
└── docs/
```

## Net salary formula

```
Net Salary = Base Salary + HRA + Allowances − Deductions
```

Validated on payroll upload and shown on each payslip PDF.

## License

MIT
