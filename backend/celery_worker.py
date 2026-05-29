"""
Optional Celery worker — only needed when CELERY_TASK_ALWAYS_EAGER=false and Redis is running.

  celery -A celery_worker.celery worker --loglevel=info --pool=solo
"""
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from app.celery_app import celery
