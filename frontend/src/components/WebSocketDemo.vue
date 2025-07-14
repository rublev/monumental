<template>
  <div class="websocket-demo">
    <h2>WebSocket Integration Demo</h2>

    <div class="connection-status" :class="{ connected: isConnected }">
      {{ isConnected ? 'Connected' : 'Disconnected' }}
    </div>

    <div class="controls">
      <button @click="connect" :disabled="isConnected">Connect</button>
      <button @click="disconnect" :disabled="!isConnected">Disconnect</button>
    </div>

    <div class="crane-state" v-if="craneState">
      <h3>Crane State</h3>
      <pre>{{ JSON.stringify(craneState, null, 2) }}</pre>
    </div>

    <div class="message-log">
      <h3>Message Log</h3>
      <div class="messages">
        <div v-for="(msg, idx) in messages" :key="idx" class="message">
          <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
          <span class="type">{{ msg.type }}</span>
          <span class="data">{{ msg.data }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { CraneState, StateUpdateMessage, MessageType } from '@monumental/shared'
import { WS_CONFIG } from '@monumental/shared'

interface LogMessage {
  timestamp: number
  type: string
  data: string
}

const isConnected = ref(false)
const craneState = ref<CraneState | null>(null)
const messages = ref<LogMessage[]>([])
let ws: WebSocket | null = null

function connect() {
  if (ws) return

  ws = new WebSocket(`ws://localhost:${WS_CONFIG.port}`)

  ws.onopen = () => {
    isConnected.value = true
    logMessage('connection', 'Connected to WebSocket server')
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)

      if (msg.type === 'state_update') {
        const stateMsg = msg as StateUpdateMessage
        craneState.value = stateMsg.state
        logMessage('state_update', `Crane position updated`)
      } else {
        logMessage(msg.type, JSON.stringify(msg))
      }
    } catch (error) {
      logMessage('error', `Failed to parse message: ${error}`)
    }
  }

  ws.onerror = (error) => {
    logMessage('error', `WebSocket error: ${error}`)
  }

  ws.onclose = () => {
    isConnected.value = false
    ws = null
    logMessage('connection', 'Disconnected from WebSocket server')
  }
}

function disconnect() {
  if (ws) {
    ws.close()
    ws = null
  }
}

function logMessage(type: string, data: string) {
  messages.value.unshift({
    timestamp: Date.now(),
    type,
    data,
  })

  // Keep only last 50 messages
  if (messages.value.length > 50) {
    messages.value = messages.value.slice(0, 50)
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${time}.${ms}`
}

onUnmounted(() => {
  disconnect()
})
</script>

<style scoped>
.websocket-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
}

.connection-status {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 4px;
  background: #ff4444;
  color: white;
  font-weight: bold;
  margin-bottom: 20px;
}

.connection-status.connected {
  background: #44ff44;
  color: #333;
}

.controls {
  margin-bottom: 30px;
}

.controls button {
  margin-right: 10px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}

.controls button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.crane-state {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.crane-state h3 {
  margin-top: 0;
}

.crane-state pre {
  margin: 0;
  font-size: 12px;
}

.message-log {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
}

.message-log h3 {
  margin-top: 0;
}

.messages {
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.message {
  display: flex;
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.timestamp {
  color: #666;
  min-width: 100px;
}

.type {
  color: #007bff;
  font-weight: bold;
  min-width: 120px;
}

.data {
  flex: 1;
  color: #333;
  word-break: break-word;
}
</style>
