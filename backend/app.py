import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory

from extensions import db, migrate

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)

secret_key = os.getenv("SECRET_KEY")
if not secret_key and os.getenv("RENDER"):
    raise RuntimeError("SECRET_KEY must be configured in the Render environment.")

app.config.update(
    SECRET_KEY=secret_key or "local-development-only-change-me",
    MAX_CONTENT_LENGTH=16 * 1024,
    SQLALCHEMY_DATABASE_URI=os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(BASE_DIR / 'vertex_local.db').as_posix()}",
    ).replace("postgres://", "postgresql://", 1),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=os.getenv("SESSION_COOKIE_SAMESITE", "Lax"),
    SESSION_COOKIE_SECURE=os.getenv(
        "SESSION_COOKIE_SECURE", "true" if os.getenv("RENDER") else "false"
    ).lower() == "true",
)

db.init_app(app)
migrate.init_app(app, db)

import models
from routes.auth import auth_bp

app.register_blueprint(auth_bp)


@app.after_request
def add_security_headers(response):
    if request.path.startswith("/api/admin/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
    )
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "script-src 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com data:; "
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
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        port=int(os.getenv("PORT", "5500")),
    )
