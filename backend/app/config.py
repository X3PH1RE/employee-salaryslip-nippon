import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")

    _default_pg = "postgresql://payslip:payslip_secret@localhost:5432/payslip_db"
    if os.getenv("USE_SQLITE", "true").lower() == "true":
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{BASE_DIR / 'dev.db'}"
    else:
        SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", _default_pg)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8  # 8 hours

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "storage" / "uploads"))
    PAYSLIP_FOLDER = os.getenv("PAYSLIP_FOLDER", str(BASE_DIR / "storage" / "payslips"))

    # Default: run PDF/email tasks inside Flask (no Redis, no separate Celery process).
    CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "true").lower() == "true"
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "noreply@company.com")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@company.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

    COMPANY_NAME = os.getenv("COMPANY_NAME", "Nippon Toyota")

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_UPLOAD_BUCKET = os.getenv("SUPABASE_UPLOAD_BUCKET", "uploads")
    SUPABASE_PAYSLIP_BUCKET = os.getenv("SUPABASE_PAYSLIP_BUCKET", "payslips")
