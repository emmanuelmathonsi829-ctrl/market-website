import hmac
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..models import User

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
TOKEN_LIFETIME_MINUTES = 30


def read_admin_token():
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        return None

    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError):
        return None

    if payload.get("role") != "admin" or payload.get("sub") != "vertex-admin":
        return None

    return payload


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if read_admin_token() is None:
            return jsonify({"error": "Your administrator session has expired. Please sign in again."}), 401
        return view(*args, **kwargs)

    return wrapped


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Enter your email address and password."}), 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Enter your email address and password."}), 400

    email = email.strip().lower()
    configured_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    configured_password = os.getenv("ADMIN_PASSWORD", "")

    if not configured_email or not configured_password:
        current_app.logger.error("Administrator login environment variables are missing.")
        return jsonify({"error": "Administrator login is not configured on the server."}), 500

    email_matches = hmac.compare_digest(email, configured_email)
    password_matches = hmac.compare_digest(password, configured_password)

    if not email_matches or not password_matches:
        return jsonify({"error": "Invalid administrator email or password."}), 401

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "vertex-admin",
            "role": "admin",
            "iat": now,
            "exp": now + timedelta(minutes=TOKEN_LIFETIME_MINUTES),
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify({
        "token": token,
        "admin": {"name": "Administrator", "email": configured_email},
    }), 200


@admin_bp.route("/session", methods=["GET"])
@admin_required
def admin_session():
    return jsonify({
        "authenticated": True,
        "admin": {
            "name": "Administrator",
            "email": os.getenv("ADMIN_EMAIL", "").strip().lower(),
        },
    }), 200


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    users = db.session.execute(
        select(User).order_by(User.created_at.desc())
    ).scalars().all()

    return jsonify({
        "users": [user.to_dict() for user in users],
        "total": len(users),
    }), 200


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({"error": "Account not found."}), 404

    db.session.delete(user)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Unable to delete user account")
        return jsonify({"error": "Unable to delete this account right now."}), 500

    return jsonify({"message": "Account deleted successfully."}), 200


@admin_bp.route("/logout", methods=["POST"])
def admin_logout():
    return jsonify({"message": "Administrator signed out."}), 200
