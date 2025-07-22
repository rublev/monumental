<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useCrane, Crane } from '@/composables/useCrane'
import { useWebSocket } from '@/composables/useWebSocket'
import { SCENE_CONFIG } from '@monumental/shared'
import { CustomAxesHelper } from '@/utils/CustomAxesHelper'
import { MessageType } from '@monumental/shared'
import type {
  ManualControlCommand,
  StartCycleCommand,
  CraneStateUpdate,
  IncomingMessage,
} from '@monumental/shared'

// Use constants from shared package
const SIMULATION_BOUNDS = SCENE_CONFIG.SIMULATION_BOUNDS
const CAMERA_CONFIG = SCENE_CONFIG.CAMERA
const LIGHTING_CONFIG = SCENE_CONFIG.LIGHTING
const ENVIRONMENT_CONFIG = SCENE_CONFIG.ENVIRONMENT

// Composables
const { createCrane } = useCrane()
const ws = useWebSocket()

// WebSocket connection state
const isBackendConnected = ref(false)

// Reactive data
const canvasContainer = ref<HTMLDivElement | null>(null)
const pointA = reactive({
  x: -5.0,
  y: 2.0,
  z: -2.0,
})
const pointB = reactive({
  x: 5.0,
  y: 3.0,
  z: 3.0,
})

const settings = reactive({
  craneSpeed: 10.0, // units per second
  pathSteps: 200,
})

const stats = reactive({
  liftHeight: '8.00',
  shoulderAngle: '0.0',
  elbowAngle: '0.0',
})

// Animation state (now handled by backend)
const animationState = reactive({
  mode: 'IDLE' as 'IDLE' | 'MOVING_TO_A' | 'GRIPPING' | 'MOVING_TO_B' | 'RELEASING' | 'RETURNING',
})

const homePosition = { x: 8, y: 12, z: 8 }

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let crane: Crane
let axesHelper: CustomAxesHelper
let animationId: number
let obstacleCylinder: THREE.Mesh
let pathLine: THREE.Line
let handleA: THREE.Mesh
let handleB: THREE.Mesh
let payload: THREE.Mesh
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let dragPlane: THREE.Plane
let dragOffset: THREE.Vector3
let dragging: 'A' | 'B' | null = null

// Manual control state
const manualControl = reactive({
  enabled: false,
  endActuatorX: 0, // -1 to 1 for left/right
  endActuatorY: 0, // -1 to 1 for forward/backward
  liftDirection: 0, // -1 for down, 1 for up, 0 for stop
  gripperAction: 'stop' as 'open' | 'close' | 'stop',
  controlSpeed: 0.1, // Movement speed multiplier
  lastSentTime: 0, // Throttle WebSocket messages
})

// Pressed keys tracking
const pressedKeys = reactive(new Set<string>())

