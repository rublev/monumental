import { ref, computed, readonly } from 'vue'
import type { Ref } from 'vue'
import type {
  ConnectionState,
  WebSocketConfig,
  ConnectionMetrics,
  IncomingMessage,
  OutgoingMessage,
} from '@monumental/shared/websocket'
import { MessageType } from '@monumental/shared/websocket'
import { DEFAULT_WEBSOCKET_CONFIG } from '@monumental/shared'

// Vue-specific return type for the composable
export interface UseWebSocketReturn {
  // Connection state
  connectionState: Readonly<Ref<ConnectionState>>
  isConnected: Readonly<Ref<boolean>>
  clientId: Readonly<Ref<string | null>>

  // Metrics
  metrics: Readonly<Ref<ConnectionMetrics>>

  // Connection methods
  connect: () => Promise<void>
  disconnect: () => void

  // Messaging
  sendMessage: (data: any, options?: { queue?: boolean }) => boolean
  sendRawMessage: (message: any) => boolean
  getQueueStatus: () => { length: number; maxSize: number; isFull: boolean }
  clearQueue: () => number

  // Event handlers
  onMessage: (callback: (message: IncomingMessage) => void) => void
  onStateChange: (callback: (state: ConnectionState) => void) => void
  onError: (callback: (error: Event | Error) => void) => void
}

const DEFAULT_CONFIG: WebSocketConfig = {
  ...DEFAULT_WEBSOCKET_CONFIG,
  url: import.meta.env.VITE_WS_URL || DEFAULT_WEBSOCKET_CONFIG.url,
}

