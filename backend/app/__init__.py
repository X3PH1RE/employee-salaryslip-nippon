import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.config import Config
from app.extensions import db, jwt


def _init_database(app: Flask):
    from app.models import (  # noqa: F401
        Admin, AuditLog, EmailDelivery, Employee,
        PayrollBatch, PayrollRecord, PayslipDocument, PayslipJob,
    )
    db.create_all()
    from app.services.auth_service import AuthService
    AuthService.ensure_default_admin(Config.ADMIN_EMAIL, Config.ADMIN_PASSWORD)


def _init_storage(app: Flask):
    from app.services.storage_service import StorageService
    from app.services.upload_service import UploadService
    UploadService.ensure_dirs()
    StorageService.ensure_buckets()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        try:
            _init_database(app)
        except Exception as exc:
            app.logger.error("Database init failed: %s", exc)
            if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
                raise
        try:
            _init_storage(app)
        except Exception as exc:
            app.logger.warning("Storage init skipped: %s", exc)

    @app.route("/")
    def index():
        return {"service": "payslip-api", "health": "/api/health"}

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app
