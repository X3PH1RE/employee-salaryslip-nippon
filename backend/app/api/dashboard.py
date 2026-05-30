from flask import jsonify
from flask_jwt_extended import jwt_required

from app.api import api_bp
from app.models.employee import Employee
from app.models.payroll import PayrollBatch
from app.models.payslip import PayslipJob


@api_bp.route("/dashboard/summary", methods=["GET"])
@jwt_required()
def dashboard_summary():
    """One round-trip for overview stats (avoids 3 separate list calls from the UI)."""
    employee_count = Employee.query.count()
    batch_total = PayrollBatch.query.count()
    batches = (
        PayrollBatch.query.order_by(PayrollBatch.created_at.desc())
        .limit(5)
        .all()
    )
    jobs = (
        PayslipJob.query.order_by(PayslipJob.created_at.desc())
        .limit(5)
        .all()
    )
    return jsonify({
        "employee_count": employee_count,
        "batch_total": batch_total,
        "batches": [b.to_dict() for b in batches],
        "jobs": [j.to_dict() for j in jobs],
    })
