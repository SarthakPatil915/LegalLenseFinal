from fastapi import Response

from backend.api import auth


class _SessionStore:
    def insert_one(self, document: dict[str, object]) -> None:
        self.document = document


class _Database:
    def __init__(self) -> None:
        self.sessions = _SessionStore()


def _set_cookie(monkeypatch, app_env: str | None) -> str:
    if app_env is None:
        monkeypatch.delenv("APP_ENV", raising=False)
    else:
        monkeypatch.setenv("APP_ENV", app_env)

    monkeypatch.setattr(auth, "get_database", _Database)
    response = Response()
    auth.set_session(response, {"_id": "test-user"})
    return response.headers["set-cookie"]


def test_session_cookie_is_secure_by_default(monkeypatch):
    cookie = _set_cookie(monkeypatch, None)

    assert "; Secure" in cookie
    assert "; HttpOnly" in cookie


def test_session_cookie_can_be_insecure_for_local_development(monkeypatch):
    cookie = _set_cookie(monkeypatch, "development")

    assert "; Secure" not in cookie
    assert "; HttpOnly" in cookie


def test_session_cookie_is_secure_in_production(monkeypatch):
    cookie = _set_cookie(monkeypatch, "production")

    assert "; Secure" in cookie
    assert "; HttpOnly" in cookie
