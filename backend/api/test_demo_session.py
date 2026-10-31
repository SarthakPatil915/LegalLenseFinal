import hashlib
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException, Response

from backend.api import auth


class _DemoSessions:
    def __init__(self) -> None:
        self.records: list[dict[str, object]] = []

    def insert_one(self, record: dict[str, object]) -> None:
        self.records.append(record)

    def find_one(self, query: dict[str, object]) -> dict[str, object] | None:
        for record in self.records:
            if (
                record["tokenHash"] == query["tokenHash"]
                and record["expiresAt"] > query["expiresAt"]["$gt"]
            ):
                return record
        return None


class _Database:
    def __init__(self) -> None:
        self.demo_sessions = _DemoSessions()
        self.sessions = self.demo_sessions


def test_demo_session_is_server_stored_and_uses_secure_http_only_cookie(monkeypatch):
    database = _Database()
    monkeypatch.setattr(auth, "get_database", lambda: database)
    monkeypatch.setenv("APP_ENV", "production")
    response = Response()

    result = auth.create_demo_session(response, None)

    cookies = response.headers.getlist("set-cookie")
    demo_cookie = next(cookie for cookie in cookies if auth.DEMO_SESSION_COOKIE in cookie)
    token = demo_cookie.split(";", 1)[0].split("=", 1)[1]
    record = database.demo_sessions.records[0]
    assert result["sessionId"] == record["sessionId"]
    assert record["tokenHash"] == hashlib.sha256(token.encode()).hexdigest()
    assert "Secure" in demo_cookie
    assert "HttpOnly" in demo_cookie
    assert auth.demo_user(token)["_id"] == record["sessionId"]


def test_demo_session_rejects_unknown_and_expired_tokens(monkeypatch):
    database = _Database()
    monkeypatch.setattr(auth, "get_database", lambda: database)

    with pytest.raises(HTTPException) as missing:
        auth.demo_user(None)
    assert missing.value.status_code == 401

    database.demo_sessions.records.append({
        "sessionId": "expired",
        "tokenHash": hashlib.sha256(b"expired-token").hexdigest(),
        "expiresAt": datetime(2000, 1, 1, tzinfo=timezone.utc),
    })
    with pytest.raises(HTTPException) as expired:
        auth.demo_user("expired-token")
    assert expired.value.status_code == 401
