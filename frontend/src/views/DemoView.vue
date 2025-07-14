<template>
  <div class="h-full flex flex-col">
    <h1 class="m-5 text-2xl font-semibold">Integration Proof of Concepts</h1>

    <div class="flex gap-2.5 px-5 mb-5">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="{ 'bg-orange-600 text-white': activeTab === tab.id, 'bg-gray-200 hover:bg-gray-300': activeTab !== tab.id }"
        class="py-2.5 px-5 border-none rounded cursor-pointer text-sm transition-all duration-300">
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1 overflow-hidden">
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
import CraneVisualization from '@/components/CraneVisualization.vue'
import SimpleCraneIK from '@/components/SimpleCraneIK.vue'
import CraneSimulation from '@/components/CraneSimulation.vue'

interface Tab {
  id: string
  label: string
  component: any
}

const tabs: Tab[] = [
  { id: 'crane', label: 'Crane Visualization', component: CraneVisualization },
  { id: 'simple-ik', label: 'Simple IK', component: SimpleCraneIK },
  { id: 'ik', label: 'CCDIKSolver Demo', component: CraneIKDemo },
  { id: 'crane-sim', label: 'FABRIK Crane Sim', component: CraneSimulation },
  { id: 'websocket', label: 'WebSocket Demo', component: WebSocketDemo },
  { id: 'physics', label: 'Physics Demo', component: PhysicsDemo }
]

const activeTab = ref('crane')

const activeComponent = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value)
  return tab?.component
})
</script>