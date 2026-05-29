from app.celery_app import celery

# Run: celery -A celery_worker.celery worker --loglevel=info --pool=solo
