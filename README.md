# Employee Salary Slip Automation System

Automated pipeline for payroll administrators: upload employee master data and monthly payroll sheets, preview validated rows, generate salary slip PDFs, and email them to employees via SMTP.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), TypeScript, Tailwind CSS, shadcn-style UI, TanStack Table |
| Backend | Flask, Flask-CORS, SQLAlchemy, JWT |
| Database | SQLite (local) or Supabase PostgreSQL |
| Background jobs | Celery (inline by default — no Redis required) |
| PDF | Jinja2 + WeasyPrint (ReportLab fallback on Windows) |
| Email | SMTP (Gmail / SendGrid compatible) |
| Storage | Supabase Storage or local `storage/` folders |

## Architecture

See [docs/architecture.md](docs/architecture.md) and [docs/schema.sql](docs/schema.sql).

## Prerequisites

- Node.js 20+
- Python 3.11+
- (Optional) Supabase project for hosted DB + file storage
- (Optional) WeasyPrint system deps — otherwise ReportLab is used on Windows

**Not required:** Docker, Redis, or a separate Celery worker (for default setup).

## Quick start

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env`:

- **SMTP** — `SMTP_USER` / `SMTP_PASSWORD` for sending payslip emails
- **Supabase** (recommended) — `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`  
  See [docs/supabase-storage.md](docs/supabase-storage.md)

Default `.env` uses **SQLite** (`backend/dev.db`) and **inline Celery** (no Redis).

```powershell
python run.py
```

API: http://localhost:5000

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173 — login `admin@company.com` / `admin123`

### 3. Test files

- [samples/test_ashwin_employees.csv](samples/test_ashwin_employees.csv)
- [samples/test_ashwin_payroll.csv](samples/test_ashwin_payroll.csv)

## Usage workflow

1. **Employees** — upload CSV → preview → import  
2. **Payroll** — upload CSV → preview → save batch  
3. **Generate PDFs** — runs automatically in the API process  
4. **Send payslip emails** — requires SMTP in `.env`  
5. **Activity** — audit log  

## Optional: async worker + Redis

For heavy batches, set in `.env`:

```env
CELERY_TASK_ALWAYS_EAGER=false
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

Install and start [Redis for Windows](https://github.com/redis-windows/redis-windows/releases) (or Memurai), then:

```powershell
celery -A celery_worker.celery worker --loglevel=info --pool=solo
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `USE_SQLITE` | `true` = local `dev.db` (default); `false` = use `DATABASE_URL` |
| `DATABASE_URL` | Supabase/Postgres connection string |
| `CELERY_TASK_ALWAYS_EAGER` | `true` = no Redis/worker (default) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Cloud file storage |
| `SMTP_*` | Mail server credentials |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin |

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/employees/upload/preview` | Validate employee file |
| POST | `/api/employees/upload/commit` | Save employees |
| POST | `/api/payroll/upload/preview` | Validate payroll file |
| POST | `/api/payroll/upload/commit` | Save payroll batch |
| POST | `/api/payslips/generate` | Start PDF job |
| POST | `/api/payslips/dispatch` | Start email job |
| GET | `/api/payslips/jobs/:id` | Job status + document list |
| GET | `/api/payslips/documents/:id/download` | Download one PDF |
| GET | `/api/payslips/jobs/:id/download` | Download all PDFs as ZIP |
| GET | `/api/audit` | Audit log |

## Net salary formula

```
Net Salary = Base Salary + HRA + Allowances − Deductions
```

## License

MIT
