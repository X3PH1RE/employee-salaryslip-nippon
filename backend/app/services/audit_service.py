from app.extensions import db
from app.models.audit import AuditLog


class AuditService:
    @staticmethod
    def log(action: str, entity_type: str | None = None, entity_id: str | None = None,
            details: str | None = None, admin_email: str | None = None):
        entry = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details,
            admin_email=admin_email,
        )
        db.session.add(entry)
        db.session.commit()
        return entry

    @staticmethod
    def list_recent(limit: int = 50):
        return (
            AuditLog.query.order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )
