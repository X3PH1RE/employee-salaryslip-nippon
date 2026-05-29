from pathlib import Path

import pandas as pd

from app.utils.validators import normalize_column


def read_tabular_file(file_path: str) -> pd.DataFrame:
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


def dataframe_to_records(df: pd.DataFrame) -> list[dict]:
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")
