# 4-DOF Robotic Crane Simulation

## Quick Start (Docker - Recommended)

> **⚠️ Platform Support**: This Docker setup has been tested on **macOS (Apple Silicon)** only. It may work on Linux and Windows, but is currently untested on those platforms.

### Automatic Installation (Recommended)

```bash
# For Linux/Mac:
./install.sh

# For Windows:
install.bat
```

The installation script will:

1. Check for Docker and install it if needed (Linux only)
2. Verify Docker is running
3. Build and start the application in development mode
4. Open the app at http://localhost:5173 (with backend on :8080)

### Manual Installation

If you prefer to install manually:

#### Prerequisites

- **Docker**: Install from https://docs.docker.com/get-docker/
- **Docker Compose**: Usually included with Docker Desktop

#### Installation & Run

```bash
# 1. Clone/download this repository
# 2. Navigate to the project directory
cd demo_trimmed

# 3. Build and run with Docker Compose (Development Mode)
docker compose -f docker-compose.dev.yml up --build

# Or if you have an older Docker version:
docker-compose -f docker-compose.dev.yml up --build
```

**Access the application at: http://localhost:5173**

That's it! No need to install Node.js, pnpm, or any other dependencies.

## Alternative: Manual Development Setup

If you prefer to run without Docker:

### Prerequisites

- Node.js 24.3.0+ (or use `nvm use` to automatically use the correct version)
- pnpm package manager

### Installation

```bash
# Use the correct Node.js version (if using nvm)
nvm use

# Install dependencies
pnpm install

# Run all services in development mode
pnpm dev

# Or run individually:
pnpm dev:frontend  # Frontend only (port 5173)
pnpm dev:backend   # Backend only (port 8080)
```

## Overview

This application demonstrates a complete robotic control system with:

- **Real-time telemetry streaming** from backend to frontend via WebSocket
- **Dual control modes**: Manual actuator control and inverse kinematics via 3D coordinates
- **Physics-based motion simulation** with realistic speed and acceleration constraints
- **Responsive 3D visualization** using WebGL for smooth crane state representation

## Architecture

This is a TypeScript monorepo with three main packages optimized for performance and maintainability:

- **Frontend**: Vue 3 + Three.js for intuitive UI and 3D visualization
- **Backend**: High-performance WebSocket server with crane control logic
- **Shared**: Common types, configurations, and message definitions

## Technologies & Design Decisions

### Frontend

- **Vue 3** with Composition API for reactive UI state management
- **Three.js** for WebGL-based 3D crane rendering and scene management
- **TypeScript** for type safety and developer experience
- **Tailwind CSS** for rapid UI development
- **shadcn-vue** for accessible UI components
- **Vite** for fast development and optimized builds
- **Custom composables** for WebSocket communication and crane state management

### Backend

- **Node.js** with TypeScript for consistent language across stack
- **uWebSockets.js** chosen for high-performance WebSocket communication (significantly faster than standard ws library)
- **Custom CraneController** implementing realistic motion physics and constraints
- **Minimal architecture** focusing on simplicity and performance

### Shared Package

- **Centralized type definitions** for WebSocket messages and crane state
- **Shared configuration** for scene parameters, crane dimensions, and constraints
- **Single source of truth** for domain logic to prevent duplication

## Troubleshooting

### Docker Issues

```bash
# If container won't start, check logs:
docker compose logs

# If port 8080 is in use:
docker compose down
# Or modify docker-compose.yml to use different port

# Clean build:
docker compose down --rmi all
docker compose up --build
```

### System Requirements

- **Docker**: Version 20.10 or higher
- **Available Memory**: 2GB minimum
- **Ports**: 5173 and 8080 must be available

### Known Issues

- **uWebSockets.js compatibility**: This project uses uWebSockets.js for high-performance WebSocket communication, which requires glibc (not musl). The Docker setup uses `node:22-slim` instead of Alpine to ensure compatibility.

## Project Structure

```
├── frontend/          # Vue 3 + Three.js client application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── composables/   # WebSocket and crane state logic
│   │   ├── views/         # Main crane simulation view
│   │   └── utils/         # Three.js utilities and helpers
├── backend/           # Node.js WebSocket server
│   ├── src/
│   │   ├── crane/         # CraneController and physics simulation
│   │   ├── server.ts      # WebSocket server and message handling
│   │   └── utils/         # Server utilities
├── packages/shared/   # Common types and configurations
│   └── src/
│       ├── websocket/     # Message type definitions
│       ├── crane/         # Crane state and configuration types
│       └── config/        # Scene and physics constants
└── package.json       # Root workspace configuration
```
