import sqlite3
import json
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
DB = "notes.db"


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB)
    db.execute("""CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        url TEXT DEFAULT '',
        preview TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    # Drop the old url column if it exists (sqlite migration)
    try:
        db.execute("ALTER TABLE notes DROP COLUMN url")
        db.commit()
    except Exception:
        pass  # column already removed or doesn't exist
    db.commit()
    db.close()


def fetch_preview(url):
    """Fetch Open Graph meta tags from a URL."""
    try:
        resp = requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        def og(name):
            tag = soup.find("meta", property=f"og:{name}") or soup.find("meta", attrs={"name": name})
            return tag["content"].strip() if tag and tag.get("content") else ""

        yt_id = None
        if "youtube.com" in url or "youtu.be" in url:
            if "youtu.be" in url:
                yt_id = url.split("youtu.be/")[-1].split("?")[0]
            else:
                from urllib.parse import parse_qs, urlparse
                yt_id = parse_qs(urlparse(url).query).get("v", [None])[0]

        return {
            "url": url,
            "title": og("title") or (soup.title.string.strip() if soup.title else ""),
            "description": og("description"),
            "image": og("image"),
            "site_name": og("site_name"),
            "type": og("type"),
            "youtube_id": yt_id,
        }
    except Exception as e:
        return {"url": url, "error": str(e), "title": "", "description": "", "image": "", "site_name": "", "type": "", "youtube_id": None}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/notes", methods=["GET"])
def list_notes():
    db = get_db()
    rows = db.execute("SELECT * FROM notes ORDER BY created_at DESC").fetchall()
    return jsonify([{**r} for r in rows])


import re
URL_RE = re.compile(r'https?://[^\s<>"\)]+')


def extract_urls(text):
    """Find unique URLs in text."""
    if not text:
        return []
    return list(dict.fromkeys(URL_RE.findall(text)))  # unique, preserve order


def fetch_previews_for_urls(urls):
    """Fetch previews for a list of URLs, return JSON array."""
    previews = []
    for u in urls:
        previews.append(fetch_preview(u))
    return json.dumps(previews)


def start_background_preview(note_id, urls):
    """Non-blocking preview fetch — updates DB after results arrive."""
    def _fetch():
        with app.app_context():
            previews = []
            for u in urls:
                try:
                    previews.append(fetch_preview(u))
                except Exception:
                    continue
            if previews:
                db = sqlite3.connect(DB)
                preview_json = json.dumps(previews)
                db.execute(
                    "UPDATE notes SET preview=? WHERE id=?",
                    (preview_json, note_id),
                )
                db.commit()
                db.close()
    import threading
    t = threading.Thread(target=_fetch, daemon=True)
    t.start()


@app.route("/api/notes", methods=["POST"])
def create_note():
    data = request.json
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    urls = extract_urls(content)
    urls.extend([u for u in (data.get("urls") or []) if u and u not in urls])

    db = get_db()
    cur = db.execute("INSERT INTO notes (title, content, preview) VALUES (?, ?, ?)",
                     (title, content, "[]"))
    db.commit()
    note_id = cur.lastrowid
    db_row = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()

    if urls:
        start_background_preview(note_id, urls)

    return jsonify({**db_row}), 201


@app.route("/api/notes/<int:note_id>", methods=["PUT"])
def update_note(note_id):
    data = request.json
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    urls = extract_urls(content)
    urls.extend([u for u in (data.get("urls") or []) if u and u not in urls])

    db = get_db()
    existing = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not existing:
        return jsonify({"error": "not found"}), 404

    current_preview = existing["preview"]
    db.execute("UPDATE notes SET title=?, content=?, preview=? WHERE id=?",
               (title, content, current_preview, note_id))
    db.commit()
    row = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()

    if urls:
        start_background_preview(note_id, urls)

    return jsonify({**row})


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    db = get_db()
    db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    db.commit()
    return jsonify({"ok": True})


@app.route("/api/preview", methods=["POST"])
def preview_url():
    """Fetch preview without saving a note."""
    data = request.json
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "no url"}), 400
    return jsonify(fetch_preview(url))


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5100)
