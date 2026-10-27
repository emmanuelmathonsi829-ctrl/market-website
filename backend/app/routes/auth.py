from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)


def read_credentials():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return None, None, {}

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return None, None, data

    email = email.strip().lower()

    if not email or len(email) > 254 or "@" not in email:
        return None, None, data

    return email, password, data


def account_response(user):
    return {"user": user.to_dict()}


@auth_bp.route("/api/signup", methods=["POST"])
@auth_bp.route("/api/auth/register", methods=["POST"])
def signup():
    email, password, _data = read_credentials()

    if email is None or not password:
        return jsonify({"error": "Enter a valid email address and password."}), 400

    if len(password) < 8:
        return jsonify({"error": "Your password must contain at least 8 characters."}), 400

    if len(password) > 1024:
        return jsonify({"error": "Your password is too long."}), 400

    existing_user = db.session.execute(
        select(User).where(User.email == email)
    ).scalar_one_or_none()

    if existing_user:
        return jsonify({"error": "An account with this email already exists."}), 409

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Unable to create account")
        return jsonify({"error": "Unable to create your account right now."}), 500

    return jsonify({
        "message": "Account created successfully. You can now sign in.",
        **account_response(user),
    }), 201


@auth_bp.route("/api/login", methods=["POST"])
@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    email, password, data = read_credentials()

    if email is None or not password:
        return jsonify({"error": "Enter your email address and password."}), 400

    user = db.session.execute(
        select(User).where(User.email == email)
    ).scalar_one_or_none()

    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email address or password."}), 401

    session.clear()
    session["user_id"] = user.id
    session.permanent = data.get("remember") is True

    return jsonify({
        "message": "Login successful.",
        "redirect": "index.html",
        **account_response(user),
    }), 200


@auth_bp.route("/api/auth/me", methods=["GET"])
def current_user():
    user_id = session.get("user_id")

    if user_id is None:
        return jsonify({"authenticated": False}), 200

    user = db.session.get(User, user_id)

    if user is None:
        session.clear()
        return jsonify({"authenticated": False}), 200

    return jsonify({
        "authenticated": True,
        **account_response(user),
    }), 200


@auth_bp.route("/api/logout", methods=["POST"])
@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "You have been signed out."}), 200
