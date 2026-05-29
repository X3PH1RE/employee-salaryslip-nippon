import os
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import Config
from app.models.payroll import PayrollRecord
from app.services.upload_service import UploadService

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"


class PDFGenerationService:
    MONTH_NAMES = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    @staticmethod
    def _env():
        return Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    @staticmethod
    def build_context(record: PayrollRecord) -> dict:
        emp = record.employee
        return {
            "company_name": "Acme Corporation",
            "employee_id": emp.employee_id,
            "name": emp.name,
            "email": emp.email,
            "designation": emp.designation or "—",
            "department": emp.department or "—",
            "month_name": PDFGenerationService.MONTH_NAMES[record.month],
            "year": record.year,
            "base_salary": f"{float(record.base_salary):,.2f}",
            "hra": f"{float(record.hra):,.2f}",
            "allowances": f"{float(record.allowances):,.2f}",
            "deductions": f"{float(record.deductions):,.2f}",
            "net_salary": f"{float(record.net_salary):,.2f}",
            "generated_at": datetime.utcnow().strftime("%d %b %Y"),
        }

    @staticmethod
    def generate_pdf(record: PayrollRecord, job_id: int) -> str:
        UploadService.ensure_dirs()
        ctx = PDFGenerationService.build_context(record)
        html = PDFGenerationService._env().get_template("payslip.html").render(**ctx)

        out_dir = Path(Config.PAYSLIP_FOLDER) / f"job_{job_id}"
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = f"payslip_{record.employee_code}_{record.month}_{record.year}.pdf"
        out_path = out_dir / filename

        try:
            from weasyprint import HTML
            HTML(string=html).write_pdf(str(out_path))
        except Exception:
            # Fallback when WeasyPrint unavailable (e.g. missing GTK on Windows dev)
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

            doc = SimpleDocTemplate(str(out_path), pagesize=A4)
            styles = getSampleStyleSheet()
            story = [
                Paragraph(f"<b>Salary Slip — {ctx['month_name']} {ctx['year']}</b>", styles["Title"]),
                Spacer(1, 12),
                Paragraph(f"Employee: {ctx['name']} ({ctx['employee_id']})", styles["Normal"]),
                Paragraph(f"Designation: {ctx['designation']}", styles["Normal"]),
                Spacer(1, 12),
            ]
            data = [
                ["Component", "Amount (INR)"],
                ["Base Salary", ctx["base_salary"]],
                ["HRA", ctx["hra"]],
                ["Allowances", ctx["allowances"]],
                ["Deductions", ctx["deductions"]],
                ["Net Salary", ctx["net_salary"]],
            ]
            t = Table(data, colWidths=[200, 150])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e2d")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]))
            story.append(t)
            doc.build(story)

        return str(out_path)
