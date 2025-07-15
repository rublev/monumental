// WebSocket connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// WebSocket message types
export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  clientId?: string
}

// Incoming message types from server
export interface WelcomeMessage extends WebSocketMessage {
  type: 'welcome'
  clientId: string
  message: string
  timestamp: string
}

export interface EchoMessage extends WebSocketMessage {
  type: 'echo'
  data: any
  timestamp: string
  clientId: string
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error'
  message: string
}

// Outgoing message types to server
export interface ClientMessage extends WebSocketMessage {
  type: 'message'
  data: any
}

export interface PingMessage extends WebSocketMessage {
  type: 'ping'
  timestamp: string
}

// Union types for type safety
export type IncomingMessage = WelcomeMessage | EchoMessage | ErrorMessage
export type OutgoingMessage = ClientMessage | PingMessage

// WebSocket configuration
export interface WebSocketConfig {
  url: string
  reconnectAttempts: number
  reconnectInterval: number
  heartbeatInterval: number
  connectionTimeout: number
}

// Connection metrics
export interface ConnectionMetrics {
  connectedAt?: Date
  lastMessageAt?: Date
  messagesSent: number
  messagesReceived: number
  reconnectAttempts: number
  latency?: number
}

// WebSocket service interface (framework-agnostic)
export interface WebSocketService {
  // Connection state getters
  getConnectionState: () => ConnectionState
  isConnected: () => boolean
  getClientId: () => string | null
  getMetrics: () => ConnectionMetrics

  // Connection methods
  connect: () => Promise<void>
  disconnect: () => void

  // Messaging
  sendMessage: (data: any, options?: { queue?: boolean }) => boolean
  getQueueStatus: () => { length: number; maxSize: number; isFull: boolean }
  clearQueue: () => number

  // Event handlers
  onMessage: (callback: (message: IncomingMessage) => void) => void
  onStateChange: (callback: (state: ConnectionState) => void) => void
  onError: (callback: (error: Event | Error) => void) => void
}

// Default WebSocket configuration
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  url: 'ws://localhost:8080/ws',
  reconnectAttempts: 5,
  reconnectInterval: 1000, // Start with 1 second
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 5000, // 5 seconds
}