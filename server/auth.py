"""Google OAuth session auth — single-user email allowlist."""

from __future__ import annotations

import os
import secrets
from typing import Any
from urllib.parse import urlencode

import requests
from fastapi import HTTPException, Request
from starlette.responses import RedirectResponse

SESSION_USER_KEY = "user_email"
SESSION_NAME_KEY = "user_name"
SESSION_PICTURE_KEY = "user_picture"
OAUTH_STATE_KEY = "oauth_state"

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def auth_enabled() -> bool:
    return bool(os.getenv("APP_GOOGLE_CLIENT_ID") and os.getenv("ALLOWED_EMAIL"))


def public_url() -> str:
    return os.getenv("APP_PUBLIC_URL", "http://localhost:5173").rstrip("/")


def session_secret() -> str:
    secret = os.getenv("SESSION_SECRET")
    if secret:
        return secret
    if not auth_enabled():
        return "dev-insecure-session-secret"
    raise RuntimeError("SESSION_SECRET est requis quand l'authentification est active")


def allowed_emails() -> set[str]:
    raw = os.getenv("ALLOWED_EMAIL", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def cors_origins() -> list[str]:
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    base = public_url()
    if base not in origins:
        origins.append(base)
    for origin in os.getenv("CORS_ORIGINS", "").split(","):
        origin = origin.strip()
        if origin and origin not in origins:
            origins.append(origin)
    return origins


def redirect_uri() -> str:
    return f"{public_url()}/api/auth/callback"


def require_user(request: Request) -> dict[str, Any] | None:
    if not auth_enabled():
        return None
    email = request.session.get(SESSION_USER_KEY)
    if not email:
        raise HTTPException(status_code=401, detail="Authentification requise")
    return {
        "email": email,
        "name": request.session.get(SESSION_NAME_KEY),
        "picture": request.session.get(SESSION_PICTURE_KEY),
    }


def login_redirect(request: Request) -> RedirectResponse:
    if not auth_enabled():
        raise HTTPException(status_code=503, detail="Authentification non configurée")
    client_secret = os.getenv("APP_GOOGLE_CLIENT_SECRET")
    if not client_secret:
        raise HTTPException(status_code=503, detail="APP_GOOGLE_CLIENT_SECRET manquant")

    state = secrets.token_urlsafe(32)
    request.session[OAUTH_STATE_KEY] = state
    params = {
        "client_id": os.environ["APP_GOOGLE_CLIENT_ID"],
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
        "access_type": "online",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


def callback_handler(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    if error:
        return RedirectResponse(f"{public_url()}/?auth_error={error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Paramètres OAuth manquants")

    expected = request.session.pop(OAUTH_STATE_KEY, None)
    if not expected or state != expected:
        raise HTTPException(status_code=400, detail="État OAuth invalide")

    client_secret = os.getenv("APP_GOOGLE_CLIENT_SECRET")
    if not client_secret:
        raise HTTPException(status_code=503, detail="APP_GOOGLE_CLIENT_SECRET manquant")

    token_resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": os.environ["APP_GOOGLE_CLIENT_ID"],
            "client_secret": client_secret,
            "redirect_uri": redirect_uri(),
            "grant_type": "authorization_code",
        },
        timeout=30,
    )
    if not token_resp.ok:
        raise HTTPException(status_code=502, detail="Échec échange token Google")

    access_token = token_resp.json().get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Token Google manquant")

    user_resp = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    user_resp.raise_for_status()
    user = user_resp.json()

    if not user.get("email_verified", True):
        raise HTTPException(status_code=403, detail="Email Google non vérifié")

    email = (user.get("email") or "").lower()
    if email not in allowed_emails():
        request.session.clear()
        return RedirectResponse(f"{public_url()}/?auth_error=access_denied")

    request.session[SESSION_USER_KEY] = email
    request.session[SESSION_NAME_KEY] = user.get("name")
    request.session[SESSION_PICTURE_KEY] = user.get("picture")
    return RedirectResponse(f"{public_url()}/")


def me_payload(request: Request) -> dict[str, Any]:
    if not auth_enabled():
        return {"auth_required": False, "authenticated": True}
    email = request.session.get(SESSION_USER_KEY)
    if not email:
        return {"auth_required": True, "authenticated": False}
    return {
        "auth_required": True,
        "authenticated": True,
        "email": email,
        "name": request.session.get(SESSION_NAME_KEY),
        "picture": request.session.get(SESSION_PICTURE_KEY),
    }


def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}
