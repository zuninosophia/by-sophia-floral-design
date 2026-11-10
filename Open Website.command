#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Alternatively open index.html directly in your browser."
  read -r -p "Press Return to close."
  exit 1
fi
python3 server.py --open
