# Employee Salary Slip Automation System

Automated pipeline for payroll administrators: upload employee master data and monthly payroll sheets, preview validated rows, generate salary slip PDFs asynchronously, and email them to employees via SMTP.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), TypeScript, Tailwind CSS, shadcn-style UI, TanStack Table |
| Backend | Flask, Flask-CORS, SQLAlchemy, JWT |
| Database | PostgreSQL |
| Queue | Redis + Celery |
| PDF | Jinja2 + WeasyPrint (ReportLab fallback on Windows) |
| Email | SMTP (Gmail / SendGrid compatible) |

## Architecture

See [docs/architecture.md](docs/architecture.md) for the Mermaid diagram and request flows.

Database DDL: [docs/schema.sql](docs/schema.sql)

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop (for PostgreSQL + Redis)
- (Optional) WeasyPrint system deps — [WeasyPrint install docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html). If unavailable, PDFs use ReportLab automatically.

## Quick start

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
# Edit .env — set SMTP_USER / SMTP_PASSWORD for email dispatch

python run.py
```

In a **second terminal** (Celery worker):

```bash
cd backend
.venv\Scripts\activate
celery -A celery_worker.celery worker --loglevel=info --pool=solo
```

> Use `--pool=solo` on Windows.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

**Default admin:** `admin@company.com` / `admin123` (from `.env`)

## Usage workflow

1. **Employees** — Upload `samples/employees.csv` (or Excel). Preview → Import.
2. **Payroll** — Upload `samples/payroll_may_2026.csv`. Preview validates employee IDs and net salary. Confirm batch.
3. **Generate PDFs** — Click *Generate PDFs* on a batch. Celery writes files to `backend/storage/payslips/`.
4. **Send emails** — After job completes, click *Send payslip emails* (requires SMTP in `.env`).
5. **Activity** — View audit log for uploads, PDF generation, and email dispatch.

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/employees/upload/preview` | Parse & validate employee file |
| POST | `/api/employees/upload/commit` | Save employees |
| POST | `/api/payroll/upload/preview` | Parse & validate payroll file |
| POST | `/api/payroll/upload/commit` | Save payroll batch |
| POST | `/api/payslips/generate` | Queue PDF job (202) |
| POST | `/api/payslips/dispatch` | Queue email job (202) |
| GET | `/api/payslips/jobs/:id` | Job + email delivery stats |
| GET | `/api/audit` | Audit log |

All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>`.

## Sample files

- [samples/employees.csv](samples/employees.csv)
- [samples/payroll_may_2026.csv](samples/payroll_may_2026.csv)

## Screenshots

After running the app, capture:

1. Login screen
2. Employee upload preview table
3. Payroll preview with net salary column
4. Job status + email dispatch panel
5. Activity audit page

Save under `docs/screenshots/` for your submission.

## Project structure

```
toyota-sw/
├── backend/
│   ├── app/
│   │   ├── api/           # REST routes
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic
│   │   ├── tasks/         # Celery tasks
│   │   └── templates/     # Jinja2 HTML (PDF + email)
│   ├── storage/
│   │   ├── uploads/
│   │   └── payslips/
│   └── run.py
├── frontend/              # React admin dashboard
├── samples/
├── docs/
│   ├── architecture.md
│   └── schema.sql
└── docker-compose.yml
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CELERY_BROKER_URL` | Redis URL |
| `SMTP_*` | Mail server credentials |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin account |

## Net salary formula

```
Net Salary = Base Salary + HRA + Allowances − Deductions
```

Validated on upload and reflected in PDFs.

## License

MIT — for demonstration and internal HR automation projects.
