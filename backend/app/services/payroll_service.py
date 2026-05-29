from decimal import Decimal
from typing import Any

from app.extensions import db
from app.models.payroll import PayrollBatch, PayrollRecord
from app.services.audit_service import AuditService
from app.services.employee_service import EmployeeService
from app.utils.validators import PAYROLL_COLUMNS, calculate_net, find_duplicates, row_errors


class PayrollService:
    @staticmethod
    def validate_upload_rows(rows: list[dict[str, Any]]) -> dict:
        errors: list[dict] = []
        preview: list[dict] = []
        ids = [str(r.get("employee_id", "")).strip() for r in rows]

        for dup in find_duplicates(ids):
            errors.append({"row": None, "message": f"Duplicate employee_id in payroll: {dup}"})

        for idx, row in enumerate(rows, start=2):
            row_errs = row_errors(row, PAYROLL_COLUMNS)
            code = str(row.get("employee_id", "")).strip()
            emp = EmployeeService.get_by_code(code) if code else None
            if code and not emp:
                row_errs.append(f"Employee not found: {code}")

            try:
                base = float(row.get("base_salary", 0))
                hra = float(row.get("hra") or 0)
                allowances = float(row.get("allowances") or 0)
                deductions = float(row.get("deductions") or 0)
                net = calculate_net(base, hra, allowances, deductions)
            except (TypeError, ValueError):
                row_errs.append("Invalid numeric salary fields")
                net = 0
                base = hra = allowances = deductions = 0

            if row_errs:
                errors.append({"row": idx, "message": "; ".join(row_errs)})
            elif emp:
                preview.append({
                    "employee_id": code,
                    "name": emp.name,
                    "email": emp.email,
                    "designation": emp.designation,
                    "base_salary": base,
                    "hra": hra,
                    "allowances": allowances,
                    "deductions": deductions,
                    "net_salary": net,
                    "month": int(row["month"]),
                    "year": int(row["year"]),
                })

        month_year = set((p["month"], p["year"]) for p in preview)
        if len(month_year) > 1:
            errors.append({"row": None, "message": "All rows must share the same month and year"})

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "preview": preview,
            "count": len(preview),
            "period": list(month_year)[0] if len(month_year) == 1 else None,
        }

    @staticmethod
    def commit_upload(rows: list[dict[str, Any]], filename: str, admin_email: str | None = None) -> PayrollBatch:
        first = rows[0]
        month, year = int(first["month"]), int(first["year"])
        batch = PayrollBatch(month=month, year=year, filename=filename, status="ready", record_count=len(rows))
        db.session.add(batch)
        db.session.flush()

        for row in rows:
            code = str(row["employee_id"]).strip()
            emp = EmployeeService.get_by_code(code)
            base = Decimal(str(row["base_salary"]))
            hra = Decimal(str(row.get("hra") or 0))
            allowances = Decimal(str(row.get("allowances") or 0))
            deductions = Decimal(str(row.get("deductions") or 0))
            net = Decimal(str(calculate_net(float(base), float(hra), float(allowances), float(deductions))))

            db.session.add(PayrollRecord(
                batch_id=batch.id,
                employee_id_fk=emp.id,
                employee_code=code,
                base_salary=base,
                hra=hra,
                allowances=allowances,
                deductions=deductions,
                net_salary=net,
                month=month,
                year=year,
            ))

        db.session.commit()
        AuditService.log(
            "payroll_upload",
            entity_type="payroll_batch",
            entity_id=batch.id,
            details=f"{len(rows)} records for {month}/{year}",
            admin_email=admin_email,
        )
        return batch

    @staticmethod
    def get_batch(batch_id: int) -> PayrollBatch | None:
        return PayrollBatch.query.get(batch_id)

    @staticmethod
    def list_batches():
        return PayrollBatch.query.order_by(PayrollBatch.created_at.desc()).all()

    @staticmethod
    def get_preview_for_batch(batch_id: int) -> list[dict]:
        records = (
            PayrollRecord.query.filter_by(batch_id=batch_id)
            .join(PayrollRecord.employee)
            .all()
        )
        return [r.to_dict(include_employee=True) for r in records]
