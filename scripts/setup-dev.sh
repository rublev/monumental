#!/bin/bash

# Setup development environment for the crane demo project

echo "🏗️  Setting up Crane Demo development environment..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Node.js version is sufficient
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required"
    exit 1
fi

echo "✅ Prerequisites checked"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared package first
echo "🔨 Building shared package..."
pnpm --filter @monumental/shared build

# Run initial typecheck
echo "🔍 Running type checks..."
pnpm typecheck

echo "✨ Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  pnpm dev          - Start both frontend and backend in dev mode"
echo "  pnpm dev:frontend - Start only the frontend"
echo "  pnpm dev:backend  - Start only the backend"
echo "  pnpm build        - Build all packages"
echo "  pnpm typecheck    - Run TypeScript type checking"
echo "  pnpm lint         - Run linting"
echo ""