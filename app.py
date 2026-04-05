import os
import platform
import subprocess
import sqlite3
import json
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
CONFIG_PATH = Path(__file__).parent / "db_config.json"


def load_config():
    """Load DB path from config file."""
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH) as f:
                return json.load(f).get("db_path")
        except json.JSONDecodeError:
            return None
    return None


def save_config(db_path):
    """Persist DB path to config file."""
    with open(CONFIG_PATH, "w") as f:
        json.dump({"db_path": db_path}, f)


DB = load_config()  # None on first launch


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.before_request
def check_db_config():
    """Block non-config requests if DB path is not configured."""
    if not DB and request.path != "/" and not request.path.startswith("/api/config") and not request.path.startswith("/static/"):
        return jsonify({"error": "Database not configured"}), 503


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
        folder_id INTEGER,
        url TEXT DEFAULT '',
        preview TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY, name TEXT NOT NULL, parent_id INTEGER)")
    # Drop the old url column if it exists (sqlite migration)
    try:
        db.execute("ALTER TABLE notes DROP COLUMN url")
        db.commit()
    except Exception:
        pass  # column already removed or doesn't exist
    # Add folder_id if it doesn't exist (existing databases)
    try:
        db.execute("ALTER TABLE notes ADD COLUMN folder_id INTEGER")
        db.commit()
    except Exception:
        pass  # column already exists
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


@app.route("/api/folders", methods=["GET"])
def list_folders():
    db = get_db()
    rows = db.execute("SELECT * FROM folders ORDER BY name").fetchall()
    return jsonify([{**r} for r in rows])


