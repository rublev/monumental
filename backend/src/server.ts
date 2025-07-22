import uWS from 'uWebSockets.js';
import { CraneController } from './crane/CraneController.js';
import { MessageType } from '@monumental/shared/websocket';
import type {
  ManualControlCommand,
  StartCycleCommand,
  BackendToFrontendMessage,
} from '@monumental/shared/websocket';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface WebSocketData {
  id: string;
  connectedAt: Date;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const app = uWS.App();
const craneController = new CraneController();

// Store active connections for broadcasting
const activeConnections = new Set<uWS.WebSocket<WebSocketData>>();

// Set up crane controller to broadcast to all connected clients
craneController.setBroadcastCallback((message: BackendToFrontendMessage) => {
  const messageStr = JSON.stringify(message);
  activeConnections.forEach((ws) => {
    if (ws.getBufferedAmount() === 0) {
      ws.send(messageStr, false);
    }
  });
});

// WebSocket endpoint
app.ws<WebSocketData>('/ws', {
  // Handle incoming messages
  message: (ws, message) => {
    try {
      // Convert ArrayBuffer to string
      const messageStr = Buffer.from(message).toString();
      console.log(
        `[WS] Received message from ${ws.getUserData().id}: ${messageStr}`
      );

      // Parse JSON message
      let parsedMessage: { type: string; [key: string]: any };
      try {
        parsedMessage = JSON.parse(messageStr);
      } catch (e) {
        console.error('[WS] Invalid JSON received:', e);
        ws.send(
          JSON.stringify({
            type: MessageType.ERROR,
            timestamp: Date.now(),
            sequence: 0,
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON format',
            },
          }),
          false
        );
        return;
      }

      // Handle different message types
      switch (parsedMessage.type) {
        case MessageType.MANUAL_CONTROL:
          craneController.handleManualControl(
            parsedMessage as ManualControlCommand
          );
          break;

        case MessageType.START_CYCLE:
          craneController.startCycle(parsedMessage as StartCycleCommand);
          break;

        case MessageType.STOP_CYCLE:
          craneController.stopCycle();
          break;

        case MessageType.EMERGENCY_STOP:
          craneController.emergencyStop();
          break;

        case MessageType.STATE_REQUEST:
          // Send current state immediately
          const currentState = craneController.getCurrentState();
          ws.send(
            JSON.stringify({
              type: MessageType.STATE_UPDATE,
              timestamp: currentState.timestamp,
              sequence: currentState.sequence,
              state: {
                swing: currentState.swing,
                lift: currentState.lift,
                elbow: currentState.elbow,
                wrist: currentState.wrist,
                gripper: currentState.gripper,
                timestamp: currentState.timestamp,
                sequence: currentState.sequence,
                isMoving: currentState.isMoving,
                hasTarget: currentState.hasTarget,
                endEffectorPosition: currentState.endEffectorPosition,
                isGripperOpen: currentState.gripper > 0.5,
              },
              cycleProgress: currentState.cycleProgress,
            }),
            false
          );
          break;

        default:
          console.warn('[WS] Unknown message type:', parsedMessage.type);
          ws.send(
            JSON.stringify({
              type: MessageType.ERROR,
              timestamp: Date.now(),
              sequence: 0,
              error: {
                code: 'UNKNOWN_MESSAGE_TYPE',
                message: `Unknown message type: ${parsedMessage.type}`,
              },
            }),
            false
          );
      }
    } catch (error) {
      console.error('[WS] Error handling message:', error);
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          timestamp: Date.now(),
          sequence: 0,
          error: {
            code: 'PROCESSING_ERROR',
            message: 'Failed to process message',
          },
        }),
        false
      );
    }
  },

  // Handle new connections
  open: (ws) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const userData: WebSocketData = {
      id: clientId,
      connectedAt: new Date(),
    };

    ws.getUserData().id = clientId;
    ws.getUserData().connectedAt = userData.connectedAt;

    // Add to active connections
    activeConnections.add(ws);

    console.log(`[WS] Client connected: ${clientId}`);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: MessageType.WELCOME,
        timestamp: Date.now(),
        sequence: 0,
        clientId,
        message: 'Connected to Crane WebSocket server',
      }),
      false
    );

    // Send initial crane state
    const currentState = craneController.getCurrentState();
    ws.send(
      JSON.stringify({
        type: MessageType.STATE_UPDATE,
        timestamp: currentState.timestamp,
        sequence: currentState.sequence,
        state: {
          swing: currentState.swing,
          lift: currentState.lift,
          elbow: currentState.elbow,
          wrist: currentState.wrist,
          gripper: currentState.gripper,
          timestamp: currentState.timestamp,
          sequence: currentState.sequence,
          isMoving: currentState.isMoving,
          hasTarget: currentState.hasTarget,
          endEffectorPosition: currentState.endEffectorPosition,
          isGripperOpen: currentState.gripper > 0.5,
        },
        cycleProgress: currentState.cycleProgress,
      }),
      false
    );
  },

  // Handle disconnections
  close: (ws, code, message) => {
    const clientId = ws.getUserData().id;

    // Remove from active connections
    activeConnections.delete(ws);

    console.log(
      `[WS] Client disconnected: ${clientId}, code: ${code}, message: ${Buffer.from(message).toString()}`
    );
  },

  // Configuration
  compression: uWS.DEDICATED_COMPRESSOR_3KB,
  maxPayloadLength: 16 * 1024 * 1024, // 16MB
  idleTimeout: 120, // 2 minutes
});

// Serve static frontend files
const frontendPath = join(process.cwd(), 'frontend/dist');

app.get('/*', (res, req) => {
  const url = req.getUrl();

  // Health check endpoint
  if (url === '/health') {
    res
      .writeStatus('200 OK')
      .writeHeader('Content-Type', 'application/json')
      .end(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
        })
      );
    return;
  }

  // Try to serve static files
  let filePath = join(frontendPath, url === '/' ? 'index.html' : url);

  if (!existsSync(filePath)) {
    // For SPA routing, fallback to index.html
    filePath = join(frontendPath, 'index.html');
  }

  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath);
      const ext = filePath.split('.').pop()?.toLowerCase();

      let contentType = 'text/plain';
      switch (ext) {
        case 'html':
          contentType = 'text/html';
          break;
        case 'js':
          contentType = 'application/javascript';
          break;
        case 'css':
          contentType = 'text/css';
          break;
        case 'json':
          contentType = 'application/json';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'svg':
          contentType = 'image/svg+xml';
          break;
        case 'ico':
          contentType = 'image/x-icon';
          break;
      }

      res
        .writeStatus('200 OK')
        .writeHeader('Content-Type', contentType)
        .end(content);
    } catch (error) {
      res
        .writeStatus('500 Internal Server Error')
        .writeHeader('Content-Type', 'text/plain')
        .end('Internal Server Error');
    }
  } else {
    res
      .writeStatus('404 Not Found')
      .writeHeader('Content-Type', 'text/plain')
      .end('Not Found');
  }
});

// Start the server
app.listen(PORT, (token) => {
  if (token) {
    console.log(`🚀 WebSocket server listening on port ${PORT}`);
    console.log(`   - WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`   - Health check: http://localhost:${PORT}/health`);
  } else {
    console.error(`Failed to listen on port ${PORT}`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  craneController.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  craneController.destroy();
  process.exit(0);
});
