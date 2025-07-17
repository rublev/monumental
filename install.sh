#!/bin/bash

# Crane Simulation - Installation Script
# This script checks for Docker and installs it if needed, then runs the application

set -e

echo "🏗️  Crane Simulation - Installation Script"
echo "=========================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Check for Docker
echo "🔍 Checking for Docker..."
if ! command_exists docker; then
    echo "❌ Docker not found. Installing Docker..."
    
    OS=$(detect_os)
    case $OS in
        "linux")
            echo "📦 Installing Docker on Linux..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            sudo usermod -aG docker $USER
            echo "⚠️  You may need to log out and back in for Docker permissions to take effect"
            ;;
        "macos")
            echo "📦 Please install Docker Desktop from: https://docs.docker.com/desktop/install/mac/"
            echo "   Then run this script again."
            exit 1
            ;;
        "windows")
            echo "📦 Please install Docker Desktop from: https://docs.docker.com/desktop/install/windows/"
            echo "   Then run this script again."
            exit 1
            ;;
        *)
            echo "❌ Unsupported OS. Please install Docker manually from: https://docs.docker.com/get-docker/"
            exit 1
            ;;
    esac
else
    echo "✅ Docker found"
fi

# Check for Docker Compose
echo "🔍 Checking for Docker Compose..."
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose not found"
    echo "📦 Installing Docker Compose..."
    
    # Try to install docker-compose
    if command_exists curl; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    else
        echo "❌ curl not found. Please install Docker Compose manually from: https://docs.docker.com/compose/install/"
        exit 1
    fi
else
    echo "✅ Docker Compose found"
fi

# Verify Docker is running
echo "🔍 Checking if Docker is running..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and run this script again."
    exit 1
fi

echo "✅ Docker is running"

# Check if port 8080 is available
echo "🔍 Checking if port 8080 is available..."
if command_exists lsof && lsof -i :8080 >/dev/null 2>&1; then
    echo "⚠️  Port 8080 is in use. Stopping any existing containers..."
    docker compose down 2>/dev/null || true
fi

# Build and run the application in development mode
echo "🚀 Building and starting the Crane Simulation (Development Mode)..."
echo "   This may take a few minutes on first run..."

# Try docker compose first, fall back to docker-compose
if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.dev.yml up --build
else
    docker-compose -f docker-compose.dev.yml up --build
fi

echo ""
echo "🎉 Installation complete!"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:8080"
echo "   Press Ctrl+C to stop the application"