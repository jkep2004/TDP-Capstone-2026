
import time
import uuid

import structlog
from starlette.types import ASGIApp, Receive, Scope, Send


logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        structlog.contextvars.clear_contextvars()

        headers = dict(scope.get("headers", []))

        request_id = headers.get(
            b"x-request-id", b""
        ).decode("utf-8") or str(uuid.uuid4())

        structlog.contextvars.bind_contextvars(
            request_id=request_id,
        )

        start_time = time.perf_counter()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code

            if message["type"] == "http.response.start":
                status_code = message["status"]

                response_headers = list(
                    message.get("headers", [])
                )
                response_headers.append(
                    (b"x-request-id", request_id.encode())
                )
                message["headers"] = response_headers

            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)

            logger.info(
                "request_completed",
                method=scope["method"],
                path=scope["path"],
                status_code=status_code,
                duration_ms=round(
                    (time.perf_counter() - start_time) * 1000,
                    2,
                ),
            )

        except Exception:
            logger.exception(
                "request_failed",
                method=scope["method"],
                path=scope["path"],
                status_code=status_code,
                duration_ms=round(
                    (time.perf_counter() - start_time) * 1000,
                    2,
                ),
            )
            raise

        finally:
            structlog.contextvars.clear_contextvars()
