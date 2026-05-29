from datetime import datetime

from app.extensions import db


class PayrollBatch(db.Model):
    __tablename__ = "payroll_batches"

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    filename = db.Column(db.String(512))
    status = db.Column(db.String(50), default="uploaded")
    record_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    records = db.relationship("PayrollRecord", back_populates="batch", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "month": self.month,
            "year": self.year,
            "filename": self.filename,
            "status": self.status,
            "record_count": self.record_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PayrollRecord(db.Model):
    __tablename__ = "payroll_records"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey("payroll_batches.id"), nullable=False)
    employee_id_fk = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    employee_code = db.Column(db.String(50), nullable=False, index=True)
    base_salary = db.Column(db.Numeric(12, 2), nullable=False)
    hra = db.Column(db.Numeric(12, 2), default=0)
    allowances = db.Column(db.Numeric(12, 2), default=0)
    deductions = db.Column(db.Numeric(12, 2), default=0)
    net_salary = db.Column(db.Numeric(12, 2), nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)

    batch = db.relationship("PayrollBatch", back_populates="records")
    employee = db.relationship("Employee", back_populates="payroll_records")

    def to_dict(self, include_employee=False):
        data = {
            "id": self.id,
            "batch_id": self.batch_id,
            "employee_code": self.employee_code,
            "base_salary": float(self.base_salary),
            "hra": float(self.hra),
            "allowances": float(self.allowances),
            "deductions": float(self.deductions),
            "net_salary": float(self.net_salary),
            "month": self.month,
            "year": self.year,
        }
        if include_employee and self.employee:
            data["employee"] = self.employee.to_dict()
        return data
