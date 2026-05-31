from datetime import datetime, timezone

from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(100))
    entity_id = db.Column(db.String(100))
    details = db.Column(db.Text)
    admin_email = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "admin_email": self.admin_email,
            "created_at": (
                self.created_at.replace(tzinfo=timezone.utc).isoformat()
                if self.created_at
                else None
            ),
        }
