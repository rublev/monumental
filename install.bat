@echo off
echo 🏗️  Crane Simulation - Installation Script (Windows)
echo ==========================================

REM Check for Docker
echo 🔍 Checking for Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop from:
    echo    https://docs.docker.com/desktop/install/windows/
    echo    Then run this script again.
    pause
    exit /b 1
)
echo ✅ Docker found

REM Check for Docker Compose
echo 🔍 Checking for Docker Compose...
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    docker-compose --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Compose not found. Please install Docker Desktop which includes Docker Compose.
        pause
        exit /b 1
    )
)
echo ✅ Docker Compose found

REM Check if Docker is running
echo 🔍 Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)
echo ✅ Docker is running

REM Stop any existing containers
echo 🔍 Stopping any existing containers...
docker compose down 2>nul

REM Build and run the application
echo 🚀 Building and starting the Crane Simulation...
echo    This may take a few minutes on first run...

REM Try docker compose first, fall back to docker-compose
docker compose up --build
if %errorlevel% neq 0 (
    docker-compose up --build
)

echo.
echo 🎉 Installation complete!
echo    Access the application at: http://localhost:8080
echo    Press Ctrl+C to stop the application
pause