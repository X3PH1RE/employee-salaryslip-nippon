import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.config import Config
from app.extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        from app.models import (  # noqa: F401
            Admin, AuditLog, EmailDelivery, Employee,
            PayrollBatch, PayrollRecord, PayslipDocument, PayslipJob,
        )
        db.create_all()
        from app.services.auth_service import AuthService
        AuthService.ensure_default_admin(Config.ADMIN_EMAIL, Config.ADMIN_PASSWORD)

        from app.services.upload_service import UploadService
        UploadService.ensure_dirs()

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app
