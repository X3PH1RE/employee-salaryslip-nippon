import os
import uuid
from datetime import datetime
from pathlib import Path

from werkzeug.utils import secure_filename

from app.config import Config


class UploadService:
    ALLOWED = {".csv", ".xlsx", ".xls"}

    @staticmethod
    def ensure_dirs():
        Path(Config.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
        Path(Config.PAYSLIP_FOLDER).mkdir(parents=True, exist_ok=True)

    @staticmethod
    def save_upload(file_storage, prefix: str = "upload") -> str:
        UploadService.ensure_dirs()
        original = secure_filename(file_storage.filename or "file.csv")
        ext = Path(original).suffix.lower()
        if ext not in UploadService.ALLOWED:
            raise ValueError(f"File type not allowed. Use: {', '.join(UploadService.ALLOWED)}")
        name = f"{prefix}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        path = os.path.join(Config.UPLOAD_FOLDER, name)
        file_storage.save(path)
        return path
