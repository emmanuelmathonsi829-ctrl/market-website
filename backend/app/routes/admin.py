
import hmac
import os
import time
from datetime import timedelta
from functools import wraps

from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy import select

from ..extensions import db
from ..models import User

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
SESSION_LIFETIME_SECONDS = 1800


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        login_time = session.get("admin_login_time")

        if (
            session.get("admin_authenticated") is not True
            or not isinstance(login_time, (int, float))
            or time.time() - login_time > SESSION_LIFETIME_SECONDS
        ):
            session.clear()
            return jsonify({
                "error": "Your administrator session has expired. Please sign in again."
            }), 401

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
    configured_name = os.getenv("ADMIN_NAME", "").strip() or "Administrator"

    if not configured_email or not configured_password:
        current_app.logger.error("Administrator login environment variables are missing.")
        return jsonify({
            "error": "Administrator login is not configured on the server."
        }), 500

    if not hmac.compare_digest(email, configured_email) or not hmac.compare_digest(password, configured_password):
        return jsonify({"error": "Invalid administrator email or password."}), 401

    session.clear()
    session.permanent = True
    current_app.permanent_session_lifetime = timedelta(
        seconds=SESSION_LIFETIME_SECONDS
    )
    session["admin_authenticated"] = True
    session["admin_login_time"] = time.time()
    session["admin_email"] = configured_email
    session["admin_name"] = configured_name

    return jsonify({
        "admin": {
            "name": configured_name,
            "email": configured_email
        }
    }), 200


@admin_bp.route("/session", methods=["GET"])
@admin_required
def admin_session():
    return jsonify({
        "authenticated": True,
        "admin": {
            "name": session.get("admin_name", "Administrator"),
            "email": session.get("admin_email", "")
        }
    }), 200


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    users = db.session.execute(
        select(User).order_by(User.created_at.desc())
    ).scalars().all()

    return jsonify({
        "users": [user.to_dict() for user in users],
        "total": len(users)
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
        return jsonify({
            "error": "Unable to delete this account right now."
        }), 500

    return jsonify({"message": "Account deleted successfully."}), 200


@admin_bp.route("/logout", methods=["POST"])
def admin_logout():
    session.clear()
    return jsonify({"message": "Administrator signed out."}), 200