export function useWebSocket(config: Partial<WebSocketConfig> = {}): UseWebSocketReturn {
  const wsConfig = { ...DEFAULT_CONFIG, ...config }

  // Reactive state
  const connectionState = ref<ConnectionState>('disconnected')
  const clientId = ref<string | null>(null)
  const socket = ref<WebSocket | null>(null)

  // Metrics
  const metrics = ref<ConnectionMetrics>({
    connectionCount: 0,
    lastConnected: null,
    reconnectAttempts: 0,
    averageLatency: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastMessageAt: null,
    connectedAt: null,
  })

  // Message queue for offline messages
  const messageQueue = ref<OutgoingMessage[]>([])
  const maxQueueSize = 100

  // Event handlers
  const messageHandlers: Array<(message: IncomingMessage) => void> = []
  const stateChangeHandlers: Array<(state: ConnectionState) => void> = []
  const errorHandlers: Array<(error: Event | Error) => void> = []

  // Reconnection management
  let reconnectTimeoutId: number | null = null
  let heartbeatIntervalId: number | null = null
  let connectionTimeoutId: number | null = null
  let currentReconnectInterval = wsConfig.reconnectInterval

  // Computed properties
  const isConnected = computed(() => connectionState.value === 'connected')

  // Update connection state and notify handlers
  function updateConnectionState(newState: ConnectionState) {
    if (connectionState.value !== newState) {
      connectionState.value = newState
      console.log(`[WebSocket] State changed to: ${newState}`)

      // Notify state change handlers
      stateChangeHandlers.forEach((handler) => {
        try {
          handler(newState)
        } catch (error) {
          console.error('[WebSocket] Error in state change handler:', error)
        }
      })
    }
  }

  // Handle incoming messages
  function handleMessage(event: MessageEvent) {
    try {
      const message: IncomingMessage = JSON.parse(event.data)

      // Update metrics
      metrics.value.messagesReceived++
      metrics.value.lastMessageAt = Date.now()

      // Handle specific message types
      if (message.type === 'welcome' && message.clientId) {
        clientId.value = message.clientId
        console.log(`[WebSocket] Received client ID: ${message.clientId}`)
      }

      console.log('[WebSocket] Received message:', message)

      // Notify message handlers
      messageHandlers.forEach((handler) => {
        try {
          handler(message)
        } catch (error) {
          console.error('[WebSocket] Error in message handler:', error)
        }
      })
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error)
      notifyErrorHandlers(new Error('Failed to parse WebSocket message'))
    }
  }

  // Handle WebSocket errors
  function handleError(event: Event) {
    console.error('[WebSocket] Connection error:', event)
    updateConnectionState('error')
    notifyErrorHandlers(event)
  }

  // Handle connection open
  function handleOpen() {
    console.log('[WebSocket] Connection established')
    updateConnectionState('connected')

    // Reset reconnection state
    metrics.value.reconnectAttempts = 0
    currentReconnectInterval = wsConfig.reconnectInterval
    metrics.value.connectedAt = Date.now()

    // Clear connection timeout
    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId)
      connectionTimeoutId = null
    }

    // Start heartbeat
    startHeartbeat()

    // Process queued messages
    processMessageQueue()
  }

  // Handle connection close
  function handleClose(event: CloseEvent) {
    console.log(`[WebSocket] Connection closed: ${event.code} - ${event.reason}`)

    // Clean up
    stopHeartbeat()
    clientId.value = null

    if (connectionState.value !== 'disconnected') {
      // Attempt reconnection if not manually disconnected
      scheduleReconnect()
    }
  }

  // Notify error handlers
  function notifyErrorHandlers(error: Event | Error) {
    errorHandlers.forEach((handler) => {
      try {
        handler(error)
      } catch (err) {
        console.error('[WebSocket] Error in error handler:', err)
      }
    })
  }

  // Start heartbeat to keep connection alive
  function startHeartbeat() {
    stopHeartbeat() // Clear any existing heartbeat

    heartbeatIntervalId = window.setInterval(() => {
      if (isConnected.value) {
        sendRawMessage({ type: 'ping', timestamp: new Date().toISOString() })
      }
    }, wsConfig.heartbeatInterval)
  }

  // Stop heartbeat
  function stopHeartbeat() {
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId)
      heartbeatIntervalId = null
    }
  }

  // Schedule reconnection with exponential backoff
  function scheduleReconnect() {
    if (metrics.value.reconnectAttempts >= (wsConfig.reconnectAttempts || 5)) {
      console.log('[WebSocket] Max reconnection attempts reached')
      updateConnectionState('error')
      return
    }

    updateConnectionState('reconnecting')
    metrics.value.reconnectAttempts++

    console.log(
      `[WebSocket] Scheduling reconnect in ${currentReconnectInterval}ms (attempt ${metrics.value.reconnectAttempts}/${wsConfig.reconnectAttempts})`,
    )

    reconnectTimeoutId = window.setTimeout(() => {
      connect()
      // Exponential backoff with jitter
      currentReconnectInterval = Math.min(
        (currentReconnectInterval || 1000) * 2 + Math.random() * 1000,
        30000, // Cap at 30 seconds
      )
    }, currentReconnectInterval)
  }

  // Connect to WebSocket server
  async function connect(): Promise<void> {
    // Don't connect if already connected or connecting
    if (connectionState.value === 'connected' || connectionState.value === 'connecting') {
      return
    }

    // Clean up any existing connection
    cleanup()

    updateConnectionState('connecting')
    console.log(`[WebSocket] Connecting to ${wsConfig.url}`)

    try {
      socket.value = new WebSocket(wsConfig.url)

      // Set up event listeners
      socket.value.addEventListener('open', handleOpen)
      socket.value.addEventListener('message', handleMessage)
      socket.value.addEventListener('error', handleError)
      socket.value.addEventListener('close', handleClose)

      // Set connection timeout
      connectionTimeoutId = window.setTimeout(() => {
        if (connectionState.value === 'connecting') {
          console.error('[WebSocket] Connection timeout')
          disconnect()
          notifyErrorHandlers(new Error('Connection timeout'))
        }
      }, wsConfig.connectionTimeout)
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket:', error)
      updateConnectionState('error')
      notifyErrorHandlers(error as Error)
    }
  }

  // Disconnect from WebSocket server
  function disconnect() {
    console.log('[WebSocket] Disconnecting')
    updateConnectionState('disconnected')

    // Clear reconnection timeout
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    cleanup()
  }

  // Clean up WebSocket connection and timers
  function cleanup() {
    if (socket.value) {
      // Remove event listeners
      socket.value.removeEventListener('open', handleOpen)
      socket.value.removeEventListener('message', handleMessage)
      socket.value.removeEventListener('error', handleError)
      socket.value.removeEventListener('close', handleClose)

      // Close connection
      if (
        socket.value.readyState === WebSocket.OPEN ||
        socket.value.readyState === WebSocket.CONNECTING
      ) {
        socket.value.close()
      }

      socket.value = null
    }

    // Clear timers
    stopHeartbeat()
    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId)
      connectionTimeoutId = null
    }
  }

  // Process queued messages when connection is established
  function processMessageQueue() {
    if (!isConnected.value || messageQueue.value.length === 0) {
      return
    }

    console.log(`[WebSocket] Processing ${messageQueue.value.length} queued messages`)

    // Send all queued messages
    const messages = [...messageQueue.value]
    messageQueue.value = []

    messages.forEach((message) => {
      sendMessageDirect(message)
    })
  }

  // Queue message for later sending
  function queueMessage(message: OutgoingMessage): boolean {
    if (messageQueue.value.length >= maxQueueSize) {
      console.warn('[WebSocket] Message queue full, dropping oldest message')
      messageQueue.value.shift() // Remove oldest message
    }

    messageQueue.value.push(message)
    console.log(`[WebSocket] Queued message (${messageQueue.value.length}/${maxQueueSize})`)
    return true
  }

  // Send message directly without queueing
  function sendMessageDirect(message: OutgoingMessage): boolean {
    if (!isConnected.value || !socket.value) {
      return false
    }

    try {
      socket.value.send(JSON.stringify(message))
      metrics.value.messagesSent++
      console.log('[WebSocket] Sent message:', message)
      return true
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error)
      notifyErrorHandlers(error as Error)
      return false
    }
  }

  // Send message to server (with queueing support)
  function sendMessage(data: any, options: { queue?: boolean } = { queue: true }): boolean {
    const message: OutgoingMessage = {
      type: MessageType.MESSAGE,
      timestamp: Date.now(),
      sequence: Date.now(),
      ...data // Include the actual data
    }

    // If connected, send immediately
    if (isConnected.value) {
      return sendMessageDirect(message)
    }

    // If not connected and queueing is enabled, queue the message
    if (options.queue) {
      return queueMessage(message)
    }

    console.warn('[WebSocket] Cannot send message: not connected and queueing disabled')
    return false
  }

  // Send raw message directly (for custom message types)
  function sendRawMessage(message: any): boolean {
    return sendMessageDirect(message)
  }

  // Get queue status
  function getQueueStatus() {
    return {
      length: messageQueue.value.length,
      maxSize: maxQueueSize,
      isFull: messageQueue.value.length >= maxQueueSize,
    }
  }

  // Clear message queue
  function clearQueue() {
    const cleared = messageQueue.value.length
    messageQueue.value = []
    console.log(`[WebSocket] Cleared ${cleared} queued messages`)
    return cleared
  }

  // Register message handler
  function onMessage(callback: (message: IncomingMessage) => void) {
    messageHandlers.push(callback)
  }

  // Register state change handler
  function onStateChange(callback: (state: ConnectionState) => void) {
    stateChangeHandlers.push(callback)
  }

  // Register error handler
  function onError(callback: (error: Event | Error) => void) {
    errorHandlers.push(callback)
  }

  // Note: Manual cleanup is preferred for composables
  // Components should call disconnect() in their own onUnmounted hooks if needed

  return {
    // State
    connectionState: readonly(connectionState),
    isConnected: readonly(isConnected),
    clientId: readonly(clientId),
    metrics: readonly(metrics),

    // Methods
    connect,
    disconnect,
    sendMessage,
    sendRawMessage,
    getQueueStatus,
    clearQueue,

    // Event handlers
    onMessage,
    onStateChange,
    onError,
  }
}
