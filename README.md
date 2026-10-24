# Vertex Market

Vertex Market is a storefront with a Flask API, SQLAlchemy database, account registration and login, and an administrator dashboard.

## Local setup

1. Install Python 3.10 or newer.
2. Open a terminal in the `backend` folder.
3. Create a virtual environment with `python -m venv .venv`.
4. Activate it with `.venv\\Scripts\\activate` on Windows or `source .venv/bin/activate` on macOS/Linux.
5. Install dependencies with `pip install -r requirements.txt`.
6. Copy `.env.example` to `.env` and set a long random `SECRET_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
7. Run `flask --app app db upgrade`.
8. Start the server with `python app.py`.
9. Open `http://127.0.0.1:5500/`.

## Render deployment

Set the Render Web Service configuration to:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`

Add these environment variables in Render:

- `DATABASE_URL`: URL for a persistent PostgreSQL database
- `SECRET_KEY`: a long, random secret value
- `ADMIN_EMAIL`: administrator email address
- `ADMIN_PASSWORD`: a strong, unique administrator password
- `ADMIN_NAME`: optional administrator display name

The service redirects `/` to the storefront. The frontend is served from `/frontend/` so its API requests use the same origin. The `/health` endpoint returns a simple health status.

Use a persistent PostgreSQL database in production. The local SQLite database is intended for development only.

## Current limitations

- Public login validates the password and returns the account summary, but does not create a persistent user session.
- Account email verification has not been implemented.
- The storefront cart and liked products are temporary browser state and are not saved to an account.
