from pathlib import Path

from app.config import Config
from app.services.storage_service import StorageService


class UploadService:
    ALLOWED = {".csv", ".xlsx", ".xls"}

    @staticmethod
    def ensure_dirs():
        if not StorageService.enabled():
            Path(Config.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
            Path(Config.PAYSLIP_FOLDER).mkdir(parents=True, exist_ok=True)
        StorageService.ensure_buckets()

    @staticmethod
    def save_upload(file_storage, prefix: str = "upload") -> str:
        UploadService.ensure_dirs()
        return StorageService.save_upload(file_storage, prefix=prefix)
