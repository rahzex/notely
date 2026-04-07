
<img width="1536" height="1024" alt="notely logo" src="https://github.com/user-attachments/assets/b32f256f-88d8-4320-9572-7e30eb340ed1" />


A lightweight, self-hosted note-taking application built with Flask and SQLite. Features folder organization, dual rich text editors, and automatic URL previews.

## Features

- **Dual editor support** — choose between Editor.js (block-style, Notion-like) or Quill (classic rich text) for each note
- **Editor picker** — pick your editor when creating a new note, or set a default in Settings
- **Auto-detect content format** — opening an existing note automatically loads the correct editor
- **Rich text editing** — headings, lists, tables, code blocks, checklists, embeds, and more
- **URL link previews** — automatic Open Graph meta tag fetching for links (including YouTube embeds)
- **Folder organization** — group notes into folders with expand/collapse, rename, and delete
- **Search** — filter notes by title in the sidebar
- **Dark / Light mode** — built-in theme toggle, preference saved to local storage
- **Collapsible sidebar** — toggle the sidebar for more editing space
- **Cross-platform setup** — native file/folder pickers on macOS, Linux, and Windows
- **Auto-save** — notes are automatically saved as you type
- **RESTful API** — full CRUD endpoints for notes, folders, and link previews

## Screenshots

<img width="882" height="581" alt="Screenshot2" src="https://github.com/user-attachments/assets/98cc82ad-12fb-4a3d-aaca-0c4636edf75f" />

<img width="977" height="639" alt="Screenshot3" src="https://github.com/user-attachments/assets/61da1585-c211-4dc9-999b-b7a19bec68cb" />

<img width="978" height="567" alt="Screenshot4" src="https://github.com/user-attachments/assets/9ed8ff8e-a052-4be6-99c3-acd36814cd02" />

<img width="922" height="578" alt="Screenshot5" src="https://github.com/user-attachments/assets/599c69c3-360f-4510-9a52-1641badea7df" />

<img width="1440" height="666" alt="Screenshot6" src="https://github.com/user-attachments/assets/0e31d0bc-c582-4f98-b1c4-7b739723bfb5" />

<img width="1440" height="818" alt="Screenshot7" src="https://github.com/user-attachments/assets/7e31d0bc-c582-4f98-b1c4-7b739723bfb5" />

<img width="1440" height="816" alt="Screenshot 2026-04-04 at 11 03 09 PM" src="https://github.com/user-attachments/assets/2bca7684-89ac-490e-861d-e4d2da6ee64f" />

<img width="1440" height="712" alt="Screenshot8" src="https://github.com/user-attachments/assets/91edee7e-4809-4a92-b1c9-fbe528d17d4a" />

<img width="1440" height="819" alt="Screenshot9" src="https://github.com/user-attachments/assets/752395de-31f1-448b-8eff-78e9783a2572" />

<img width="1440" height="816" alt="Screenshot10" src="https://github.com/user-attachments/assets/4c824adc-2360-4436-a635-1c4fca3a2beb" />

<img width="1440" height="820" alt="Screenshot11" src="https://github.com/user-attachments/assets/dfb9d8c2-d6cf-45e5-a203-22ab2b119cab" />

<img width="1440" height="818" alt="Screenshot12" src="https://github.com/user-attachments/assets/5aa9e595-72b1-45b1-bd5a-dd51d8e239fd" />

## Tech Stack

- **Backend:** Python 3, Flask
- **Database:** SQLite
- **Frontend:** HTML/CSS/JS, Editor.js, Quill.js
- **Libraries:** BeautifulSoup4, Requests

## Getting Started

### Quick Setup (one command)

```bash
curl -fsSL https://raw.githubusercontent.com/rahzex/notely/main/run.sh | bash
```

This downloads and runs the setup script, which creates a virtual environment, installs dependencies, and starts the server.

### Prerequisites

- Python 3.8+
- pip

### Manual Installation

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

### Link Previews

| Method | Endpoint            | Description                          |
|--------|---------------------|--------------------------------------|
| GET    | `/api/preview?url=` | Fetch Open Graph preview for a URL   |
| POST   | `/api/preview`      | Fetch Open Graph preview (JSON body) |

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

Database path is stored in `db_config.json`. To change it, use the `/api/config` endpoints or the Settings UI.

## License

MIT

---

*Built with [Free Code](https://github.com/paoloanzn/free-code) using Qwen 3.6 Plus via [OpenRouter](https://openrouter.ai/qwen/qwen3.6-plus:free).*
