from datetime import datetime

from app.celery_app import celery
from app.extensions import db
from app.models.email import EmailDelivery
from app.models.payroll import PayrollRecord
from app.models.payslip import PayslipDocument, PayslipJob
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.services.pdf_service import PDFGenerationService


def _get_flask_app():
    from app import create_app
    return create_app()


@celery.task(bind=True, name="generate_payslips")
def generate_payslips_task(self, job_id: int, admin_email: str | None = None):
    app = _get_flask_app()
    with app.app_context():
        job = PayslipJob.query.get(job_id)
        if not job:
            return {"error": "Job not found"}

        job.status = "processing"
        job.celery_task_id = self.request.id
        db.session.commit()

        records = PayrollRecord.query.filter_by(batch_id=job.batch_id).all()
        job.total = len(records)
        completed = failed = 0

        for record in records:
            doc = PayslipDocument(
                job_id=job.id,
                payroll_record_id=record.id,
                status="processing",
            )
            db.session.add(doc)
            db.session.flush()

            try:
                path = PDFGenerationService.generate_pdf(record, job.id)
                doc.file_path = path
                doc.status = "generated"
                completed += 1
            except Exception as exc:
                doc.status = "failed"
                doc.error_message = str(exc)
                failed += 1

            job.completed = completed
            job.failed = failed
            db.session.commit()

        job.status = "completed" if failed == 0 else "completed_with_errors"
        job.finished_at = datetime.utcnow()
        db.session.commit()

        AuditService.log(
            "pdf_generation",
            entity_type="payslip_job",
            entity_id=job.id,
            details=f"Generated {completed}, failed {failed}",
            admin_email=admin_email,
        )
        return {"job_id": job_id, "completed": completed, "failed": failed}


@celery.task(bind=True, name="dispatch_emails")
def dispatch_emails_task(self, job_id: int, admin_email: str | None = None):
    app = _get_flask_app()
    with app.app_context():
        job = PayslipJob.query.get(job_id)
        if not job:
            return {"error": "Job not found"}

        docs = PayslipDocument.query.filter_by(
            job_id=job_id, status="generated"
        ).all()

        sent = failed = 0
        for doc in docs:
            record = PayrollRecord.query.get(doc.payroll_record_id)
            if not record or not record.employee:
                continue

            emp = record.employee
            delivery = EmailDelivery.query.filter_by(
                payslip_document_id=doc.id
            ).first()
            if not delivery:
                delivery = EmailDelivery(
                    payslip_document_id=doc.id,
                    employee_email=emp.email,
                    status="pending",
                )
                db.session.add(delivery)
                db.session.flush()

            delivery = EmailService.send_payslip_email(
                delivery, doc, emp.name, emp.email, record.month, record.year, admin_email
            )
            if delivery.status == "sent":
                sent += 1
            else:
                failed += 1

        AuditService.log(
            "email_dispatch",
            entity_type="payslip_job",
            entity_id=job_id,
            details=f"Sent {sent}, failed {failed}",
            admin_email=admin_email,
        )
        return {"job_id": job_id, "sent": sent, "failed": failed}
