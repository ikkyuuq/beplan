import asyncio
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from backend import auth
from backend.routers import goals, template

ISSUER = "https://example.clerk.accounts.dev"
PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def make_token(key=PRIVATE_KEY, **overrides):
    now = int(time.time())
    claims = {"sub": "user_123", "iss": ISSUER, "iat": now, "exp": now + 60}
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="RS256")


@pytest.fixture(autouse=True)
def clerk_config(monkeypatch):
    jwks = Mock()
    jwks.get_signing_key_from_jwt.return_value = SimpleNamespace(
        key=PRIVATE_KEY.public_key()
    )
    monkeypatch.setattr(auth, "CLERK_ISSUER", ISSUER)
    monkeypatch.setattr(auth, "AUTHORIZED_PARTIES", set())
    monkeypatch.setattr(auth, "_get_jwks_client", lambda: jwks)
    monkeypatch.setattr(auth, "_admin_cache", {})


def current_user(token):
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return asyncio.run(auth.get_current_user_id(creds))


def assert_unauthorized(token):
    with pytest.raises(HTTPException) as error:
        current_user(token)
    assert error.value.status_code == 401


def test_valid_token_returns_clerk_user_id():
    assert current_user(make_token()) == "user_123"


def test_missing_credentials_are_rejected():
    with pytest.raises(HTTPException) as error:
        asyncio.run(auth.get_current_user_id(None))
    assert error.value.status_code == 401


def test_expired_token_is_rejected():
    assert_unauthorized(make_token(exp=int(time.time()) - 120))


def test_token_from_another_issuer_is_rejected():
    assert_unauthorized(make_token(iss="https://evil.example.com"))


def test_token_signed_with_another_key_is_rejected():
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    assert_unauthorized(make_token(key=other_key))


def test_token_without_subject_is_rejected():
    assert_unauthorized(make_token(sub=None))


def test_unauthorized_party_is_rejected(monkeypatch):
    monkeypatch.setattr(auth, "AUTHORIZED_PARTIES", {"https://admin.beplan.app"})
    assert_unauthorized(make_token(azp="https://evil.example.com"))
    assert current_user(make_token(azp="https://admin.beplan.app")) == "user_123"


def test_unconfigured_issuer_fails_closed(monkeypatch):
    monkeypatch.setattr(auth, "CLERK_ISSUER", "")
    with pytest.raises(HTTPException) as error:
        current_user(make_token())
    assert error.value.status_code == 500


def test_protected_router_requires_bearer_token():
    app = FastAPI()

    @app.get("/me", dependencies=[Depends(auth.get_current_user_id)])
    async def me(user_id: str = Depends(auth.get_current_user_id)):
        return {"user_id": user_id}

    client = TestClient(app)
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer junk"}).status_code == 401
    resp = client.get("/me", headers={"Authorization": f"Bearer {make_token()}"})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "user_123"}


def test_require_admin_checks_role_and_caches(monkeypatch):
    fetch = AsyncMock(return_value=False)
    monkeypatch.setattr(auth, "_fetch_is_admin", fetch)

    with pytest.raises(HTTPException) as error:
        asyncio.run(auth.require_admin("user_123"))
    assert error.value.status_code == 403

    asyncio.run(auth.is_admin("user_123"))
    assert fetch.await_count == 1  # second lookup served from cache


def test_require_admin_allows_admin(monkeypatch):
    monkeypatch.setattr(auth, "_fetch_is_admin", AsyncMock(return_value=True))
    assert asyncio.run(auth.require_admin("admin_1")) == "admin_1"


# --- ownership checks in routers -------------------------------------------


class FakeConnection:
    def __init__(self):
        self.fetch = AsyncMock()
        self.fetchrow = AsyncMock()
        self.fetchval = AsyncMock()
        self.execute = AsyncMock()
        self.transaction = Mock(return_value=self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


def patch_pool(monkeypatch, module, connection):
    async def get_pool():
        return SimpleNamespace(acquire=lambda: connection)

    monkeypatch.setattr(module, "get_db_pool", get_pool)


def test_delete_goal_is_scoped_to_owner(monkeypatch):
    connection = FakeConnection()
    connection.execute.return_value = "DELETE 0"
    patch_pool(monkeypatch, goals, connection)

    with pytest.raises(HTTPException) as error:
        asyncio.run(goals.delete_goal(5, user_id="intruder"))

    assert error.value.status_code == 404
    assert connection.execute.await_args.args[-2:] == (5, "intruder")


def test_get_goal_is_scoped_to_owner(monkeypatch):
    connection = FakeConnection()
    connection.fetchrow.return_value = None
    patch_pool(monkeypatch, goals, connection)

    with pytest.raises(HTTPException) as error:
        asyncio.run(goals.get_goal(5, user_id="intruder"))

    assert error.value.status_code == 404
    assert connection.fetchrow.await_args.args[-2:] == (5, "intruder")


def test_delete_template_rejects_non_owner_non_admin(monkeypatch):
    connection = FakeConnection()
    connection.fetchval.return_value = "owner-1"
    patch_pool(monkeypatch, template, connection)
    monkeypatch.setattr(template, "is_admin", AsyncMock(return_value=False))

    with pytest.raises(HTTPException) as error:
        asyncio.run(template.delete_template(7, user_id="intruder"))

    assert error.value.status_code == 403
    connection.execute.assert_not_awaited()


def test_delete_template_allows_owner(monkeypatch):
    connection = FakeConnection()
    connection.fetchval.return_value = "owner-1"
    patch_pool(monkeypatch, template, connection)

    result = asyncio.run(template.delete_template(7, user_id="owner-1"))

    assert result == {"message": "Template deleted"}
    connection.execute.assert_awaited_once()


def test_delete_template_allows_admin(monkeypatch):
    connection = FakeConnection()
    connection.fetchval.return_value = "BePlan"
    patch_pool(monkeypatch, template, connection)
    monkeypatch.setattr(template, "is_admin", AsyncMock(return_value=True))

    result = asyncio.run(template.delete_template(7, user_id="admin-1"))

    assert result == {"message": "Template deleted"}


def test_favorites_cannot_be_read_for_another_user():
    with pytest.raises(HTTPException) as error:
        asyncio.run(template.get_favorite_templates("victim", current_user_id="intruder"))
    assert error.value.status_code == 403
