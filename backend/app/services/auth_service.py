import bcrypt

from app.extensions import db
from app.models.admin import Admin


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode(), password_hash.encode())

    @staticmethod
    def get_admin_by_email(email: str) -> Admin | None:
        return Admin.query.filter_by(email=email.lower().strip()).first()

    @staticmethod
    def ensure_default_admin(email: str, password: str):
        admin = AuthService.get_admin_by_email(email)
        if not admin:
            admin = Admin(email=email.lower(), password_hash=AuthService.hash_password(password))
            db.session.add(admin)
            db.session.commit()
        return admin
