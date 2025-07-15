<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { CraneState, StateUpdateMessage } from '@monumental/shared'
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

  ws = new WebSocket(`ws://localhost:${WS_CONFIG.port}/ws`)

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

<template>
  <div class="p-5 max-w-4xl mx-auto">
    <h2 class="mb-5">WebSocket Integration Demo</h2>

    <div class="inline-block px-4 py-2 rounded font-bold mb-5"
      :class="isConnected ? 'bg-green-400 text-gray-800' : 'bg-red-400 text-white'">
      {{ isConnected ? 'Connected' : 'Disconnected' }}
    </div>

    <div class="mb-8">
      <button @click="connect" :disabled="isConnected"
        class="mr-2.5 px-4 py-2 border-none rounded text-white cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed bg-blue-600 enabled:hover:bg-blue-700">
        Connect
      </button>
      <button @click="disconnect" :disabled="!isConnected"
        class="mr-2.5 px-4 py-2 border-none rounded text-white cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed bg-blue-600 enabled:hover:bg-blue-700">
        Disconnect
      </button>
    </div>

    <div v-if="craneState" class="bg-gray-100 p-4 rounded-lg mb-8">
      <h3 class="mt-0">Crane State</h3>
      <pre class="m-0 text-xs">{{ JSON.stringify(craneState, null, 2) }}</pre>
    </div>

    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="mt-0">Message Log</h3>
      <div class="max-h-80 overflow-y-auto font-mono text-xs">
        <div v-for="(msg, idx) in messages" :key="idx" class="flex gap-2.5 py-1 border-b border-gray-200">
          <span class="text-gray-600 min-w-[100px]">{{ formatTime(msg.timestamp) }}</span>
          <span class="text-blue-600 font-bold min-w-[120px]">{{ msg.type }}</span>
          <span class="flex-1 text-gray-800 break-words">{{ msg.data }}</span>
        </div>
      </div>
    </div>
  </div>
</template>