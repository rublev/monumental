<script setup lang="ts">
import { computed } from 'vue'
import type { ConnectionState } from '@monumental/shared'

interface Props {
  connectionState: ConnectionState
  clientId?: string | null
  messagesSent?: number
  messagesReceived?: number
  showDetails?: boolean
  showClientId?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  messagesSent: 0,
  messagesReceived: 0,
  showDetails: false,
  showClientId: false,
})

const statusConfig = computed(() => {
  switch (props.connectionState) {
    case 'connected':
      return {
        color: 'green',
        icon: '●',
        label: 'Connected',
        bgClass: 'bg-green-100',
        textClass: 'text-green-800',
        borderClass: 'border-green-200',
        description: 'WebSocket connection is active',
      }
    case 'connecting':
      return {
        color: 'yellow',
        icon: '●',
        label: 'Connecting',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-800',
        borderClass: 'border-yellow-200',
        description: 'Establishing WebSocket connection...',
      }
    case 'reconnecting':
      return {
        color: 'orange',
        icon: '●',
        label: 'Reconnecting',
        bgClass: 'bg-orange-100',
        textClass: 'text-orange-800',
        borderClass: 'border-orange-200',
        description: 'Attempting to reconnect...',
      }
    case 'disconnected':
      return {
        color: 'gray',
        icon: '●',
        label: 'Disconnected',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-800',
        borderClass: 'border-gray-200',
        description: 'WebSocket connection is closed',
      }
    case 'error':
      return {
        color: 'red',
        icon: '●',
        label: 'Error',
        bgClass: 'bg-red-100',
        textClass: 'text-red-800',
        borderClass: 'border-red-200',
        description: 'Connection failed or error occurred',
      }
    default:
      return {
        color: 'gray',
        icon: '●',
        label: 'Unknown',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-800',
        borderClass: 'border-gray-200',
        description: 'Unknown connection state',
      }
  }
})
</script>

<template>
  <div class="flex items-center space-x-3">
    <!-- Status Indicator -->
    <div class="flex items-center px-3 py-1 rounded-full text-sm font-medium border"
      :class="[statusConfig.bgClass, statusConfig.textClass, statusConfig.borderClass]"
      :title="statusConfig.description">
      <span class="w-2 h-2 rounded-full mr-2 animate-pulse" :class="{
        'bg-green-500': connectionState === 'connected',
        'bg-yellow-500': connectionState === 'connecting' || connectionState === 'reconnecting',
        'bg-red-500': connectionState === 'error',
        'bg-gray-500': connectionState === 'disconnected',
      }"></span>
      {{ statusConfig.label }}
    </div>

    <!-- Client ID (if connected and showClientId is true) -->
    <div v-if="showClientId && clientId" class="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded"
      :title="`Client ID: ${clientId}`">
      {{ clientId }}
    </div>

    <!-- Message Stats (if showDetails is true) -->
    <div v-if="showDetails" class="flex items-center space-x-2 text-sm text-gray-600">
      <div class="flex items-center">
        <span class="text-green-600">↑</span>
        <span class="ml-1">{{ messagesSent }}</span>
      </div>
      <div class="flex items-center">
        <span class="text-blue-600">↓</span>
        <span class="ml-1">{{ messagesReceived }}</span>
      </div>
    </div>
  </div>
</template>