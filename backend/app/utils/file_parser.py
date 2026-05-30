import io
from pathlib import Path

import pandas as pd

from app.services.storage_service import StorageService
from app.utils.validators import normalize_column


def read_tabular_file(file_path: str) -> pd.DataFrame:
    if file_path.startswith("supabase://"):
        data = StorageService.download_bytes(file_path)
        suffix = Path(StorageService.parse_uri(file_path)[1]).suffix.lower()
        return read_tabular_bytes(data, suffix)
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(file_path)
    elif suffix in (".xlsx", ".xls"):
        df = pd.read_excel(file_path, engine="openpyxl")
    else:
        raise ValueError(f"Unsupported file type: {suffix}")
    df.columns = [normalize_column(c) for c in df.columns]
    return df


def read_tabular_bytes(data: bytes, suffix: str) -> pd.DataFrame:
    suffix = suffix.lower()
    buf = io.BytesIO(data)
    if suffix == ".csv":
        df = pd.read_csv(buf)
    elif suffix in (".xlsx", ".xls"):
        df = pd.read_excel(buf, engine="openpyxl")
    else:
        raise ValueError(f"Unsupported file type: {suffix}")
    df.columns = [normalize_column(c) for c in df.columns]
    return df


def read_upload_file(file_storage) -> pd.DataFrame:
    original = file_storage.filename or "file.csv"
    suffix = Path(original).suffix.lower()
    data = file_storage.read()
    file_storage.stream.seek(0)
    return read_tabular_bytes(data, suffix)

def dataframe_to_records(df: pd.DataFrame) -> list[dict]:
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")

