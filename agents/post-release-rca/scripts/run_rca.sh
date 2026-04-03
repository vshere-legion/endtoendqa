#!/bin/bash
# =============================================================================
# RCA Agent Runner
# Quick-start script to run the RCA analysis from Claude Code CLI.
#
# Usage:
#   ./run_rca.sh
#
# This will launch Claude Code in the project directory, which will
# automatically pick up CLAUDE.md and guide you through the RCA process.
#
# Prerequisites:
#   - Claude Code CLI installed and authenticated
#   - gh CLI authenticated to your GitHub Enterprise instance
#   - Python 3 with openpyxl: pip3 install openpyxl
#   - Atlassian MCP configured for legiontech.atlassian.net
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure output directories exist
mkdir -p rca_results

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v claude &> /dev/null; then
    echo "ERROR: Claude Code CLI not found. Install from: https://claude.ai/claude-code"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "WARNING: gh CLI not found. PR analysis will be limited."
    echo "Install from: https://cli.github.com/"
fi

if ! python3 -c "import openpyxl" 2>/dev/null; then
    echo "Installing openpyxl for Excel report generation..."
    pip3 install openpyxl
fi

echo "All checks passed. Starting RCA Agent..."
echo ""
echo "Tell the agent something like:"
echo '  "Do RCA of Summer release for Platform"'
echo '  "Do RCA of Winter release for all projects"'
echo ""

# Launch Claude Code — it will pick up CLAUDE.md automatically
claude
