#!/bin/bash
# CRE Dashboard — local sandbox preview
# Double-click this file to run the updated dashboard on your Mac,
# completely separate from the live Railway site and its data.
cd "$(dirname "$0")"
clear
echo "=============================================="
echo "  CRE Dashboard — sandbox preview"
echo "=============================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed yet (one-time setup)."
  echo "Opening the download page — install the LTS version,"
  echo "then double-click this file again."
  open "https://nodejs.org/en/download"
  echo
  read -n 1 -s -r -p "Press any key to close this window."
  exit 1
fi

echo "Node $(node --version) found."

if [ ! -d node_modules ]; then
  echo
  echo "Installing dependencies (first run only, takes a few minutes)..."
  npm install --no-audit --no-fund || {
    echo
    read -n 1 -s -r -p "npm install failed — press any key to close."
    exit 1
  }
fi

export PORT=4174
echo
echo "Starting sandbox at http://localhost:4174"
echo "The sandbox has its own separate data — nothing you do here"
echo "touches the live dashboard or its data."
echo
echo "To preview with your real data: sign in, open Version History"
echo "from the account menu, and use 'Import from file' with the"
echo "latest cre-backup JSON from your Downloads folder."
echo
echo "Press Ctrl+C in this window to stop the sandbox."
echo
( sleep 4 && open "http://localhost:4174" ) &
npm run dev
