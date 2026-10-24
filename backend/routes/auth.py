import hmac
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import User_

auth_bp = Blueprint("auth", __name__)


def _email(value):
    return value.strip().lower() if isinstance(value, str) else ""


def _admin_from_token():
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
    except (jwt.InvalidTokenError, TypeError):
        return None
    if payload.get("role") != "admin" or not payload.get("email"):
        return None
    return {"name": payload.get("name") or "Administrator", "email": payload["email"]}


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        admin = _admin_from_token()
        if not admin:
            return jsonify({"error": "Administrator authentication required. Please sign in again."}), 401
        request.admin_identity = admin
        return view(*args, **kwargs)
    return wrapped


@auth_bp.post("/api/signup")
def signup():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    email = _email(data.get("email"))
    password = data.get("password")
    if not email or len(email) > 254 or "@" not in email:
        return jsonify({"error": "Please enter a valid email address."}), 400
    if not isinstance(password, str):
        return jsonify({"error": "Email and password are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400
    if len(password) > 1024:
        return jsonify({"error": "Password is too long."}), 400

    if db.session.execute(db.select(User_).where(User_.email == email)).scalar_one_or_none():
        return jsonify({"error": "An account with this email already exists."}), 409

    user = User_(email=email, password_hash=generate_password_hash(password))
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "An account with this email already exists."}), 409
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Unable to create your account right now."}), 500

    return jsonify({
        "message": "Account created successfully.",
        "user": {"id": user.id, "email": user.email, "is_verified": user.is_verified},
    }), 201


@auth_bp.post("/api/login")
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    email = _email(data.get("email"))
    password = data.get("password")
    if not email or not isinstance(password, str):
        return jsonify({"error": "Email and password are required."}), 400

    user = db.session.execute(db.select(User_).where(User_.email == email)).scalar_one_or_none()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    return jsonify({
        "message": "Login successful.",
        "redirect": "index.html",
        "user": {"id": user.id, "email": user.email, "is_verified": user.is_verified},
    }), 200


@auth_bp.post("/api/admin/login")
def admin_login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    expected_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    expected_password = os.getenv("ADMIN_PASSWORD", "")
    admin_name = os.getenv("ADMIN_NAME", "Administrator").strip() or "Administrator"
    email = _email(data.get("email"))
    password = data.get("password")

    if not expected_email or not expected_password:
        return jsonify({"error": "Admin credentials have not been configured on the server."}), 503
    if not isinstance(password, str) or not hmac.compare_digest(email, expected_email) or not hmac.compare_digest(password, expected_password):
        return jsonify({"error": "Invalid administrator email or password."}), 401

    now = datetime.now(timezone.utc)
    token = jwt.encode({
        "sub": "vertex-admin",
        "role": "admin",
        "name": admin_name,
        "email": expected_email,
        "iat": now,
        "exp": now + timedelta(hours=8),
    }, current_app.config["SECRET_KEY"], algorithm="HS256")
    return jsonify({
        "message": "Administrator login successful.",
        "token": token,
        "admin": {"name": admin_name, "email": expected_email},
        "expires_in": 28800,
    })


@auth_bp.post("/api/admin/logout")
@admin_required
def admin_logout():
                                                                
    return jsonify({"message": "Logged out successfully."})


@auth_bp.get("/api/admin/session")
def admin_session():
    admin = _admin_from_token()
    return jsonify({"authenticated": bool(admin), "admin": admin})


@auth_bp.get("/api/admin/users")
@admin_required
def admin_users():
    users = db.session.execute(db.select(User_).order_by(User_.created_at.desc())).scalars().all()
    return jsonify({"users": [{
        "id": user.id,
        "email": user.email,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    } for user in users]})


@auth_bp.delete("/api/admin/users/<int:user_id>")
@admin_required
def admin_delete_user(user_id):
    user = db.session.get(User_, user_id)
    if user is None:
        return jsonify({"error": "Account not found."}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account deleted successfully."})