// Methods
const initThree = () => {
  if (!canvasContainer.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(ENVIRONMENT_CONFIG.BACKGROUND_COLOR)

  camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    CAMERA_CONFIG.NEAR,
    CAMERA_CONFIG.FAR,
  )
  camera.position.set(CAMERA_CONFIG.POSITION.x, CAMERA_CONFIG.POSITION.y, CAMERA_CONFIG.POSITION.z)
  camera.lookAt(CAMERA_CONFIG.LOOK_AT.x, CAMERA_CONFIG.LOOK_AT.y, CAMERA_CONFIG.LOOK_AT.z)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  canvasContainer.value.appendChild(renderer.domElement)

  // Lighting
  const ambientLight = new THREE.AmbientLight(
    LIGHTING_CONFIG.AMBIENT.color,
    LIGHTING_CONFIG.AMBIENT.intensity,
  )
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(
    LIGHTING_CONFIG.DIRECTIONAL.color,
    LIGHTING_CONFIG.DIRECTIONAL.intensity,
  )
  directionalLight.position.set(
    LIGHTING_CONFIG.DIRECTIONAL.position.x,
    LIGHTING_CONFIG.DIRECTIONAL.position.y,
    LIGHTING_CONFIG.DIRECTIONAL.position.z,
  )
  scene.add(directionalLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(CAMERA_CONFIG.LOOK_AT.x, CAMERA_CONFIG.LOOK_AT.y, CAMERA_CONFIG.LOOK_AT.z)
  controls.update()

  // Ground and grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ENVIRONMENT_CONFIG.GROUND_SIZE, ENVIRONMENT_CONFIG.GROUND_SIZE),
    new THREE.MeshStandardMaterial({ color: ENVIRONMENT_CONFIG.GROUND_COLOR }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const grid = new THREE.GridHelper(
    ENVIRONMENT_CONFIG.GRID_SIZE,
    ENVIRONMENT_CONFIG.GRID_SIZE,
    ENVIRONMENT_CONFIG.GRID_COLOR,
    ENVIRONMENT_CONFIG.GRID_COLOR,
  )
  scene.add(grid)

  // Crane
  crane = createCrane()
  scene.add(crane.base)

  // Add obstacle cylinder (representing the crane base boundary)
  const cylinderRadius = crane.getMinRadius
  obstacleCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(
      cylinderRadius,
      cylinderRadius,
      50, // height
      32,
      1,
      true,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    }),
  )
  obstacleCylinder.position.y = 25
  scene.add(obstacleCylinder)

  // Path line for visualization
  pathLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x0ea5e9 }),
  )
  scene.add(pathLine)

  // Point A (Pickup)
  handleA = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      transparent: true,
      opacity: 0.7,
    }),
  )
  scene.add(handleA)

  // Point B (Drop-off)
  handleB = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.7,
    }),
  )
  scene.add(handleB)

  // Payload
  payload = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 0.5,
    }),
  )
  scene.add(payload)

  // Coordinate axes helper
  axesHelper = new CustomAxesHelper()
  scene.add(axesHelper)

  // Raycaster for dragging
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  dragPlane = new THREE.Plane()
  dragOffset = new THREE.Vector3()

  // Event listeners for dragging
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onWindowResize)

  // Keyboard event listeners for manual control
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // Initialize positions
  updatePositions()
  crane.solveIK(homePosition)

  animate()
}

const updatePositions = () => {
  if (!handleA || !handleB || !payload) return

  handleA.position.set(pointA.x, pointA.y, pointA.z)
  handleB.position.set(pointB.x, pointB.y, pointB.z)

  // Always show path visualization, regardless of backend connection
  if (animationState.mode === 'IDLE') {
    // Hide payload when idle
    payload.visible = false
  }

  // Update path visualization
  let startPoint = new THREE.Vector3(pointA.x, pointA.y, pointA.z)
  const endPoint = new THREE.Vector3(pointB.x, pointB.y, pointB.z)

  // If point A is unreachable, find the maximum reachable point from home to A
  if (!crane.isReachable(pointA)) {
    const homeToA = crane.calculatePath(
      crane.getEndEffectorPosition(),
      startPoint,
      settings.pathSteps,
    )
    startPoint = crane.findMaxReachablePoint(homeToA)
  }

  let path = crane.calculatePath(startPoint, endPoint, settings.pathSteps)

  // If point B is unreachable, show path only to the maximum reachable point
  if (!crane.isReachable(pointB)) {
    const maxReachablePoint = crane.findMaxReachablePoint(path)
    path = crane.calculatePath(startPoint, maxReachablePoint, settings.pathSteps)
  }

  pathLine.geometry.setFromPoints(path)
  pathLine.visible = true
}

const startCycle = () => {
  if (animationState.mode !== 'IDLE') return

  // Send start cycle command to backend
  if (isBackendConnected.value) {
    const command: StartCycleCommand = {
      type: MessageType.START_CYCLE,
      timestamp: Date.now(),
      sequence: Date.now(),
      command: {
        pointA: { x: pointA.x, y: pointA.y, z: pointA.z },
        pointB: { x: pointB.x, y: pointB.y, z: pointB.z },
        speed: settings.craneSpeed,
      },
    }
    // Send the command using the WebSocket composable
    console.log('Sending command:', command)
    const success = ws.sendRawMessage(command)
    if (!success) {
      console.error('Failed to send command')
    }
  } else {
    console.warn('Backend not connected, cannot start cycle')
  }
}

const stopCycle = () => {
  if (animationState.mode === 'IDLE') return

  // Send stop cycle command to backend
  if (isBackendConnected.value) {
    const command = {
      type: MessageType.STOP_CYCLE,
      timestamp: Date.now(),
      sequence: Date.now(),
    }
    console.log('Sending stop command:', command)
    const success = ws.sendRawMessage(command)
    if (!success) {
      console.error('Failed to send stop command')
    }
  } else {
    console.warn('Backend not connected, cannot stop cycle')
  }
}

