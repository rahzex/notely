# Notely

A lightweight, self-hosted note-taking application built with Flask and SQLite. Features folder organization and a rich text editor powered by Quill.js.

## Features

- **Rich text editing** — powered by Quill.js
- **Folder organization** — group notes into folders for easy navigation
- **Dark / Light mode** — built-in theme toggle, preference saved to local storage
- **Cross-platform setup** — native file/folder pickers on macOS, Linux, and Windows
- **RESTful API** — full CRUD endpoints for notes and folders

## Screenshots

| Light Mode | Dark Mode |
|------------|-----------|
| <img src="screenshots/light.png" alt="Light mode"> | <img src="screenshots/dark.png" alt="Dark mode"> |

## Tech Stack

- **Backend:** Python 3, Flask
- **Database:** SQLite
- **Frontend:** HTML/CSS/JS, Quill.js
- **Libraries:** BeautifulSoup4, Requests

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

```bash
git clone <your-repo-url> notely
cd notely
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running

```bash
./run.sh
```

Or manually:

```bash
source .venv/bin/activate
python app.py
```

The server starts on `http://localhost:5100`.

### First-Time Setup

On first launch you'll need to configure a database path. Open `http://localhost:5100` and use the configuration UI to select or create a `.db` file. The app uses a native file picker dialog (platform-specific on macOS/Linux/Windows).

## API Reference

### Notes

| Method | Endpoint                | Description          |
|--------|-------------------------|----------------------|
| GET    | `/api/notes`            | List all notes       |
| POST   | `/api/notes`            | Create a note        |
| PUT    | `/api/notes/<id>`       | Update a note        |
| DELETE | `/api/notes/<id>`       | Delete a note        |

### Folders

| Method | Endpoint                | Description          |
|--------|-------------------------|----------------------|
| GET    | `/api/folders`          | List all folders     |
| POST   | `/api/folders`          | Create a folder      |
| PUT    | `/api/folders/<id>`     | Update a folder      |
| DELETE | `/api/folders/<id>`     | Delete a folder      |

### Configuration

| Method | Endpoint            | Description                     |
|--------|---------------------|---------------------------------|
| GET    | `/api/config`       | Get current DB configuration    |
| POST   | `/api/config`       | Set database path               |
| POST   | `/api/config/browse`| Open native file picker dialog  |

### Note Payload

```json
{
  "title": "My Note",
  "content": "<p>Your note content here</p>",
  "folder_id": 1
}
```

## Database Schema

**notes**

| Column       | Type      | Default           |
|-------------|-----------|-------------------|
| id          | INTEGER   | AUTOINCREMENT     |
| title       | TEXT      |                   |
| content     | TEXT      | `''`              |
| folder_id   | INTEGER   | NULL              |
| preview     | TEXT      | `'[]'` (JSON)     |
| created_at  | TIMESTAMP | CURRENT_TIMESTAMP |

**folders**

| Column    | Type    | Default |
|-----------|---------|---------|
| id        | INTEGER |         |
| name      | TEXT    |         |
| parent_id | INTEGER |         |

## Configuration

Database path is stored in `db_config.json`. To change it, use the `/api/config` endpoints or the setup UI.

## License

MIT

---

*Built with [Claude Code](https://claude.ai/code) using Qwen 3.6 Plus via [OpenRouter](https://openrouter.ai/).*
