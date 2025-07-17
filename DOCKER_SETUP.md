# Docker Setup Instructions

This project has been containerized for easy setup and deployment.

## Quick Start

### Option 1: Using Docker Compose (Recommended)
```bash
# Build and run the application
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### Option 2: Using Docker directly
```bash
# Build the image
docker build -t crane-simulation .

# Run the container
docker run -p 8080:8080 crane-simulation
```

## Accessing the Application

Once the container is running:
- **Web Application**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **WebSocket**: ws://localhost:8080/ws

## What's Included

The Docker setup includes:
- **Frontend**: Vue.js application with Three.js 3D visualization
- **Backend**: Node.js WebSocket server with crane simulation
- **Shared Libraries**: Common types and utilities
- **Static File Serving**: Backend serves the built frontend files

## System Requirements

- Docker (version 20.10 or higher)
- Docker Compose (version 1.29 or higher)
- 2GB available RAM
- Port 8080 available

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Or for direct Docker
docker logs <container_id>
```

### Port already in use
```bash
# Stop existing containers
docker-compose down

# Or use a different port
docker run -p 3000:8080 crane-simulation
```

### Build fails
```bash
# Clean build
docker-compose down --rmi all
docker-compose up --build
```

## Development Notes

This Docker setup builds the entire application from source and serves both the frontend and backend from a single container on port 8080. The frontend is built as static files and served by the backend server.