import io
import re


def payslip_pdf_password(name: str, birth_year: int | None, employee_id: str) -> str:
    """
    Derive payslip PDF password: first 4 letters of name (lowercase) + birth year.
    Example: Ashwin, 1998 -> ashw1998
    Without birth year: prefix + alphanumeric employee_id (e.g. ashwemp001).
    """
    letters = "".join(c for c in (name or "").lower() if c.isalpha())
    if not letters:
        letters = "user"
    prefix = letters[:4]
    if birth_year:
        return f"{prefix}{int(birth_year)}"
    suffix = re.sub(r"[^a-z0-9]", "", (employee_id or "").lower())
    return f"{prefix}{suffix}" if suffix else prefix


def encrypt_pdf_bytes(pdf_bytes: bytes, password: str) -> bytes:
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=password, owner_password=password)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()
