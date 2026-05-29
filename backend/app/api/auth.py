from flask import jsonify, request
from flask_jwt_extended import create_access_token

from app.api import api_bp
from app.config import Config
from app.services.auth_service import AuthService


@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    admin = AuthService.get_admin_by_email(email)
    if not admin or not AuthService.verify_password(password, admin.password_hash):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=email, additional_claims={"role": "admin"})
    return jsonify({"access_token": token, "email": email})


@api_bp.route("/auth/setup", methods=["POST"])
def setup_admin():
    """One-time bootstrap using env credentials (dev only)."""
    AuthService.ensure_default_admin(Config.ADMIN_EMAIL, Config.ADMIN_PASSWORD)
    return jsonify({"message": "Admin ready", "email": Config.ADMIN_EMAIL})
