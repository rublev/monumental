import uWS from 'uWebSockets.js';
import type {
  BaseMessage,
  MessageType,
  StateUpdateMessage,
  CraneState,
} from '@monumental/shared';
import { WS_CONFIG } from '@monumental/shared';

// Simple echo server proof of concept
const app = uWS.App();

// Track connected clients
const clients = new Set<uWS.WebSocket<any>>();

// Mock crane state
let craneState: CraneState = {
  swing: 0,
  lift: 0,
  elbow: 0,
  wrist: 0,
  gripper: 0,
  timestamp: Date.now(),
  sequence: 0,
  isMoving: false,
  hasTarget: false,
  endEffectorPosition: { x: 0, y: 0, z: 0 },
  isGripperOpen: true,
  objects: [],
};

app.ws('/*', {
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 120,

  open: (ws) => {
    console.log('Client connected');
    clients.add(ws);

    // Send initial state
    const welcomeMessage: StateUpdateMessage = {
      type: 'state_update' as MessageType.STATE_UPDATE,
      timestamp: Date.now(),
      sequence: ++craneState.sequence,
      state: craneState,
      objects: [],
    };

    ws.send(JSON.stringify(welcomeMessage));
  },

  message: (ws, message, isBinary) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message);
      const msg = JSON.parse(text) as BaseMessage;

      console.log('Received message:', msg.type);

      // Echo the message back to all clients
      const response = JSON.stringify({
        ...msg,
        timestamp: Date.now(),
        echo: true,
      });

      // Broadcast to all connected clients
      clients.forEach((client) => {
        client.send(response);
      });
    } catch (error) {
      console.error('Message parsing error:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now(),
        })
      );
    }
  },

  drain: (ws) => {
    console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
  },

  close: (ws, code, message) => {
    console.log('Client disconnected');
    clients.delete(ws);
  },
});

// Simulate state updates
setInterval(() => {
  // Update mock crane state
  craneState.swing = Math.sin(Date.now() / 1000) * 45;
  craneState.elbow = Math.cos(Date.now() / 1500) * 30;
  craneState.timestamp = Date.now();

  const stateUpdate: StateUpdateMessage = {
    type: 'state_update' as MessageType.STATE_UPDATE,
    timestamp: Date.now(),
    sequence: ++craneState.sequence,
    state: craneState,
    objects: [],
  };

  const message = JSON.stringify(stateUpdate);

  // Broadcast to all clients
  clients.forEach((client) => {
    client.send(message);
  });
}, 100); // 10Hz update rate

app.listen(WS_CONFIG.port, (token) => {
  if (token) {
    console.log(`WebSocket echo server listening on port ${WS_CONFIG.port}`);
  } else {
    console.log('Failed to listen on port ' + WS_CONFIG.port);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...');
  process.exit(0);
});
