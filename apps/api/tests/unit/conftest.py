"""Unit test fixtures - no MongoDB or Redis needed."""

from __future__ import annotations

import os

import pytest


def pytest_configure(config):
    """Set test env vars before any imports."""
    os.environ.setdefault("APP_ENV", "test")
    os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-testing-only")
    os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-000000000000000000000000")
