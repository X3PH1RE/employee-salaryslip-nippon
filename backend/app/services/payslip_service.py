from app.models.payroll import PayrollRecord
from app.models.payslip import PayslipDocument
from app.services.storage_service import StorageService


class PayslipService:
    @staticmethod
    def document_to_dict(doc: PayslipDocument) -> dict:
        record = PayrollRecord.query.get(doc.payroll_record_id)
        emp = record.employee if record else None
        filename = (
            StorageService.filename_from_uri(doc.file_path) if doc.file_path else None
        )
        return {
            "id": doc.id,
            "job_id": doc.job_id,
            "status": doc.status,
            "error_message": doc.error_message,
            "employee_id": emp.employee_id if emp else None,
            "employee_name": emp.name if emp else None,
            "filename": filename,
            "downloadable": doc.status == "generated" and bool(doc.file_path),
        }

    @staticmethod
    def list_job_documents(job_id: int) -> list[dict]:
        docs = (
            PayslipDocument.query.filter_by(job_id=job_id)
            .order_by(PayslipDocument.id)
            .all()
        )
        return [PayslipService.document_to_dict(d) for d in docs]
