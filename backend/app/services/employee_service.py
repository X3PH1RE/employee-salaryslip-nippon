from typing import Any

from app.extensions import db
from app.models.employee import Employee
from app.services.audit_service import AuditService
from app.utils.validators import (
    EMPLOYEE_COLUMNS,
    find_duplicates,
    row_errors,
    validate_email,
)


class EmployeeService:
    @staticmethod
    def list_all():
        return Employee.query.order_by(Employee.employee_id).all()

    @staticmethod
    def get_by_code(employee_id: str) -> Employee | None:
        return Employee.query.filter_by(employee_id=str(employee_id).strip()).first()

    @staticmethod
    def validate_upload_rows(rows: list[dict[str, Any]]) -> dict:
        errors: list[dict] = []
        preview: list[dict] = []
        ids = [str(r.get("employee_id", "")).strip() for r in rows]

        for dup in find_duplicates(ids):
            errors.append({"row": None, "message": f"Duplicate employee_id: {dup}"})

        for idx, row in enumerate(rows, start=2):
            row_errs = row_errors(row, EMPLOYEE_COLUMNS)
            email = row.get("email")
            if email and not validate_email(str(email)):
                row_errs.append("Invalid email format")
            if row_errs:
                errors.append({"row": idx, "message": "; ".join(row_errs)})
            else:
                preview.append({
                    "employee_id": str(row["employee_id"]).strip(),
                    "name": str(row["name"]).strip(),
                    "email": str(row["email"]).strip(),
                    "designation": str(row.get("designation") or "").strip(),
                    "birth_year": row.get("birth_year"),
                    "department": str(row.get("department") or "").strip() or None,
                })

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "preview": preview,
            "count": len(preview),
        }

    @staticmethod
    def commit_upload(rows: list[dict[str, Any]], admin_email: str | None = None) -> dict:
        created, updated = 0, 0
        for row in rows:
            code = str(row["employee_id"]).strip()
            emp = EmployeeService.get_by_code(code)
            if emp:
                emp.name = str(row["name"]).strip()
                emp.email = str(row["email"]).strip()
                emp.designation = str(row.get("designation") or "").strip()
                if row.get("birth_year"):
                    emp.birth_year = int(row["birth_year"])
                if row.get("department"):
                    emp.department = str(row["department"]).strip()
                updated += 1
            else:
                db.session.add(Employee(
                    employee_id=code,
                    name=str(row["name"]).strip(),
                    email=str(row["email"]).strip(),
                    designation=str(row.get("designation") or "").strip(),
                    birth_year=int(row["birth_year"]) if row.get("birth_year") else None,
                    department=str(row.get("department")).strip() if row.get("department") else None,
                ))
                created += 1
        db.session.commit()
        AuditService.log(
            "employee_upload",
            entity_type="employee",
            details=f"Created {created}, updated {updated}",
            admin_email=admin_email,
        )
        return {"created": created, "updated": updated}
