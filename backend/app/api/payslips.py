import io
import zipfile

from flask import jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.api import api_bp
from app.extensions import db
from app.models.payslip import PayslipDocument, PayslipJob
from app.services.email_service import EmailService
from app.services.payroll_service import PayrollService
from app.services.payslip_service import PayslipService
from app.services.storage_service import StorageService
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
    try:
        task = generate_payslips_task.delay(job.id, admin_email)
        job.celery_task_id = task.id
        db.session.commit()
        db.session.refresh(job)
        return jsonify({"job": job.to_dict(), "task_id": task.id}), 202
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@api_bp.route("/payslips/jobs/<int:job_id>", methods=["GET"])
@jwt_required()
def get_job(job_id):
    job = PayslipJob.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    email_stats = EmailService.get_delivery_stats(job_id)
    documents = PayslipService.list_job_documents(job_id)
    return jsonify({
        "job": job.to_dict(),
        "email_stats": email_stats,
        "documents": documents,
    })


@api_bp.route("/payslips/documents/<int:doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):
    doc = PayslipDocument.query.get(doc_id)
    if not doc or doc.status != "generated" or not doc.file_path:
        return jsonify({"error": "Payslip not available"}), 404
    try:
        data = StorageService.download_bytes(doc.file_path)
    except Exception as exc:
        return jsonify({"error": f"Could not read file: {exc}"}), 500
    filename = StorageService.filename_from_uri(doc.file_path)
    return send_file(
        io.BytesIO(data),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@api_bp.route("/payslips/jobs/<int:job_id>/download", methods=["GET"])
@jwt_required()
def download_job_zip(job_id):
    job = PayslipJob.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    docs = PayslipDocument.query.filter_by(job_id=job_id, status="generated").all()
    downloadable = [d for d in docs if d.file_path]
    if not downloadable:
        return jsonify({"error": "No payslips to download"}), 404

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in downloadable:
            try:
                data = StorageService.download_bytes(doc.file_path)
                name = StorageService.filename_from_uri(doc.file_path)
                zf.writestr(name, data)
            except Exception:
                continue
    buf.seek(0)
    if buf.getbuffer().nbytes == 0:
        return jsonify({"error": "Could not build archive"}), 500

    return send_file(
        buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"payslips_job_{job_id}.zip",
    )


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
    try:
        task = dispatch_emails_task.delay(job_id, admin_email)
        return jsonify({"message": "Email dispatch queued", "task_id": task.id}), 202
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@api_bp.route("/payslips/jobs", methods=["GET"])
@jwt_required()
def list_jobs():
    jobs = PayslipJob.query.order_by(PayslipJob.created_at.desc()).limit(20).all()
    return jsonify([j.to_dict() for j in jobs])