const updateSimStats = () => {
  if (!crane) return

  const craneStats = crane.getStats()
  stats.liftHeight = craneStats.liftHeight.toFixed(2)
  stats.shoulderAngle = craneStats.shoulderYaw.toFixed(1)
  stats.elbowAngle = craneStats.elbowYaw.toFixed(1)
}

const onWindowResize = () => {
  if (!canvasContainer.value || !camera || !renderer) return

  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  // Apply manual control continuously if enabled (works with both backend and local)
  if (manualControl.enabled && animationState.mode === 'IDLE') {
    if (
      manualControl.endActuatorX !== 0 ||
      manualControl.endActuatorY !== 0 ||
      manualControl.liftDirection !== 0
    ) {
      applyManualControl()
    }
  }

  // All animation is now handled by the backend

  if (controls) controls.update()

  updateSimStats()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// Dragging logic
const onPointerDown = (event: PointerEvent) => {
  if (animationState.mode !== 'IDLE') return

  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects([handleA, handleB])

  if (intersects.length > 0) {
    controls.enabled = false
    dragging = intersects[0].object === handleA ? 'A' : 'B'
    const pointToDrag = dragging === 'A' ? pointA : pointB

    dragPlane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(dragPlane.normal),
      new THREE.Vector3(pointToDrag.x, pointToDrag.y, pointToDrag.z),
    )
    const intersectionPoint = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlane, intersectionPoint)
    dragOffset.subVectors(
      intersectionPoint,
      new THREE.Vector3(pointToDrag.x, pointToDrag.y, pointToDrag.z),
    )
    if (canvasContainer.value) {
      canvasContainer.value.style.cursor = 'grabbing'
    }
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging) return

  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersectionPoint = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    intersectionPoint.sub(dragOffset)
    const targetPoint = dragging === 'A' ? pointA : pointB
    targetPoint.x = intersectionPoint.x
    targetPoint.y = Math.max(0, intersectionPoint.y) // Keep above ground
    targetPoint.z = intersectionPoint.z

    if (dragging === 'A' && animationState.mode === 'IDLE') {
      payload.position.copy(handleA.position)
    }
  }
}

const onPointerUp = () => {
  if (dragging) {
    controls.enabled = true
    dragging = null
    if (canvasContainer.value) {
      canvasContainer.value.style.cursor = 'grab'
    }
  }
}

// Keyboard event handlers for manual control
const onKeyDown = (event: KeyboardEvent) => {
  // Only handle keys if manual control is enabled and we're in IDLE mode
  if (!manualControl.enabled || animationState.mode !== 'IDLE') return

  const key = event.key.toLowerCase()

  // Prevent default behavior for control keys
  if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f'].includes(key)) {
    event.preventDefault()
  }

  pressedKeys.add(key)
  updateManualControlState()
}

const onKeyUp = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  pressedKeys.delete(key)
  updateManualControlState()
}

const updateManualControlState = () => {
  if (!manualControl.enabled || animationState.mode !== 'IDLE') return

  // Reset control state
  manualControl.endActuatorX = 0
  manualControl.endActuatorY = 0
  manualControl.liftDirection = 0
  manualControl.gripperAction = 'stop'

  // WASD controls for end actuator movement
  if (pressedKeys.has('w')) manualControl.endActuatorY = 1 // Forward
  if (pressedKeys.has('s')) manualControl.endActuatorY = -1 // Backward
  if (pressedKeys.has('a')) manualControl.endActuatorX = -1 // Left
  if (pressedKeys.has('d')) manualControl.endActuatorX = 1 // Right

  // Q/E for lift height control
  if (pressedKeys.has('q')) manualControl.liftDirection = 1 // Up
  if (pressedKeys.has('e')) manualControl.liftDirection = -1 // Down

  // R/F for gripper control
  if (pressedKeys.has('r')) manualControl.gripperAction = 'open'
  if (pressedKeys.has('f')) manualControl.gripperAction = 'close'
}

