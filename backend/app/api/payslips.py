from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.api import api_bp
from app.extensions import db
from app.models.payslip import PayslipJob
from app.services.email_service import EmailService
from app.services.payroll_service import PayrollService
from app.tasks.payslip_tasks import dispatch_emails_task, generate_payslips_task


@api_bp.route("/payslips/generate", methods=["POST"])
@jwt_required()
def start_generation():
    data = request.get_json() or {}
    batch_id = data.get("batch_id")
    if not batch_id:
        return jsonify({"error": "batch_id required"}), 400

    batch = PayrollService.get_batch(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found"}), 404

    job = PayslipJob(batch_id=batch_id, status="queued")
    db.session.add(job)
    db.session.commit()

    admin_email = get_jwt_identity()
    task = generate_payslips_task.delay(job.id, admin_email)
    job.celery_task_id = task.id
    db.session.commit()

    return jsonify({"job": job.to_dict(), "task_id": task.id}), 202


@api_bp.route("/payslips/jobs/<int:job_id>", methods=["GET"])
@jwt_required()
def get_job(job_id):
    job = PayslipJob.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    email_stats = EmailService.get_delivery_stats(job_id)
    return jsonify({"job": job.to_dict(), "email_stats": email_stats})


@api_bp.route("/payslips/dispatch", methods=["POST"])
@jwt_required()
def start_dispatch():
    data = request.get_json() or {}
    job_id = data.get("job_id")
    if not job_id:
        return jsonify({"error": "job_id required"}), 400

    job = PayslipJob.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job.status not in ("completed", "completed_with_errors"):
        return jsonify({"error": "PDF generation not finished"}), 400

    admin_email = get_jwt_identity()
    task = dispatch_emails_task.delay(job_id, admin_email)
    return jsonify({"message": "Email dispatch queued", "task_id": task.id}), 202


@api_bp.route("/payslips/jobs", methods=["GET"])
@jwt_required()
def list_jobs():
    jobs = PayslipJob.query.order_by(PayslipJob.created_at.desc()).limit(20).all()
    return jsonify([j.to_dict() for j in jobs])
