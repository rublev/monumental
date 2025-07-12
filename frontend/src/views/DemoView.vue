<template>
  <div class="demo-view">
    <h1>Integration Proof of Concepts</h1>
    
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="{ active: activeTab === tab.id }"
        class="tab-button"
      >
        {{ tab.label }}
      </button>
    </div>
    
    <div class="tab-content">
      <keep-alive>
        <component :is="activeComponent" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CraneIKDemo from '@/components/CraneIKDemo.vue'
import WebSocketDemo from '@/components/WebSocketDemo.vue'
import PhysicsDemo from '@/components/PhysicsDemo.vue'

interface Tab {
  id: string
  label: string
  component: any
}

const tabs: Tab[] = [
  { id: 'ik', label: 'CCDIKSolver Demo', component: CraneIKDemo },
  { id: 'websocket', label: 'WebSocket Demo', component: WebSocketDemo },
  { id: 'physics', label: 'Physics Demo', component: PhysicsDemo }
]

const activeTab = ref('ik')

const activeComponent = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value)
  return tab?.component
})
</script>

<style scoped>
.demo-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

h1 {
  margin: 20px;
  font-size: 24px;
}

.tabs {
  display: flex;
  gap: 10px;
  padding: 0 20px;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  border: none;
  background: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.tab-button:hover {
  background: #d0d0d0;
}

.tab-button.active {
  background: #ff6600;
  color: white;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}
</style>