const applyManualControl = () => {
  if (!crane || !manualControl.enabled) return

  // Get current end effector position
  const currentPos = crane.getEndEffectorPosition()
  const newPos = currentPos.clone()

  // Apply movement based on control inputs
  // Note: X/Z movements are in world space, Y is lift height
  newPos.x += manualControl.endActuatorX * manualControl.controlSpeed
  newPos.z += manualControl.endActuatorY * manualControl.controlSpeed
  newPos.y += manualControl.liftDirection * manualControl.controlSpeed

  // Clamp to reasonable bounds
  newPos.x = THREE.MathUtils.clamp(newPos.x, -15, 15)
  newPos.z = THREE.MathUtils.clamp(newPos.z, -15, 15)
  newPos.y = THREE.MathUtils.clamp(newPos.y, 2, 25)

  // Apply the new position using inverse kinematics
  crane.solveIK(newPos)

  // Send manual control command to backend via websocket (throttled)
  if (isBackendConnected.value) {
    const now = Date.now()
    // Throttle to 30fps (33ms) to prevent flooding
    if (now - manualControl.lastSentTime > 33) {
      manualControl.lastSentTime = now
      const command: ManualControlCommand = {
        type: MessageType.MANUAL_CONTROL,
        timestamp: now,
        sequence: now,
        command: {
          endActuatorX: manualControl.endActuatorX,
          endActuatorY: manualControl.endActuatorY,
          liftDirection: manualControl.liftDirection,
          gripperAction: manualControl.gripperAction,
        },
      }
      // Send the command using the WebSocket composable
      const success = ws.sendRawMessage(command)
      if (!success) {
        console.error('Failed to send manual control command')
      }
    }
  }
}

// WebSocket message handlers
const handleWebSocketMessage = (message: IncomingMessage) => {
  switch (message.type) {
    case MessageType.STATE_UPDATE:
      const stateUpdate = message as CraneStateUpdate
      if (stateUpdate.state) {
        // Update crane visualization based on backend state
        updateCraneFromBackendState(stateUpdate.state)

        // Update animation state from backend
        if (stateUpdate.cycleProgress) {
          animationState.mode = stateUpdate.cycleProgress.isActive
            ? stateUpdate.cycleProgress.currentPhase === 'moving_to_a'
              ? 'MOVING_TO_A'
              : stateUpdate.cycleProgress.currentPhase === 'at_a'
                ? 'GRIPPING'
                : stateUpdate.cycleProgress.currentPhase === 'moving_to_b'
                  ? 'MOVING_TO_B'
                  : stateUpdate.cycleProgress.currentPhase === 'at_b'
                    ? 'RELEASING'
                    : 'RETURNING'
            : 'IDLE'
        }
      }
      break

    case MessageType.CYCLE_COMPLETE:
      console.log('Cycle completed by backend')
      animationState.mode = 'IDLE'
      break

    case MessageType.ERROR:
      console.error('Backend error:', message)
      break

    case MessageType.WELCOME:
      console.log('Connected to backend crane controller')
      isBackendConnected.value = true
      break

    default:
      console.log('Received unknown message type:', message.type)
  }
}

const updateCraneFromBackendState = (state: {
  swing?: number
  lift?: number
  elbow?: number
  wrist?: number
  gripper?: number
  endEffectorPosition?: { x: number; y: number; z: number }
  payloadPosition?: { x: number; y: number; z: number }
  payloadAttached?: boolean
  isMoving?: boolean
}) => {
  if (!crane || !payload) return

  // Use the backend's end effector position to update the crane
  if (state.endEffectorPosition) {
    crane.solveIK(state.endEffectorPosition)
  }

  // Update payload visibility and position based on backend state
  if (animationState.mode !== 'IDLE') {
    // Show payload during cycle
    payload.visible = true

    // Use backend's payload position directly
    if (state.payloadPosition) {
      payload.position.set(
        state.payloadPosition.x,
        state.payloadPosition.y,
        state.payloadPosition.z,
      )
    }
  } else {
    // Hide payload when idle
    payload.visible = false
  }

  // Update stats from backend state
  if (state.swing !== undefined) {
    stats.shoulderAngle = ((state.swing * 180) / Math.PI).toFixed(1)
  }
  if (state.lift !== undefined) {
    stats.liftHeight = state.lift.toFixed(2)
  }
  if (state.elbow !== undefined) {
    stats.elbowAngle = ((state.elbow * 180) / Math.PI).toFixed(1)
  }
}

// WebSocket connection management
const initWebSocket = () => {
  // Set up message handler
  ws.onMessage(handleWebSocketMessage)

  // Handle connection state changes
  ws.onStateChange((state) => {
    console.log('WebSocket state:', state)
    isBackendConnected.value = state === 'connected'
  })

  // Handle errors
  ws.onError((error) => {
    console.error('WebSocket error:', error)
    isBackendConnected.value = false
  })

  // Connect to backend
  ws.connect()
}

