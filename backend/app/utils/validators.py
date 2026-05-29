import re
from typing import Any

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

EMPLOYEE_COLUMNS = {"employee_id", "name", "email", "designation"}
EMPLOYEE_OPTIONAL = {"birth_year", "department"}

PAYROLL_COLUMNS = {
    "employee_id",
    "base_salary",
    "hra",
    "allowances",
    "deductions",
    "month",
    "year",
}


def normalize_column(name: str) -> str:
    return str(name).strip().lower().replace(" ", "_")


def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(str(email).strip()))


def calculate_net(base: float, hra: float, allowances: float, deductions: float) -> float:
    return round(base + hra + allowances - deductions, 2)


def find_duplicates(values: list[str]) -> list[str]:
    seen: set[str] = set()
    dups: list[str] = []
    for v in values:
        key = str(v).strip().upper()
        if key in seen:
            dups.append(key)
        seen.add(key)
    return list(set(dups))


def row_errors(row: dict[str, Any], required: set[str]) -> list[str]:
    errors = []
    for col in required:
        val = row.get(col)
        if val is None or (isinstance(val, str) and not str(val).strip()):
            errors.append(f"Missing {col}")
    return errors
