from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.api import api_bp
from app.services.payroll_service import PayrollService
from app.services.upload_service import UploadService
from app.utils.file_parser import read_tabular_file


@api_bp.route("/payroll/batches", methods=["GET"])
@jwt_required()
def list_batches():
    batches = PayrollService.list_batches()
    return jsonify([b.to_dict() for b in batches])


@api_bp.route("/payroll/batches/<int:batch_id>", methods=["GET"])
@jwt_required()
def get_batch(batch_id):
    batch = PayrollService.get_batch(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found"}), 404
    preview = PayrollService.get_preview_for_batch(batch_id)
    return jsonify({"batch": batch.to_dict(), "records": preview})


@api_bp.route("/payroll/upload/preview", methods=["POST"])
@jwt_required()
def preview_payroll_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    try:
        path = UploadService.save_upload(file, prefix="payroll")
        rows = read_tabular_file(path)
        result = PayrollService.validate_upload_rows(rows)
        result["file_path"] = path
        result["filename"] = file.filename
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@api_bp.route("/payroll/upload/commit", methods=["POST"])
@jwt_required()
def commit_payroll_upload():
    data = request.get_json() or {}
    rows = data.get("rows") or []
    filename = data.get("filename") or "upload.csv"
    if not rows:
        return jsonify({"error": "No rows to commit"}), 400

    normalized = [{
        "employee_id": r["employee_id"],
        "base_salary": r["base_salary"],
        "hra": r.get("hra", 0),
        "allowances": r.get("allowances", 0),
        "deductions": r.get("deductions", 0),
        "month": r["month"],
        "year": r["year"],
    } for r in rows]

    validation = PayrollService.validate_upload_rows(normalized)
    if not validation["valid"]:
        return jsonify({"error": "Validation failed", "errors": validation["errors"]}), 400

    admin_email = get_jwt_identity()
    batch = PayrollService.commit_upload(normalized, filename, admin_email)
    return jsonify({"batch": batch.to_dict()})
