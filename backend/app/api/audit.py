from flask import jsonify
from flask_jwt_extended import jwt_required

from app.api import api_bp
from app.services.audit_service import AuditService


@api_bp.route("/audit", methods=["GET"])
@jwt_required()
def list_audit():
    logs = AuditService.list_recent(100)
    return jsonify([log.to_dict() for log in logs])
