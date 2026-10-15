"""Clerk session-token authentication.

Every protected endpoint derives the caller's identity from the Clerk session
JWT in the ``Authorization: Bearer <token>`` header instead of trusting a
``user_id`` sent by the client.

Configuration (environment variables):
- CLERK_ISSUER: the Clerk Frontend API URL, e.g. https://<name>.clerk.accounts.dev
- CLERK_SECRET_KEY: Clerk backend secret key, used only to look up admin roles
- CLERK_AUTHORIZED_PARTIES: optional comma-separated list of allowed ``azp``
  origins (web origins). Tokens without ``azp`` (native apps) are accepted.
"""

import os
import time
from typing import Dict, Optional, Tuple

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool

CLERK_ISSUER = (os.getenv("CLERK_ISSUER") or "").rstrip("/")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_URL = "https://api.clerk.com/v1"
AUTHORIZED_PARTIES = {
    p.strip().rstrip("/")
    for p in (os.getenv("CLERK_AUTHORIZED_PARTIES") or "").split(",")
    if p.strip()
}
ADMIN_ROLE_CACHE_SECONDS = 60

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_client: Optional[jwt.PyJWKClient] = None
_admin_cache: Dict[str, Tuple[bool, float]] = {}


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(
            f"{CLERK_ISSUER}/.well-known/jwks.json", cache_keys=True
        )
    return _jwks_client


def _unauthorized(detail: str = "Invalid or missing authentication token"):
    return HTTPException(
        status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"}
    )


def verify_token(token: str) -> dict:
    """Verify a Clerk session JWT and return its claims."""
    if not CLERK_ISSUER:
        raise HTTPException(status_code=500, detail="Authentication is not configured")
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            leeway=5,
            options={"require": ["exp", "iat", "iss", "sub"]},
        )
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise _unauthorized()

    azp = claims.get("azp")
    if azp and AUTHORIZED_PARTIES and azp.rstrip("/") not in AUTHORIZED_PARTIES:
        raise _unauthorized("Token was issued for an unauthorized origin")
    return claims


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """FastAPI dependency: the Clerk user id (``sub``) of the caller."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    # JWKS lookup may hit the network on a cache miss, so keep it off the event loop.
    claims = await run_in_threadpool(verify_token, credentials.credentials)
    return claims["sub"]


async def _fetch_is_admin(user_id: str) -> bool:
    if not CLERK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Admin checks are not configured")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{CLERK_API_URL}/users/{user_id}",
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
        )
    if resp.status_code == 404:
        return False
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to verify admin role")
    return (resp.json().get("public_metadata") or {}).get("role") == "admin"


async def is_admin(user_id: str) -> bool:
    cached = _admin_cache.get(user_id)
    now = time.monotonic()
    if cached and cached[1] > now:
        return cached[0]
    result = await _fetch_is_admin(user_id)
    _admin_cache[user_id] = (result, now + ADMIN_ROLE_CACHE_SECONDS)
    return result


async def require_admin(user_id: str = Depends(get_current_user_id)) -> str:
    """FastAPI dependency: the caller's user id, if they have the admin role."""
    if not await is_admin(user_id):
        raise HTTPException(status_code=403, detail="Admin role required")
    return user_id
