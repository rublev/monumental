<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

// Container ref for the canvas
const container = ref<HTMLDivElement>()

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let cube: THREE.Mesh
let animationId: number

// Initialize Three.js scene
const initScene = () => {
  if (!container.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2a2a2a)

  // Camera setup
  const aspect = container.value.clientWidth / container.value.clientHeight
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
  camera.position.z = 5

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // Create cube
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({ color: 0xff6600 }) // Orange color
  cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  // Handle window resize
  window.addEventListener('resize', handleResize)
}

// Animation loop
const animate = () => {
  animationId = requestAnimationFrame(animate)

  // Rotate cube
  if (cube) {
    cube.rotation.x += 0.01
    cube.rotation.y += 0.008
  }

  renderer.render(scene, camera)
}

// Handle window resize
const handleResize = () => {
  if (!container.value) return

  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

// Lifecycle
onMounted(() => {
  initScene()
  animate()
})

onUnmounted(() => {
  // Cleanup
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  
  if (renderer) {
    renderer.dispose()
    container.value?.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div ref="container" class="w-full h-96 bg-gray-900 rounded-lg overflow-hidden"></div>
</template>