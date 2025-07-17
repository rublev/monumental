<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import WebSocketStatus from '@/components/WebSocketStatus.vue'

const {
  connectionState,
  isConnected,
  clientId,
  metrics,
  connect,
  disconnect,
  sendMessage,
  getQueueStatus,
  clearQueue,
  onMessage,
  onStateChange,
  onError,
} = useWebSocket()

const queueStatus = ref(getQueueStatus())
const isExpanded = ref(false)

// Test message handler
onMessage((message) => {
  console.log('Received message in component:', message)
})

// State change handler
onStateChange((state) => {
  console.log('Connection state changed:', state)
  // Update queue status when state changes
  queueStatus.value = getQueueStatus()
})

// Error handler
onError((error) => {
  console.error('WebSocket error in component:', error)
})

function testSendMessage() {
  const success = sendMessage({
    test: 'Hello from Vue!',
    timestamp: new Date().toISOString(),
  })

  // Update queue status after sending
  queueStatus.value = getQueueStatus()

  if (!success) {
    console.warn('Failed to send test message')
  }
}

function testQueueMessage() {
  // Send message that will be queued if not connected
  const success = sendMessage(
    {
      test: 'Queued message test',
      timestamp: new Date().toISOString(),
    },
    { queue: true },
  )

  queueStatus.value = getQueueStatus()
  console.log('Queued message, queue status:', queueStatus.value)
}

function handleClearQueue() {
  const cleared = clearQueue()
  queueStatus.value = getQueueStatus()
  console.log(`Cleared ${cleared} messages from queue`)
}

// Auto-connect on mount for testing
onMounted(() => {
  connect()
})

// Clean up on unmount
onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="w-full">
    <div class="bg-white rounded-lg shadow-md">
      <!-- Header with toggle button -->
      <div
        class="p-4 cursor-pointer flex items-center justify-between rounded-t-lg"
        @click="isExpanded = !isExpanded"
      >
        <h2 class="text-xl font-bold text-gray-900">WebSocket Test</h2>
        <div class="flex items-center space-x-2">
          <!-- Status indicator -->
          <WebSocketStatus :connection-state="connectionState" :client-id="clientId" />
          <!-- Expand/collapse icon -->
          <svg
            class="w-5 h-5 text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      <!-- Collapsible content -->
      <div v-show="isExpanded" class="border-t border-gray-200 p-4">
        <!-- Connection Status -->
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-700 mb-2">Connection Status</h3>
          <div class="space-y-3">
            <!-- Compact Status -->
            <div>
              <h4 class="text-sm font-medium text-gray-600 mb-2">Compact View:</h4>
              <WebSocketStatus :connection-state="connectionState" :client-id="clientId" />
            </div>

            <!-- Detailed Status -->
            <div>
              <h4 class="text-sm font-medium text-gray-600 mb-2">Detailed View:</h4>
              <WebSocketStatus
                :connection-state="connectionState"
                :client-id="clientId"
                :messages-sent="metrics.messagesSent"
                :messages-received="metrics.messagesReceived"
                :show-details="true"
                :show-client-id="true"
              />
            </div>
          </div>
        </div>

        <!-- Connection Controls -->
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-700 mb-2">Controls</h3>
          <div class="flex space-x-3">
            <button
              @click="connect"
              :disabled="isConnected || connectionState === 'connecting'"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Connect
            </button>
            <button
              @click="disconnect"
              :disabled="!isConnected && connectionState !== 'connecting'"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Disconnect
            </button>
            <button
              @click="testSendMessage"
              :disabled="!isConnected"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Test Message
            </button>
            <button
              @click="testQueueMessage"
              class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Queue Message
            </button>
            <button
              @click="handleClearQueue"
              :disabled="queueStatus.length === 0"
              class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Queue
            </button>
          </div>
        </div>

        <!-- Metrics -->
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-700 mb-2">Metrics</h3>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="bg-gray-50 p-3 rounded-lg text-center">
              <div class="text-sm text-gray-600 mb-1">Sent</div>
              <div class="text-xl font-semibold text-gray-900">{{ metrics.messagesSent }}</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg text-center">
              <div class="text-sm text-gray-600 mb-1">Received</div>
              <div class="text-xl font-semibold text-gray-900">{{ metrics.messagesReceived }}</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg text-center">
              <div class="text-sm text-gray-600 mb-1">Reconnects</div>
              <div class="text-xl font-semibold text-gray-900">{{ metrics.reconnectAttempts }}</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg text-center">
              <div class="text-sm text-gray-600 mb-1">Connected</div>
              <div class="text-xl font-semibold text-gray-900">
                {{ metrics.connectedAt ? new Date(metrics.connectedAt).toLocaleTimeString() : 'N/A' }}
              </div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg text-center">
              <div class="text-sm text-gray-600 mb-1">Queue</div>
              <div class="text-xl font-semibold text-gray-900">
                {{ queueStatus.length }}/{{ queueStatus.maxSize }}
              </div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-semibold text-blue-900 mb-2">Instructions</h4>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Make sure the backend server is running on port 8080</li>
            <li>• Click "Connect" to establish WebSocket connection</li>
            <li>• "Send Test Message" sends immediately when connected</li>
            <li>• "Queue Message" queues messages when offline (max 100)</li>
            <li>• Queued messages are sent automatically when reconnected</li>
            <li>• Try stopping the backend to test reconnection and queuing</li>
          </ul>
        </div>
      </div>
      <!-- End collapsible content -->
    </div>
  </div>
</template>