// Watchers
watch([pointA, pointB, settings], updatePositions, { deep: true })

// Lifecycle
onMounted(() => {
  initThree()
  initWebSocket()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)

  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.dispose()
  }

  // Disconnect WebSocket
  ws.disconnect()
})
</script>

<template>
  <div class="bg-gray-900 text-gray-50 h-screen w-screen overflow-hidden">
    <div ref="canvasContainer" class="w-screen h-screen" style="cursor: grab"></div>

    <div
      class="absolute bottom-4 left-4 bg-gray-900/50 backdrop-blur-sm p-3 rounded-md text-xs font-mono border border-gray-600">
      <strong>Live Solver Output:</strong><br />
      Lift Height: {{ stats.liftHeight }}<br />
      Shoulder Yaw: {{ stats.shoulderAngle }}°<br />
      Elbow Yaw: {{ stats.elbowAngle }}°<br />
      <div class="mt-2 flex items-center space-x-2">
        <div class="w-2 h-2 rounded-full" :class="isBackendConnected ? 'bg-green-500' : 'bg-red-500'"></div>
        <span>{{ isBackendConnected ? 'Backend Connected' : 'Backend Disconnected' }}</span>
      </div>
    </div>

    <div
      class="absolute bottom-4 right-4 bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg shadow-xl w-80 border border-gray-600">
      <h3 class="text-md font-bold mb-3 text-center">Crane Control</h3>

      <!-- Point A Controls -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold mb-2 text-green-400">Point A (Pickup)</h4>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-xs">X</label>
            <input v-model.number="pointA.x" type="number" :step="SIMULATION_BOUNDS.STEP"
              class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
          </div>
          <div>
            <label class="text-xs">Y</label>
            <input v-model.number="pointA.y" type="number" :step="SIMULATION_BOUNDS.STEP" :min="0"
              class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
          </div>
          <div>
            <label class="text-xs">Z</label>
            <input v-model.number="pointA.z" type="number" :step="SIMULATION_BOUNDS.STEP"
              class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
          </div>
        </div>
      </div>

      <!-- Point B Controls -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold mb-2 text-red-400">Point B (Drop-off)</h4>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-xs">X</label>
            <input v-model.number="pointB.x" type="number" :step="SIMULATION_BOUNDS.STEP"
              class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
          </div>
          <div>
            <label class="text-xs">Y</label>
            <input v-model.number="pointB.y" type="number" :step="SIMULATION_BOUNDS.STEP" :min="0"
              class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
          </div>
          <div>
            <label class="text-xs">Z</label>
            <input v-model.number="pointB.z" type="number" :step="SIMULATION_BOUNDS.STEP"
              class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="mb-4 space-y-2">
        <div>
          <label class="text-xs">Crane Speed (units/s)</label>
          <input v-model.number="settings.craneSpeed" type="number" min="1" max="50" step="1"
            class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
        </div>
        <div>
          <label class="text-xs">Path Fidelity</label>
          <input v-model.number="settings.pathSteps" type="number" min="10" max="500" step="10"
            class="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" />
        </div>
      </div>

      <!-- Manual Control Toggle -->
      <div class="mb-4">
        <label class="flex items-center space-x-2">
          <input v-model="manualControl.enabled" type="checkbox" :disabled="animationState.mode !== 'IDLE'"
            class="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500" />
          <span class="text-sm font-medium">Manual Control (WASD + Q/E)</span>
        </label>
        <div v-if="manualControl.enabled" class="mt-2 text-xs text-gray-400">
          <div>WASD: Move end effector</div>
          <div>Q/E: Lift up/down</div>
          <div>R/F: Gripper open/close</div>
        </div>
      </div>

      <!-- Start/Stop Buttons -->
      <div class="flex gap-2">
        <button @click="startCycle" :disabled="animationState.mode !== 'IDLE' || manualControl.enabled"
          class="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {{ animationState.mode === 'IDLE' ? 'Start Cycle' : 'Running...' }}
        </button>
        <button @click="stopCycle" :disabled="animationState.mode === 'IDLE' || manualControl.enabled"
          class="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Stop Cycle
        </button>
      </div>
    </div>
  </div>
</template>