<script setup lang="ts">
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import { shallowRef } from 'vue'

// Camera configuration for proper 3D viewing
// Position camera at [0, 0, 5] with 75-degree field of view

// Animation setup for rotating cube
const cubeRef = shallowRef()
const { onLoop } = useRenderLoop()

onLoop(({ delta, elapsed }) => {
  if (cubeRef.value) {
    // Rotate on X and Y axes for interesting animation
    cubeRef.value.rotation.x += delta
    cubeRef.value.rotation.y += delta * 0.8
  }
})
</script>

<template>
  <div class="w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
    <TresCanvas clear-color="#2a2a2a">
      <!-- Camera positioned for optimal viewing -->
      <TresPerspectiveCamera :position="[0, 0, 5]" :fov="75" :near="0.1" :far="1000" />

      <!-- Lighting setup -->
      <TresAmbientLight :intensity="0.5" />
      <TresDirectionalLight 
        :position="[5, 5, 5]" 
        :intensity="1" 
        color="white"
      />

      <!-- Rotating cube with proper lighting -->
      <TresMesh ref="cubeRef">
        <TresBoxGeometry :args="[1, 1, 1]" />
        <TresMeshStandardMaterial color="orange" />
      </TresMesh>
    </TresCanvas>
  </div>
</template>