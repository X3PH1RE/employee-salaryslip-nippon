from datetime import datetime

from app.extensions import db


class Employee(db.Model):
    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    designation = db.Column(db.String(255))
    birth_year = db.Column(db.Integer)
    department = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payroll_records = db.relationship("PayrollRecord", back_populates="employee")

    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "name": self.name,
            "email": self.email,
            "designation": self.designation,
            "birth_year": self.birth_year,
            "department": self.department,
        }
