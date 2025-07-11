<script setup lang="ts">
import WebSocketTest from '@/components/WebSocketTest.vue'
import ThreeScene from '@/components/ThreeScene.vue'
</script>

<template>
  <div class="px-4 py-6 sm:px-0 space-y-6">
    <!-- WebSocket Test Component -->
    <WebSocketTest />
    
    <!-- Three.js Scene Component -->
    <div class="bg-white rounded-lg shadow-md p-4">
      <h2 class="text-xl font-bold text-gray-900 mb-4">Three.js Scene</h2>
      <ThreeScene />
    </div>
  </div>
</template>
