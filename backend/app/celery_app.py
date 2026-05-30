from celery import Celery

from app.config import Config

# When CELERY_TASK_ALWAYS_EAGER=true (default), tasks run inside Flask — no Redis/worker.
celery = Celery(
    "payslip_worker",
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND,
    include=["app.tasks.payslip_tasks"],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_always_eager=Config.CELERY_TASK_ALWAYS_EAGER,
    task_eager_propagates=Config.CELERY_TASK_ALWAYS_EAGER,
)
