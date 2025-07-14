import uWS from 'uWebSockets.js';

interface WebSocketData {
  id: string;
  connectedAt: Date;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const app = uWS.App();

// WebSocket endpoint
app.ws<WebSocketData>('/ws', {
  // Handle incoming messages
  message: (ws, message, isBinary) => {
    try {
      // Convert ArrayBuffer to string
      const messageStr = Buffer.from(message).toString();
      console.log(
        `[WS] Received message from ${ws.getUserData().id}: ${messageStr}`
      );

      // Parse JSON message
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(messageStr);
      } catch (e) {
        // If not JSON, just echo the raw message
        ws.send(message, isBinary);
        return;
      }

      // Echo the message back as JSON
      const response = {
        type: 'echo',
        data: parsedMessage,
        timestamp: new Date().toISOString(),
        clientId: ws.getUserData().id,
      };

      ws.send(JSON.stringify(response), false);
    } catch (error) {
      console.error('[WS] Error handling message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
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

    console.log(`[WS] Client connected: ${clientId}`);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'welcome',
        clientId,
        message: 'Connected to WebSocket server',
        timestamp: new Date().toISOString(),
      }),
      false
    );
  },

  // Handle disconnections
  close: (ws, code, message) => {
    const clientId = ws.getUserData().id;
    console.log(
      `[WS] Client disconnected: ${clientId}, code: ${code}, message: ${Buffer.from(message).toString()}`
    );
  },

  // Configuration
  compression: uWS.DEDICATED_COMPRESSOR_3KB,
  maxPayloadLength: 16 * 1024 * 1024, // 16MB
  idleTimeout: 120, // 2 minutes
});

// HTTP endpoint for health check
app.get('/health', (res, req) => {
  res
    .writeStatus('200 OK')
    .writeHeader('Content-Type', 'application/json')
    .end(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })
    );
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
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  process.exit(0);
});
