from app.config import Config


class _EagerTaskResult:
    id = "eager"


class _EagerBoundTask:
    def __init__(self, fn):
        self.fn = fn

    def delay(self, *args, **kwargs):
        class _Self:
            class request:
                id = "eager"

        self.fn(_Self(), *args, **kwargs)
        return _EagerTaskResult()


class _EagerCelery:
    def task(self, bind=False, name=None):
        def decorator(fn):
            if bind:
                return _EagerBoundTask(fn)

            def delay(*args, **kwargs):
                fn(*args, **kwargs)
                return _EagerTaskResult()

            fn.delay = delay
            return fn

        return decorator


if Config.CELERY_TASK_ALWAYS_EAGER:
    celery = _EagerCelery()
else:
    from celery import Celery

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
        task_always_eager=False,
        task_eager_propagates=False,
    )
