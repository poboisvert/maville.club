#!/bin/bash
# Setup script for info-neige-MTL

echo "Setting up virtual environment..."

# Recreate venv if missing or broken (e.g. Python was upgraded/removed)
recreate_venv=false
if [ ! -d "venv" ]; then
    recreate_venv=true
elif ! venv/bin/python3 -c "import sys" 2>/dev/null; then
    recreate_venv=true
elif ! venv/bin/pip --version 2>/dev/null; then
    recreate_venv=true
fi

if [ "$recreate_venv" = true ]; then
    if [ -d "venv" ]; then
        echo "Removing broken virtual environment..."
        rm -rf venv
    fi
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Upgrade pip and install dependencies (use venv binaries directly)
echo "Upgrading pip..."
venv/bin/python3 -m pip install --upgrade pip

echo "Installing dependencies..."
venv/bin/python3 -m pip install -r requirements.txt

echo ""
echo "✓ Setup complete!"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source venv/bin/activate"
echo ""
echo "Then run scripts with:"
echo "  python3 set_all_streets_degage.py --dry-run"
echo ""
echo "To start the API server, run:"
echo "  python3 app.py"
echo ""

