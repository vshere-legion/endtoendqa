#!/bin/bash

echo "🎭 Playwright + Cucumber Framework Setup"
echo "========================================"
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium

if [ $? -ne 0 ]; then
    echo "❌ Failed to install browsers"
    exit 1
fi

echo "✅ Browsers installed"
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.js

echo "✅ Scripts are executable"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (please update with your values)"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env with your environment URLs"
echo "  2. Run: npm run test:dry-run"
echo "  3. Run: npm test"
echo ""
echo "Documentation:"
echo "  - GETTING_STARTED.md - Complete guide"
echo "  - README.md - Quick reference"
echo ""
echo "Happy Testing! 🚀"
