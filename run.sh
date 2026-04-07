#!/bin/bash
set -e

REPO_URL="https://github.com/rahzex/notely.git"
APP_DIR="$HOME/notely"

# --- Clone if needed ---
if [ -f "$APP_DIR/app.py" ]; then
  echo "Notely is already installed at $APP_DIR"
  cd "$APP_DIR"
else
  echo "=== Cloning Notely ==="
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

cat << 'BANNER'
                        /$$               /$$
                      | $$              | $$
 /$$$$$$$   /$$$$$$  /$$$$$$    /$$$$$$ | $$ /$$   /$$
| $$__  $$ /$$__  $$|_  $$_/   /$$__  $$| $$| $$  | $$
| $$  \ $$| $$  \ $$  | $$    | $$$$$$$$| $$| $$  | $$
| $$  | $$| $$  | $$  | $$ /$$| $$_____/| $$| $$  | $$
| $$  | $$|  $$$$$$/  |  $$$$/|  $$$$$$$| $$|  $$$$$$$
|__/  |__/ \______/    \___/   \_______/|__/ \____  $$
                                             /$$  | $$
                                            |  $$$$$$/
                                             \______/
BANNER
echo ""
echo "  Lightweight, self-hosted note-taking app"
echo "  Flask + SQLite + Editor.js / Quill"
echo ""
echo "=== Notely Setup ==="

# Check Python (macOS uses python3, some Linux distros use python)
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  echo "python3 is not installed. Please install Python 3.8+ first."
  exit 1
fi

PY_VER=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Python version: $PY_VER"

# Check if the server is already running
if curl -s http://localhost:5100/api/config > /dev/null 2>&1; then
  echo ""
  echo "Notely is already running at http://localhost:5100"
  echo "Open it in your browser, or press Ctrl+C to stop."
  # Portable infinite sleep loop
  while true; do sleep 86400; done
  exit 0
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  $PYTHON -m venv .venv
fi

source .venv/bin/activate

# Install / upgrade dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

echo ""
echo "=== Starting Notely ==="
echo "Server will be available at http://localhost:5100"
$PYTHON app.py
