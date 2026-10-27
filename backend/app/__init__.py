import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory

from .extensions import db, migrate

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"


def create_app():
    load_dotenv(BACKEND_DIR / ".env")

    app = Flask(__name__)
    secret_key = os.getenv("SECRET_KEY")

    if not secret_key and os.getenv("RENDER"):
        raise RuntimeError("SECRET_KEY must be configured in the Render environment.")

    database_url = os.getenv("DATABASE_URL")
    if database_url:
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    else:
        database_url = f"sqlite:///{(BACKEND_DIR / 'vertex_local.db').as_posix()}"

    app.config.update(
        SECRET_KEY=secret_key or "local-development-only-change-me",
        MAX_CONTENT_LENGTH=1024 * 1024,
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE=os.getenv("SESSION_COOKIE_SAMESITE", "Lax"),
        SESSION_COOKIE_SECURE=os.getenv(
            "SESSION_COOKIE_SECURE",
            "true" if os.getenv("RENDER") else "false",
        ).lower() == "true",
    )

    db.init_app(app)
    migrate.init_app(app, db)

    from . import models
    from .routes.auth import auth_bp
    from .routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    @app.after_request
    def add_security_headers(response):
        if request.path.startswith("/api/admin/"):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Pragma"] = "no-cache"

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' https: data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self'; connect-src 'self'; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        )
        return response

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify({"error": "Request body is too large."}), 413

    @app.route("/")
    def home():
        return redirect("/frontend/", code=302)

    @app.route("/frontend/")
    def frontend_home():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/frontend/<path:filename>")
    def frontend_files(filename):
        return send_from_directory(FRONTEND_DIR, filename)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    return app

