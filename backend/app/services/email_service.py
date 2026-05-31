import smtplib
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import Config
from app.extensions import db
from app.models.email import EmailDelivery
from app.models.payroll import PayrollRecord
from app.models.payslip import PayslipDocument
from app.services.pdf_service import PDFGenerationService, TEMPLATE_DIR
from app.services.storage_service import StorageService
from app.utils.pdf_password import payslip_pdf_password


class EmailService:
    @staticmethod
    def _smtp_send(msg: MIMEMultipart, to_email: str):
        if not Config.SMTP_USER or not Config.SMTP_PASSWORD:
            raise RuntimeError("SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD in .env")

        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
            if Config.SMTP_USE_TLS:
                server.starttls()
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            server.sendmail(Config.SMTP_FROM, [to_email], msg.as_string())

    @staticmethod
    def render_body(
        name: str,
        month: int,
        year: int,
        pdf_password: str | None = None,
    ) -> str:
        month_name = PDFGenerationService.MONTH_NAMES[month]
        env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )
        return env.get_template("email.html").render(
            employee_name=name,
            month_name=month_name,
            year=year,
            company_name=Config.COMPANY_NAME,
            pdf_password=pdf_password,
        )

    @staticmethod
    def send_payslip_email(
        delivery: EmailDelivery,
        document: PayslipDocument,
        employee_name: str,
        employee_email: str,
        month: int,
        year: int,
        admin_email: str | None = None,
        birth_year: int | None = None,
        employee_id: str | None = None,
    ) -> EmailDelivery:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Salary Slip — {PDFGenerationService.MONTH_NAMES[month]} {year}"
        msg["From"] = Config.SMTP_FROM
        msg["To"] = employee_email

        pdf_password = payslip_pdf_password(employee_name, birth_year, employee_id or "")
        html_body = EmailService.render_body(employee_name, month, year, pdf_password)
        msg.attach(MIMEText(html_body, "html"))

        if document.file_path and StorageService.exists(document.file_path):
            pdf_bytes = StorageService.download_bytes(document.file_path)
            filename = StorageService.filename_from_uri(document.file_path)
            part = MIMEApplication(pdf_bytes, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)

        try:
            EmailService._smtp_send(msg, employee_email)
            delivery.status = "sent"
            delivery.sent_at = datetime.utcnow()
            delivery.error_message = None
        except Exception as exc:
            delivery.status = "failed"
            delivery.error_message = str(exc)

        db.session.commit()
        return delivery

    @staticmethod
    def prepare_pending_deliveries(job_id: int) -> None:
        """Create pending delivery rows before send so polling can report progress."""
        docs = PayslipDocument.query.filter_by(job_id=job_id, status="generated").all()
        for doc in docs:
            existing = EmailDelivery.query.filter_by(payslip_document_id=doc.id).first()
            if existing:
                if existing.status in ("sent", "failed"):
                    existing.status = "pending"
                    existing.error_message = None
                    existing.sent_at = None
                continue
            record = PayrollRecord.query.get(doc.payroll_record_id)
            email = record.employee.email if record and record.employee else ""
            db.session.add(
                EmailDelivery(
                    payslip_document_id=doc.id,
                    employee_email=email,
                    status="pending",
                )
            )
        db.session.commit()

    @staticmethod
    def get_delivery_stats(job_id: int) -> dict:
        docs = PayslipDocument.query.filter_by(job_id=job_id, status="generated").all()
        doc_ids = [d.id for d in docs]
        deliveries = (
            EmailDelivery.query.filter(EmailDelivery.payslip_document_id.in_(doc_ids)).all()
            if doc_ids
            else []
        )

        sent = sum(1 for d in deliveries if d.status == "sent")
        failed = sum(1 for d in deliveries if d.status == "failed")
        pending = sum(1 for d in deliveries if d.status == "pending")
        total = max(len(deliveries), len(docs))
        failures = [
            {
                "email": d.employee_email,
                "error": d.error_message,
            }
            for d in deliveries
            if d.status == "failed" and d.error_message
        ]
        if total > len(deliveries):
            pending += total - len(deliveries)
        return {
            "sent": sent,
            "failed": failed,
            "pending": pending,
            "total": total,
            "failures": failures,
        }
