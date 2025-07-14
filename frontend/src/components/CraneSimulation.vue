<template>
  <div class="bg-gray-900 text-gray-50 m-0 overflow-hidden">
    <div ref="canvasContainer" class="w-screen h-screen"></div>

    <div
      class="absolute bottom-4 left-4 bg-gray-900/50 backdrop-blur-sm p-3 rounded-md text-xs font-mono border border-gray-600">
      <strong>Live Solver Output:</strong><br>
      Lift Height: {{ stats.liftHeight }}<br>
      Shoulder Yaw: {{ stats.shoulderAngle }}°<br>
      Elbow Yaw: {{ stats.elbowAngle }}°
    </div>

    <div
      class="absolute bottom-4 right-4 bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg shadow-xl w-72 border border-gray-600">
      <h3 class="text-md font-bold mb-3 text-center">Target Position</h3>

      <div>
        <label for="x-slider" class="flex justify-between font-mono text-sm">
          <span>X</span><span>{{ targetPosition.x.toFixed(1) }}</span>
        </label>
        <input id="x-slider" v-model.number="targetPosition.x" type="range" :min="SIMULATION_BOUNDS.X_MIN"
          :max="SIMULATION_BOUNDS.X_MAX" :step="SIMULATION_BOUNDS.STEP"
          class="w-full h-2 bg-gray-600 rounded-lg cursor-pointer" />
      </div>

      <div class="mt-2">
        <label for="y-slider" class="flex justify-between font-mono text-sm">
          <span>Y</span><span>{{ targetPosition.y.toFixed(1) }}</span>
        </label>
        <input id="y-slider" v-model.number="targetPosition.y" type="range" :min="SIMULATION_BOUNDS.Y_MIN"
          :max="SIMULATION_BOUNDS.Y_MAX" :step="SIMULATION_BOUNDS.STEP"
          class="w-full h-2 bg-gray-600 rounded-lg cursor-pointer" />
      </div>

      <div class="mt-2">
        <label for="z-slider" class="flex justify-between font-mono text-sm">
          <span>Z</span><span>{{ targetPosition.z.toFixed(1) }}</span>
        </label>
        <input id="z-slider" v-model.number="targetPosition.z" type="range" :min="SIMULATION_BOUNDS.Z_MIN"
          :max="SIMULATION_BOUNDS.Z_MAX" :step="SIMULATION_BOUNDS.STEP"
          class="w-full h-2 bg-gray-600 rounded-lg cursor-pointer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useCrane } from '../composables/useCrane.js'

// Constants
const SIMULATION_BOUNDS = {
  X_MIN: -13,
  X_MAX: 13,
  Y_MIN: 0,
  Y_MAX: 10,
  Z_MIN: -13,
  Z_MAX: 13,
  STEP: 0.1
}

const CAMERA_CONFIG = {
  FOV: 60,
  NEAR: 0.1,
  FAR: 1000,
  POSITION: { x: 20, y: 15, z: 20 },
  LOOK_AT: { x: 0, y: 5, z: 0 }
}

const LIGHTING_CONFIG = {
  AMBIENT: { color: 0xffffff, intensity: 0.7 },
  DIRECTIONAL: {
    color: 0xffffff,
    intensity: 1.5,
    position: { x: 10, y: 20, z: 5 }
  }
}

const SCENE_CONFIG = {
  BACKGROUND_COLOR: 0x111827,
  GROUND_SIZE: 50,
  GROUND_COLOR: 0x1f2937,
  GRID_SIZE: 50,
  GRID_COLOR: 0x444444
}

const TARGET_CONFIG = {
  RADIUS: 0.5,
  COLOR: 0xef4444,
  SEGMENTS: { width: 16, height: 8 },
  OPACITY: 0.7
}

// Composables
const { createCrane } = useCrane()

// Reactive data
const canvasContainer = ref(null)
const targetPosition = reactive({
  x: 5.0,
  y: 5.0,
  z: 5.0
})

