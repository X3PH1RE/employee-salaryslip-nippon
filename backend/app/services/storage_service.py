import io
import os
import uuid
from datetime import datetime
from pathlib import Path

from werkzeug.utils import secure_filename

from app.config import Config

STORAGE_PREFIX = "supabase://"


class StorageService:
    @staticmethod
    def enabled() -> bool:
        return bool(Config.SUPABASE_URL and Config.SUPABASE_SERVICE_KEY)

    @staticmethod
    def _client():
        from storage3 import create_client

        url = f"{Config.SUPABASE_URL.rstrip('/')}/storage/v1/"
        key = Config.SUPABASE_SERVICE_KEY
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
        }
        return create_client(url, headers, is_async=False)

    @staticmethod
    def verify_credentials() -> str | None:
        if not StorageService.enabled():
            return None
        try:
            StorageService._client().list_buckets()
            return None
        except Exception as exc:
            msg = str(exc)
            if "Invalid API key" in msg or "invalid" in msg.lower():
                return (
                    "Supabase rejected SUPABASE_SERVICE_KEY (Invalid API key). "
                    "Use the service_role secret from Project Settings → API, not the anon key. "
                    "If the key starts with sb_secret_, use storage3>=2.28."
                )
            return f"Supabase storage unavailable: {msg}"

    @staticmethod
    def ensure_buckets():
        if not StorageService.enabled():
            return
        # Buckets are created once in Supabase; skip network calls on serverless cold start.
        if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
            return
        err = StorageService.verify_credentials()
        if err:
            raise RuntimeError(err)
        client = StorageService._client()
        existing: set[str] = set()
        for b in client.list_buckets() or []:
            bucket_name = getattr(b, "name", None) or (b.get("name") if isinstance(b, dict) else None)
            if bucket_name:
                existing.add(bucket_name)
        for name in (Config.SUPABASE_UPLOAD_BUCKET, Config.SUPABASE_PAYSLIP_BUCKET):
            if name not in existing:
                try:
                    client.create_bucket(name, options={"public": False})
                except Exception:
                    pass

    @staticmethod
    def _uri(bucket: str, object_path: str) -> str:
        return f"{STORAGE_PREFIX}{bucket}/{object_path}"

    @staticmethod
    def parse_uri(uri: str) -> tuple[str, str] | None:
        if not uri.startswith(STORAGE_PREFIX):
            return None
        rest = uri[len(STORAGE_PREFIX) :]
        bucket, _, path = rest.partition("/")
        return bucket, path

    @staticmethod
    def upload_bytes(bucket: str, object_path: str, data: bytes, content_type: str) -> str:
        StorageService._client().from_(bucket).upload(
            path=object_path,
            file=data,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return StorageService._uri(bucket, object_path)

    @staticmethod
    def download_bytes(uri_or_path: str) -> bytes:
        parsed = StorageService.parse_uri(uri_or_path)
        if parsed:
            bucket, object_path = parsed
            return StorageService._client().from_(bucket).download(object_path)
        with open(uri_or_path, "rb") as f:
            return f.read()

    @staticmethod
    def exists(uri_or_path: str) -> bool:
        if not uri_or_path or not str(uri_or_path).strip():
            return False
        try:
            StorageService.download_bytes(uri_or_path)
            return True
        except Exception:
            return Path(uri_or_path).exists() if not uri_or_path.startswith(STORAGE_PREFIX) else False

    @staticmethod
    def filename_from_uri(uri_or_path: str) -> str:
        parsed = StorageService.parse_uri(uri_or_path)
        if parsed:
            return Path(parsed[1]).name
        return Path(uri_or_path).name

    @staticmethod
    def save_upload(file_storage, prefix: str = "upload") -> str:
        original = secure_filename(file_storage.filename or "file.csv")
        ext = Path(original).suffix.lower()
        if ext not in {".csv", ".xlsx", ".xls"}:
            raise ValueError("File type not allowed. Use: .csv, .xlsx, .xls")

        name = f"{prefix}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        data = file_storage.read()

        if StorageService.enabled():
            content_types = {
                ".csv": "text/csv",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xls": "application/vnd.ms-excel",
            }
            object_path = f"{prefix}/{name}"
            return StorageService.upload_bytes(
                Config.SUPABASE_UPLOAD_BUCKET,
                object_path,
                data,
                content_types.get(ext, "application/octet-stream"),
            )

        Path(Config.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
        path = os.path.join(Config.UPLOAD_FOLDER, name)
        with open(path, "wb") as f:
            f.write(data)
        return path

    @staticmethod
    def save_payslip_pdf(job_id: int, filename: str, pdf_bytes: bytes) -> str:
        if StorageService.enabled():
            object_path = f"job_{job_id}/{filename}"
            return StorageService.upload_bytes(
                Config.SUPABASE_PAYSLIP_BUCKET,
                object_path,
                pdf_bytes,
                "application/pdf",
            )

        out_dir = Path(Config.PAYSLIP_FOLDER) / f"job_{job_id}"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / filename
        out_path.write_bytes(pdf_bytes)
        return str(out_path)
