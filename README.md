
<img width="1536" height="1024" alt="ChatGPT Image Apr 4, 2026 at 09_59_31 PM" src="https://github.com/user-attachments/assets/b32f256f-88d8-4320-9572-7e30eb340ed1" />


A lightweight, self-hosted note-taking application built with Flask and SQLite. Features folder organization and a rich text editor powered by Quill.js.

## Features

- **Rich text editing** — powered by Quill.js
- **Folder organization** — group notes into folders for easy navigation
- **Dark / Light mode** — built-in theme toggle, preference saved to local storage
- **Cross-platform setup** — native file/folder pickers on macOS, Linux, and Windows
- **RESTful API** — full CRUD endpoints for notes and folders

## Screenshots

<img width="882" height="581" alt="Screenshot 2026-04-04 at 9 39 11 PM" src="https://github.com/user-attachments/assets/98cc82ad-12fb-4a3d-aaca-0c4636edf75f" />

<img width="1440" height="666" alt="Screenshot 2026-04-04 at 9 30 52 PM" src="https://github.com/user-attachments/assets/0e31d0bc-c582-4f98-b1c4-7b739723bfb5" />

<img width="1440" height="818" alt="Screenshot 2026-04-04 at 9 34 22 PM" src="https://github.com/user-attachments/assets/7e117546-6cfe-4678-a74d-037ca8331e17" />


<img width="1440" height="712" alt="Screenshot 2026-04-04 at 9 30 40 PM" src="https://github.com/user-attachments/assets/91edee7e-4809-4a92-b1c9-fbe528d17d4a" />




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

*Built with [Claude Code](https://claude.ai/code) using Qwen 3.6 Plus via [OpenRouter](https://openrouter.ai/qwen/qwen3.6-plus:free).*