@app.route("/api/folders", methods=["POST"])
def create_folder():
    data = request.json
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    db = get_db()
    cur = db.execute("INSERT INTO folders (name) VALUES (?)", (name,))
    db.commit()
    row = db.execute("SELECT * FROM folders WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({**row}), 201


@app.route("/api/folders/<int:folder_id>", methods=["PUT"])
def update_folder(folder_id):
    data = request.json
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    db = get_db()
    db.execute("UPDATE folders SET name=? WHERE id=?", (name, folder_id))
    db.commit()
    row = db.execute("SELECT * FROM folders WHERE id = ?", (folder_id,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify({**row})


@app.route("/api/folders/<int:folder_id>", methods=["DELETE"])
def delete_folder(folder_id):
    db = get_db()
    db.execute("UPDATE notes SET folder_id=NULL WHERE folder_id=?", (folder_id,))
    db.execute("DELETE FROM folders WHERE id=?", (folder_id,))
    db.commit()
    return jsonify({"ok": True})


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
            if previews and DB:
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
    folder_id = data.get("folder_id")

    urls = extract_urls(content)
    urls.extend([u for u in (data.get("urls") or []) if u and u not in urls])

    db = get_db()
    cur = db.execute("INSERT INTO notes (title, content, folder_id, preview) VALUES (?, ?, ?, ?)",
                     (title, content, folder_id, "[]"))
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
    folder_id = data.get("folder_id")

    urls = extract_urls(content)
    urls.extend([u for u in (data.get("urls") or []) if u and u not in urls])

    db = get_db()
    existing = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not existing:
        return jsonify({"error": "not found"}), 404

    current_preview = existing["preview"]
    db.execute("UPDATE notes SET title=?, content=?, folder_id=?, preview=? WHERE id=?",
               (title, content, folder_id, current_preview, note_id))
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


@app.route("/api/preview", methods=["GET", "POST"])
def preview_url():
    """
    Fetch link preview for Editor.js LinkTool.
    LinkTool may send POST { "url": "..." } or GET ?url=...
    Expects: { "success": 1, "meta": { "title", "description", "image": { "url" }, "favicon" } }
    """
    if request.method == "GET":
        url = request.args.get("url", "").strip()
    else:
        data = request.json or {}
        url = data.get("url", "").strip()
    if not url:
        return jsonify({"success": 0}), 400

    og = fetch_preview(url)

    if og.get("error"):
        # Return a minimal success with just the URL so LinkTool still embeds it
        return jsonify({"success": 1, "meta": {"title": url, "description": "", "image": {"url": ""}, "favicon": ""}})

    response_data = {
        "success": 1,
        "meta": {
            "title": og.get("title", ""),
            "description": og.get("description", ""),
            "image": {"url": og.get("image", "")},
            "favicon": "",
            "youtube_id": og.get("youtube_id"),
        }
    }
    # Include youtube_id so we can render embeds if needed
    if og.get("youtube_id"):
        response_data["meta"]["youtube_id"] = og["youtube_id"]

    return jsonify(response_data)


def validate_existing_db(path):
    """Check that an existing file is a valid SQLite DB with our tables."""
    try:
        db = sqlite3.connect(path)
        tables = [r[0] for r in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        db.close()
        if "notes" not in tables and "folders" not in tables:
            return "Database file exists but does not contain Notely tables."
        return None
    except sqlite3.DatabaseError:
        return "File exists but is not a valid SQLite database."
    except Exception as e:
        return str(e)


def _pick_file_mac():
    """macOS: native file picker (shows all files, .db is checked after)."""
    result = subprocess.run([
        "osascript", "-e", '''
            tell application "System Events"
                activate
                set result to choose file with prompt "Select a database file (.db)"
                return POSIX path of result
            end tell
        '''
    ], capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        return None  # cancelled
    return result.stdout.strip()


def _pick_folder_mac():
    """macOS: native folder picker."""
    result = subprocess.run([
        "osascript", "-e", '''
            tell application "System Events"
                activate
                set result to choose folder with prompt "Select database folder:"
                return POSIX path of result
            end tell
        '''
    ], capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def _pick_file_linux():
    """Linux: zenity > kdialog > python3/tkinter."""
    # Try zenity
    try:
        result = subprocess.run([
            "zenity", "--file-selection",
            "--title", "Select a database file (.db)",
            "--file-filter", "DB files|*.db"
        ], capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (FileNotFoundError, Exception):
        pass
    # Try kdialog
    try:
        result = subprocess.run([
            "kdialog", "--title", "Select a database file (.db)",
            "--getopenfilename", ".", "*.db"
        ], capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (FileNotFoundError, Exception):
        pass
    return None


def _pick_folder_linux():
    """Linux: zenity > kdialog directory picker."""
    # Try zenity
    try:
        result = subprocess.run([
            "zenity", "--file-selection", "--directory",
            "--title", "Select database folder:"
        ], capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (FileNotFoundError, Exception):
        pass
    # Try kdialog
    try:
        result = subprocess.run([
            "kdialog", "--title", "Select database folder:",
            "--getexistingdirectory", "/"
        ], capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (FileNotFoundError, Exception):
        pass
    return None


def _pick_file_windows():
    """Windows: PowerShell OpenFileDialog."""
    script = r"""
Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Filter = 'DB files (*.db)|*.db'
$dlg.Title = 'Select a database file (.db)'
$dlg.InitialDirectory = [Environment]::GetFolderPath('MyDocuments')
if ($dlg.ShowDialog() -eq 'OK') { $dlg.FileName }
"""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", script],
        capture_output=True, text=True, timeout=120, encoding="utf-8"
    )
    if result.stdout and result.returncode == 0:
        return result.stdout.strip()
    return None


def _pick_folder_windows():
    """Windows: PowerShell FolderBrowserDialog."""
    script = r"""
Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = 'Select database folder:'
$dlg.RootFolder = 'MyComputer'
if ($dlg.ShowDialog() -eq 'OK') { $dlg.SelectedPath }
"""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", script],
        capture_output=True, text=True, timeout=120, encoding="utf-8"
    )
    if result.stdout and result.returncode == 0:
        return result.stdout.strip()
    return None


@app.route("/api/config/browse", methods=["POST"])
def browse_folder():
    """Open a cross-platform native file/folder picker dialog."""
    data = request.json or {}
    mode = data.get("mode", "file")  # "file" or "folder"
    system = platform.system()

    try:
        if system == "Darwin":
            # macOS - use osascript
            if mode == "file":
                path = _pick_file_mac()
            else:
                path = _pick_folder_mac()
        elif system == "Linux":
            if mode == "file":
                path = _pick_file_linux()
            else:
                path = _pick_folder_linux()
        elif system == "Windows":
            if mode == "file":
                path = _pick_file_windows()
            else:
                path = _pick_folder_windows()
        else:
            return jsonify({"error": f"Unsupported platform: {system}"}), 500

        if path is None:
            return jsonify({"cancelled": True})

        if mode == "file" and not path.endswith(".db"):
            return jsonify({"error": "Please select a .db file."})

        return jsonify({"path": path})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Dialog timed out."}), 500
    except FileNotFoundError:
        return jsonify({"error": "No native file dialog tool found on this system."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/config", methods=["GET"])
def get_config():
    if DB:
        return jsonify({"configured": True, "db_path": DB})
    return jsonify({"configured": False})


@app.route("/api/config", methods=["POST"])
def set_config():
    global DB
    data = request.json
    new_path = data.get("db_path", "").strip()

    if not new_path:
        return jsonify({"error": "Database path is required."}), 400

    if not os.path.isabs(new_path):
        return jsonify({"error": "Path must be absolute."}), 400

    parent = os.path.dirname(new_path)
    if parent and not os.path.exists(parent):
        return jsonify({"error": f"Parent directory does not exist: {parent}"}), 400

    if not os.access(parent, os.W_OK) and parent:
        return jsonify({"error": f"No write permission for directory: {parent}"}), 400

    if os.path.isfile(new_path):
        err = validate_existing_db(new_path)
        if err:
            return jsonify({"error": err}), 400
        # Ensure schema exists in case we switched to a DB without our tables
        try:
            db = sqlite3.connect(new_path)
            db.execute("SELECT 1 FROM notes LIMIT 1")
            db.close()
        except sqlite3.OperationalError:
            # Tables missing, recreate them
            pass
        # Set path, then run init to ensure tables exist
        save_config(new_path)
        DB = new_path
        init_db()
    else:
        # Create a new DB at this path
        save_config(new_path)
        DB = new_path
        init_db()

    return jsonify({"ok": True, "db_path": DB})


if DB:
    init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5100)
