from flask import Flask, jsonify, send_from_directory
from pathlib import Path

BASE_DIR = Path(**file**).resolve().parent.parent

app = Flask(**name**)

@app.route("/")
def home():
return send_from_directory(BASE_DIR, "index.html")

@app.route("/css/[path:filename](path:filename)")
def css_files(filename):
return send_from_directory(BASE_DIR / "css", filename)

@app.route("/js/[path:filename](path:filename)")
def js_files(filename):
return send_from_directory(BASE_DIR / "js", filename)

@app.route("/api/status")
def status():
return jsonify({
"name": "Vertex",
"status": "online",
"message": "Vertex backend is running!"
})

if **name** == "**main**":
app.run(host="127.0.0.1", port=5000, debug=True)