const stats = reactive({
  liftHeight: '8.00',
  shoulderAngle: '0.0',
  elbowAngle: '0.0'
})

// Three.js objects
let scene, camera, renderer, controls
let ikTarget, crane
let animationId


// Methods
const initThree = () => {
  if (!canvasContainer.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(SCENE_CONFIG.BACKGROUND_COLOR)

  camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    CAMERA_CONFIG.NEAR,
    CAMERA_CONFIG.FAR
  )
  camera.position.set(CAMERA_CONFIG.POSITION.x, CAMERA_CONFIG.POSITION.y, CAMERA_CONFIG.POSITION.z)
  camera.lookAt(CAMERA_CONFIG.LOOK_AT.x, CAMERA_CONFIG.LOOK_AT.y, CAMERA_CONFIG.LOOK_AT.z)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  canvasContainer.value.appendChild(renderer.domElement)

  // Lighting
  const ambientLight = new THREE.AmbientLight(LIGHTING_CONFIG.AMBIENT.color, LIGHTING_CONFIG.AMBIENT.intensity)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(LIGHTING_CONFIG.DIRECTIONAL.color, LIGHTING_CONFIG.DIRECTIONAL.intensity)
  directionalLight.position.set(LIGHTING_CONFIG.DIRECTIONAL.position.x, LIGHTING_CONFIG.DIRECTIONAL.position.y, LIGHTING_CONFIG.DIRECTIONAL.position.z)
  scene.add(directionalLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(CAMERA_CONFIG.LOOK_AT.x, CAMERA_CONFIG.LOOK_AT.y, CAMERA_CONFIG.LOOK_AT.z)
  controls.update()

  // Ground and grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SCENE_CONFIG.GROUND_SIZE, SCENE_CONFIG.GROUND_SIZE),
    new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.GROUND_COLOR })
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const grid = new THREE.GridHelper(SCENE_CONFIG.GRID_SIZE, SCENE_CONFIG.GRID_SIZE, SCENE_CONFIG.GRID_COLOR, SCENE_CONFIG.GRID_COLOR)
  scene.add(grid)

  // Crane
  crane = createCrane()
  scene.add(crane.base)

  // IK Target
  ikTarget = new THREE.Mesh(
    new THREE.SphereGeometry(TARGET_CONFIG.RADIUS, TARGET_CONFIG.SEGMENTS.width, TARGET_CONFIG.SEGMENTS.height),
    new THREE.MeshBasicMaterial({
      color: TARGET_CONFIG.COLOR,
      wireframe: true,
      transparent: true,
      opacity: TARGET_CONFIG.OPACITY
    })
  )
  scene.add(ikTarget)

  window.addEventListener('resize', onWindowResize)

  // Initialize target position and crane IK on load
  updateTargetPosition()

  animate()
}

const updateTargetPosition = () => {
  let { x, y, z } = targetPosition

  // Visual clamping logic
  const horizontalDist = Math.sqrt(x * x + z * z)

  if (crane && horizontalDist < crane.baseRadius) {
    const angle = Math.atan2(z, x)
    x = crane.baseRadius * Math.cos(angle)
    z = crane.baseRadius * Math.sin(angle)
  }

  ikTarget.position.set(x, y, z)
}

const updateSimStats = () => {
  if (!crane) return

  const craneStats = crane.getStats()
  stats.liftHeight = craneStats.liftHeight
  stats.shoulderAngle = craneStats.shoulderAngle
  stats.elbowAngle = craneStats.elbowAngle
}

const onWindowResize = () => {
  if (!canvasContainer.value || !camera || !renderer) return

  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (controls) controls.update()
  if (crane && ikTarget) crane.solveIK(ikTarget.position)

  updateSimStats()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// Watchers
watch(targetPosition, updateTargetPosition, { deep: true })

// Lifecycle
onMounted(() => {
  initThree()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', onWindowResize)

  if (renderer) {
    renderer.dispose()
  }
})
</script>