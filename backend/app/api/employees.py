from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.api import api_bp
from app.services.employee_service import EmployeeService
from app.services.upload_service import UploadService
from app.utils.file_parser import dataframe_to_records, read_tabular_file


@api_bp.route("/employees", methods=["GET"])
@jwt_required()
def list_employees():
    employees = EmployeeService.list_all()
    return jsonify([e.to_dict() for e in employees])


@api_bp.route("/employees/upload/preview", methods=["POST"])
@jwt_required()
def preview_employee_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    try:
        path = UploadService.save_upload(file, prefix="employees")
        df = read_tabular_file(path)
        rows = dataframe_to_records(df)
        result = EmployeeService.validate_upload_rows(rows)
        result["file_path"] = path
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@api_bp.route("/employees/upload/commit", methods=["POST"])
@jwt_required()
def commit_employee_upload():
    data = request.get_json() or {}
    rows = data.get("rows") or []
    if not rows:
        return jsonify({"error": "No rows to commit"}), 400
    validation = EmployeeService.validate_upload_rows(rows)
    if not validation["valid"]:
        return jsonify({"error": "Validation failed", "errors": validation["errors"]}), 400
    admin_email = get_jwt_identity()
    result = EmployeeService.commit_upload(validation["preview"], admin_email)
    return jsonify(result)
