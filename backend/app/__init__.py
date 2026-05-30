import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from flask import Flask, jsonify, request
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt

_db_initialized = False


def _is_serverless() -> bool:
    return bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))


def _init_database(app: Flask):
    from app.models import (  # noqa: F401
        Admin, AuditLog, EmailDelivery, Employee,
        PayrollBatch, PayrollRecord, PayslipDocument, PayslipJob,
    )
    # Vercel: run docs/schema.sql in Supabase once — skip DDL on cold start
    if not _is_serverless():
        db.create_all()
    from app.services.auth_service import AuthService
    AuthService.ensure_default_admin(Config.ADMIN_EMAIL, Config.ADMIN_PASSWORD)


def _init_storage(app: Flask):
    from app.services.storage_service import StorageService
    from app.services.upload_service import UploadService
    UploadService.ensure_dirs()


def _ensure_db(app: Flask):
    global _db_initialized
    if _db_initialized:
        return None
    with app.app_context():
        try:
            _init_database(app)
        except Exception as exc:
            app.logger.error("Database init failed: %s", exc)
            return jsonify({
                "error": "Database unavailable. Use Supabase Session pooler (port 6543) in DATABASE_URL.",
                "detail": str(exc),
            }), 503
    _db_initialized = True
    return None


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    if not _is_serverless():
        with app.app_context():
            try:
                _init_database(app)
                global _db_initialized
                _db_initialized = True
            except Exception as exc:
                app.logger.error("Database init failed: %s", exc)
            try:
                _init_storage(app)
            except Exception as exc:
                app.logger.warning("Storage init skipped: %s", exc)
    else:
        try:
            with app.app_context():
                _init_storage(app)
        except Exception as exc:
            app.logger.warning("Storage init skipped: %s", exc)

        @app.before_request
        def _lazy_db_init():
            if request.path in ("/", "/api/health") or not request.path.startswith("/api/"):
                return None
            return _ensure_db(app)

    @app.route("/")
    def index():
        return {"service": "payslip-api", "health": "/api/health"}

    @app.route("/api/health")
    def health():
        import importlib.metadata

        storage = {"enabled": bool(Config.SUPABASE_URL and Config.SUPABASE_SERVICE_KEY)}
        if storage["enabled"]:
            key = Config.SUPABASE_SERVICE_KEY
            storage["key_format"] = (
                "sb_secret" if key.startswith("sb_secret_")
                else "jwt" if key.startswith("eyJ")
                else "other"
            )
            storage["url_host"] = Config.SUPABASE_URL.replace("https://", "").split("/")[0]
            try:
                storage["storage3_py"] = importlib.metadata.version("storage3")
            except Exception:
                storage["storage3_py"] = "unknown"
            from app.services.storage_service import StorageService
            err = StorageService.verify_credentials()
            storage["ok"] = err is None
            if err:
                storage["error"] = err
        return {"status": "ok", "storage": storage}

    return app
