#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== Notely Setup ==="

# Check Python is available (3.10+)
if ! command -v python3 &>/dev/null; then
  echo "python3 is not installed. Please install Python 3.10+ first."
  exit 1
fi

PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Python version: $PY_VER"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

# Install / upgrade dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

echo ""
echo "=== Starting Notely ==="
python app.py
