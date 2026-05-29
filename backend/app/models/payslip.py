from datetime import datetime

from app.extensions import db


class PayslipJob(db.Model):
    __tablename__ = "payslip_jobs"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey("payroll_batches.id"), nullable=False)
    status = db.Column(db.String(50), default="pending")
    total = db.Column(db.Integer, default=0)
    completed = db.Column(db.Integer, default=0)
    failed = db.Column(db.Integer, default=0)
    celery_task_id = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime)

    documents = db.relationship("PayslipDocument", back_populates="job", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "status": self.status,
            "total": self.total,
            "completed": self.completed,
            "failed": self.failed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }


class PayslipDocument(db.Model):
    __tablename__ = "payslip_documents"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("payslip_jobs.id"), nullable=False)
    payroll_record_id = db.Column(db.Integer, db.ForeignKey("payroll_records.id"), nullable=False)
    file_path = db.Column(db.String(1024), nullable=False)
    status = db.Column(db.String(50), default="generated")
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    job = db.relationship("PayslipJob", back_populates="documents")

    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "payroll_record_id": self.payroll_record_id,
            "file_path": self.file_path,
            "status": self.status,
            "error_message": self.error_message,
        }
