from __future__ import annotations

from copy import deepcopy
from datetime import timedelta

import bcrypt
import pytest
from fastapi import HTTPException, Response

from backend.api import auth


class _InsertResult:
    def __init__(self, inserted_id: str) -> None:
        self.inserted_id = inserted_id


class _Collection:
    def __init__(self, records: list[dict] | None = None) -> None:
        self.records = records or []
        self.next_id = 1

    def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        for record in self.records:
            if all(record.get(key) == value for key, value in query.items()):
                return record
        return None

    def insert_one(self, document: dict) -> _InsertResult:
        record = deepcopy(document)
        record["_id"] = f"user-{self.next_id}"
        self.next_id += 1
        self.records.append(record)
        return _InsertResult(record["_id"])

    def update_one(self, query: dict, update: dict) -> None:
        record = self.find_one(query)
        if record is None:
            return
        record.update(deepcopy(update.get("$set", {})))
        for key in update.get("$unset", {}):
            record.pop(key, None)
        for key, value in update.get("$inc", {}).items():
            record[key] = record.get(key, 0) + value

    def delete_one(self, query: dict) -> None:
        record = self.find_one(query)
        if record is not None:
            self.records.remove(record)


class _Database:
    def __init__(self, users: list[dict] | None = None) -> None:
        self.users = _Collection(users)
        self.companies = _Collection()
        self.sessions = _Collection()
        self.demo_sessions = _Collection()


def _payload() -> auth.SignupRequest:
    return auth.SignupRequest(
        fullName="Demo Official",
        email="OFFICIAL@example.gov",
        password="a-safe-demo-password",
    )


def _use_database(monkeypatch, database: _Database) -> None:
    monkeypatch.setattr(auth, "get_database", lambda: database)


def test_demo_signup_assigns_official_role_for_new_user(monkeypatch):
    database = _Database()
    _use_database(monkeypatch, database)
    monkeypatch.setenv("APP_ENV", "demo")
    monkeypatch.setattr(auth, "issue_otp", lambda user, kind: None)

    payload = auth.SignupRequest.model_validate({**_payload().model_dump(), "role": "manufacturer"})
    result = auth.signup(payload)

    user = database.users.find_one({"email": "official@example.gov"})
    assert result["success"] is True
    assert user["role"] == "official"
    assert user["emailVerified"] is False
    assert bcrypt.checkpw(b"a-safe-demo-password", user["passwordHash"].encode())


def test_demo_signup_retry_promotes_unverified_manufacturer_record(monkeypatch):
    existing = {
        "_id": "existing-user",
        "email": "official@example.gov",
        "fullName": "Old Name",
        "passwordHash": "old-hash",
        "role": "manufacturer",
        "emailVerified": False,
    }
    database = _Database([existing])
    _use_database(monkeypatch, database)
    monkeypatch.setenv("APP_ENV", "demo")
    monkeypatch.setattr(auth, "issue_otp", lambda user, kind: None)

    auth.signup(_payload())

    assert len(database.users.records) == 1
    assert existing["role"] == "official"
    assert existing["fullName"] == "Demo Official"
    assert existing["emailVerified"] is False


def test_demo_signup_does_not_overwrite_verified_account(monkeypatch):
    existing = {
        "_id": "verified-user",
        "email": "official@example.gov",
        "fullName": "Verified User",
        "passwordHash": "unchanged-hash",
        "role": "manufacturer",
        "emailVerified": True,
    }
    database = _Database([existing])
    _use_database(monkeypatch, database)
    monkeypatch.setenv("APP_ENV", "demo")
    otp_calls: list[str] = []
    monkeypatch.setattr(auth, "issue_otp", lambda user, kind: otp_calls.append(kind))

    with pytest.raises(HTTPException) as error:
        auth.signup(_payload())

    assert error.value.status_code == 409
    assert existing["role"] == "manufacturer"
    assert existing["passwordHash"] == "unchanged-hash"
    assert otp_calls == []


def test_public_signup_does_not_grant_official_role_outside_demo(monkeypatch):
    database = _Database()
    _use_database(monkeypatch, database)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr(auth, "issue_otp", lambda user, kind: None)

    auth.signup(_payload())

    assert database.users.find_one({"email": "official@example.gov"})["role"] == "manufacturer"


def test_email_verification_then_official_login_succeeds_in_demo(monkeypatch):
    database = _Database()
    _use_database(monkeypatch, database)
    monkeypatch.setenv("APP_ENV", "demo")

    def issue_demo_otp(user: dict, kind: str) -> None:
        assert kind == "verification"
        database.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "verificationOtpHash": auth.otp_hash("123456"),
                    "verificationOtpExpiresAt": auth.utcnow() + timedelta(minutes=5),
                    "verificationOtpAttempts": 0,
                }
            },
        )

    monkeypatch.setattr(auth, "issue_otp", issue_demo_otp)
    auth.signup(_payload())

    verified = auth.verify_email(auth.OtpRequest(email="official@example.gov", otp="123456"))
    response = Response()
    login = auth.login(
        auth.LoginRequest(
            email="official@example.gov",
            password="a-safe-demo-password",
            role="official",
        ),
        response,
        None,
    )

    assert verified["success"] is True
    assert login["success"] is True
    assert login["user"]["role"] == "official"
    assert any(auth.SESSION_COOKIE in cookie for cookie in response.headers.getlist("set-cookie"))


def test_manufacturer_role_cannot_use_official_login(monkeypatch):
    database = _Database(
        [
            {
                "_id": "manufacturer-user",
                "email": "manufacturer@example.com",
                "passwordHash": bcrypt.hashpw(b"a-safe-demo-password", bcrypt.gensalt()).decode(),
                "role": "manufacturer",
                "emailVerified": True,
            }
        ]
    )
    _use_database(monkeypatch, database)

    with pytest.raises(HTTPException) as error:
        auth.login(
            auth.LoginRequest(
                email="manufacturer@example.com",
                password="a-safe-demo-password",
                role="official",
            ),
            Response(),
        )

    assert error.value.status_code == 403
