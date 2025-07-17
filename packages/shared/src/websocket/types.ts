/**
 * WebSocket connection and messaging types
 */

// Connection state
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// Message types
export enum MessageType {
  STATE_UPDATE = 'state_update',
  WELCOME = 'welcome',
  MESSAGE = 'message',
}

// Base message interface
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  sequence: number;
  clientId?: string;
}

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  connectionTimeout?: number;
}

// Connection metrics
export interface ConnectionMetrics {
  connectionCount: number;
  lastConnected: number | null;
  reconnectAttempts: number;
  averageLatency: number;
  messagesReceived: number;
  messagesSent: number;
  lastMessageAt: number | null;
  connectedAt: number | null;
}

// Message unions
export type IncomingMessage = BaseMessage;
export type OutgoingMessage = BaseMessage;

// Default configuration
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  url: 'ws://localhost:8080/ws',
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
};
