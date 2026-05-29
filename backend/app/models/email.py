from datetime import datetime

from app.extensions import db


class EmailDelivery(db.Model):
    __tablename__ = "email_deliveries"

    id = db.Column(db.Integer, primary_key=True)
    payslip_document_id = db.Column(db.Integer, db.ForeignKey("payslip_documents.id"), nullable=False)
    employee_email = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default="pending")
    error_message = db.Column(db.Text)
    sent_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "payslip_document_id": self.payslip_document_id,
            "employee_email": self.employee_email,
            "status": self.status,
            "error_message": self.error_message,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
