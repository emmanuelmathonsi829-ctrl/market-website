from flask import Flask, jsonify, send_from_directory
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = Flask(__name__)

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/css/<path:filename>")
def css_files(filename):
    return send_from_directory(FRONTEND_DIR / "css", filename)

@app.route("/js/<path:filename>")
def js_files(filename):
    return send_from_directory(FRONTEND_DIR / "js", filename)

@app.route("/api/status")
def status():
    return jsonify({
        "name": "Vertex",
        "status": "online",
        "message": "Vertex backend is running successfully!"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)