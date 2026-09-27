"""API security: trusted hosts, CORS allow-list, CSRF header check.

Purpose: Protect loopback API from cross-site attacks.
Inputs: None.
Returns: Constants and middleware for trusted hosts, CORS, and CSRF.
Does not: Authenticate users or validate tokens.
"""

from __future__ import annotations

import os

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

ALLOWED_HOSTS: tuple[str, ...] = ("127.0.0.1", "localhost")
# 5173 = Vite dev; 5174 = Neutralino desktop shell (M5, fixed port in desktop/)
DEFAULT_ALLOWED_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
)
ORIGINS_ENV = "APPFLY_ALLOWED_ORIGINS"
CSRF_HEADER = "X-AppFly"
CSRF_HEADER_VALUE = "1"
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def allowed_origins() -> list[str]:
    """Get list of allowed origins from env var and defaults.

    Purpose: Build allow-list of origins for CORS and CSRF protection.
    Inputs: None.
    Returns: List of origin strings (without trailing slashes).
    Does not: Validate URLs or check if origins are reachable.
    """
    origins = list(DEFAULT_ALLOWED_ORIGINS)
    env_origins = os.environ.get(ORIGINS_ENV, "")
    if env_origins:
        for origin in env_origins.split(","):
            stripped = origin.strip().rstrip("/")
            if stripped and stripped not in origins:
                origins.append(stripped)
    return origins


class CSRFMiddleware(BaseHTTPMiddleware):
    """Block cross-site form posts and simple cross-origin requests.

    Purpose: Prevent unauthorized actions from external sites.
    Inputs: ASGI app and list of allowed origins.
    Returns: Middleware that checks CSRF header and origin.
    Does not: Authenticate users or touch GET routes.
    """

    def __init__(self, app: ASGIApp, *, allowed_origins: list[str]) -> None:
        super().__init__(app)
        self.allowed_origins = frozenset(allowed_origins)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.method not in UNSAFE_METHODS:
            return await call_next(request)

        if request.headers.get(CSRF_HEADER) != CSRF_HEADER_VALUE:
            return JSONResponse(
                {"detail": "Missing X-AppFly: 1 header"}, status_code=403
            )

        origin = request.headers.get("origin")
        if origin is not None and origin not in self.allowed_origins:
            return JSONResponse(
                {"detail": "Origin not allowed"}, status_code=403
            )

        return await call_next(request)
