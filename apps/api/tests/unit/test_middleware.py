"""Unit tests for middleware components (no DB needed)."""

from __future__ import annotations

from unittest.mock import Mock

import pytest
from fastapi import Request
from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import Response

from app.core.middleware import RequestContextMiddleware, SecurityHeadersMiddleware


@pytest.mark.anyio
async def test_security_headers_on_api():
    """Verify CSP and other security headers are set on API responses."""
    _app = Mock()
    middleware = SecurityHeadersMiddleware(_app)

    request = Mock(spec=Request)
    request.url.path = "/api/v1/health"

    response = Response(status_code=200)

    async def call_next(_req):
        return response

    result = await middleware.dispatch(request, call_next)
    assert result.headers.get("x-content-type-options") == "nosniff"
    assert result.headers.get("x-frame-options") == "DENY"
    assert result.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "content-security-policy" in result.headers
    csp = result.headers["content-security-policy"]
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "form-action 'self'" in csp


@pytest.mark.anyio
async def test_request_id_is_set():
    """Verify request ID is attached to response."""
    _app = Mock()
    middleware = RequestContextMiddleware(_app)

    request = Mock(spec=Request)
    request.headers = {}
    request.state = Mock()
    request.method = "GET"
    request.url.path = "/test"

    response = Response(status_code=200)

    async def call_next(_req):
        return response

    result = await middleware.dispatch(request, call_next)
    assert "x-request-id" in result.headers
    assert len(result.headers["x-request-id"]) > 0
    assert "x-response-time-ms" in result.headers
