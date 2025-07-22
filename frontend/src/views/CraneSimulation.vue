<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useCrane, Crane } from '@/composables/useCrane'
import { useWebSocket } from '@/composables/useWebSocket'
import { SCENE_CONFIG } from '@monumental/shared/config'
import { CRANE_DEFAULTS } from '@monumental/shared/crane'
import { ViewportGizmo } from 'three-viewport-gizmo'
import { MapPin, Package, Settings, Gamepad2, PlayCircle, Activity } from 'lucide-vue-next'
import { Slider } from '@/components/ui/slider'

import { MessageType } from '@monumental/shared/websocket'
import type {
  ManualControlCommand,
  StartCycleCommand,
  CraneStateUpdate,
  IncomingMessage,
} from '@monumental/shared/websocket'
import type { AnimationState } from '@monumental/shared/crane'

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
  x: CRANE_DEFAULTS.DEFAULT_POINT_A.x,
  y: CRANE_DEFAULTS.DEFAULT_POINT_A.y,
  z: CRANE_DEFAULTS.DEFAULT_POINT_A.z,
})
const pointB = reactive({
  x: CRANE_DEFAULTS.DEFAULT_POINT_B.x,
  y: CRANE_DEFAULTS.DEFAULT_POINT_B.y,
  z: CRANE_DEFAULTS.DEFAULT_POINT_B.z,
})

const settings = reactive({
  craneSpeed: CRANE_DEFAULTS.SPEED,
})

const craneSpeedSlider = computed({
  get: () => [settings.craneSpeed],
  set: (value: number[]) => {
    settings.craneSpeed = value[0] || CRANE_DEFAULTS.SPEED
  },
})

const stats = reactive({
  liftHeight: '0.0',
  shoulderAngle: '0.0',
  elbowAngle: '0.0',
  wristAngle: '0.0',
})

// Animation state (now handled by backend)
const animationState = reactive<Pick<AnimationState, 'mode'>>({
  mode: 'IDLE',
})

const homePosition = CRANE_DEFAULTS.HOME_POSITION

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let crane: Crane
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
let viewportGizmo: ViewportGizmo
let resizeObserver: ResizeObserver | null = null

// Manual control state
const manualControl = reactive({
  enabled: false,
  endActuatorX: 0, // -1 to 1 for left/right
  endActuatorY: 0, // -1 to 1 for forward/backward
  liftDirection: 0, // -1 for down, 1 for up, 0 for stop
  gripperAction: 'stop' as 'open' | 'close' | 'stop',
  controlSpeed: CRANE_DEFAULTS.CONTROL_SPEED,
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
    CAMERA_CONFIG.FAR
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
    LIGHTING_CONFIG.AMBIENT.intensity
  )
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(
    LIGHTING_CONFIG.DIRECTIONAL.color,
    LIGHTING_CONFIG.DIRECTIONAL.intensity
  )
  directionalLight.position.set(
    LIGHTING_CONFIG.DIRECTIONAL.position.x,
    LIGHTING_CONFIG.DIRECTIONAL.position.y,
    LIGHTING_CONFIG.DIRECTIONAL.position.z
  )
  scene.add(directionalLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(CAMERA_CONFIG.LOOK_AT.x, CAMERA_CONFIG.LOOK_AT.y, CAMERA_CONFIG.LOOK_AT.z)
  controls.update()

  // Ground and grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ENVIRONMENT_CONFIG.GROUND_SIZE, ENVIRONMENT_CONFIG.GROUND_SIZE),
    new THREE.MeshStandardMaterial({ color: ENVIRONMENT_CONFIG.GROUND_COLOR })
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const grid = new THREE.GridHelper(
    ENVIRONMENT_CONFIG.GRID_SIZE,
    ENVIRONMENT_CONFIG.GRID_SIZE,
    ENVIRONMENT_CONFIG.GRID_COLOR,
    ENVIRONMENT_CONFIG.GRID_COLOR
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
      true
    ),
    new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
  )
  obstacleCylinder.position.y = 25
  scene.add(obstacleCylinder)

  // Path line for visualization
  pathLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x0ea5e9 })
  )
  scene.add(pathLine)

  // Point A (Pickup)
  handleA = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      transparent: true,
      opacity: 0.7,
    })
  )
  scene.add(handleA)

  // Point B (Drop-off)
  handleB = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.7,
    })
  )
  scene.add(handleB)

  // Payload
  payload = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 0.5,
    })
  )
  scene.add(payload)

  // Raycaster for dragging
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  dragPlane = new THREE.Plane()
  dragOffset = new THREE.Vector3()

  // Create viewport gizmo
  createViewportGizmo()

  // Event listeners for dragging
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onWindowResize)

  // Keyboard event listeners for manual control
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // Set up ResizeObserver to handle container size changes
  if (canvasContainer.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          // Update Three.js to match container dimensions
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
          renderer.setPixelRatio(window.devicePixelRatio)

          if (viewportGizmo) {
            viewportGizmo.update()
          }
        }
      }
    })
    resizeObserver.observe(canvasContainer.value)
  }

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
    const homeToA = crane.calculatePath(crane.getEndEffectorPosition(), startPoint)
    startPoint = crane.findMaxReachablePoint(homeToA)
  }

  let path = crane.calculatePath(startPoint, endPoint)

  // If point B is unreachable, show path only to the maximum reachable point
  if (!crane.isReachable(pointB)) {
    const maxReachablePoint = crane.findMaxReachablePoint(path)
    path = crane.calculatePath(startPoint, maxReachablePoint)
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
  stats.wristAngle = craneStats.wristYaw.toFixed(1)
}

const createViewportGizmo = () => {
  if (!canvasContainer.value || !camera || !renderer) return

  try {
    viewportGizmo = new ViewportGizmo(camera, renderer, {
      container: canvasContainer.value,
      size: 128,
      placement: 'bottom-right',
      offset: { right: 16, bottom: 16 },
      type: 'cube',
      animated: true,
      speed: 2,
      background: {
        enabled: true,
        color: '#2d1b69',
        opacity: 0.8,
        hover: {
          color: '#1e1548',
          opacity: 0.9,
        },
      },
      font: {
        family: 'monospace',
        weight: 'bold',
      },
      x: {
        color: '#ff5f2e',
        labelColor: '#2d1b69',
        hover: {
          color: '#e5471a',
          labelColor: '#2d1b69',
        },
      },
      nx: {
        color: '#ff5f2e',
        labelColor: '#2d1b69',
        hover: {
          color: '#e5471a',
          labelColor: '#2d1b69',
        },
      },
      y: {
        color: '#ff5f2e',
        labelColor: '#2d1b69',
        hover: {
          color: '#e5471a',
          labelColor: '#2d1b69',
        },
      },
      ny: {
        color: '#ff5f2e',
        labelColor: '#2d1b69',
        hover: {
          color: '#e5471a',
          labelColor: '#2d1b69',
        },
      },
      z: {
        color: '#ff5f2e',
        labelColor: '#2d1b69',
        hover: {
          color: '#e5471a',
          labelColor: '#2d1b69',
        },
      },
      nz: {
        color: '#ff5f2e',
        labelColor: '#2d1b69',
        hover: {
          color: '#e5471a',
          labelColor: '#2d1b69',
        },
      },
      corners: {
        color: '#ff5f2e',
        hover: {
          color: '#e5471a',
        },
      },
    })

    // Attach controls for camera synchronization
    if (controls) {
      viewportGizmo.attachControls(controls)
    }

    // Initial render
    viewportGizmo.render()
  } catch (error) {
    console.error('Error creating viewport gizmo:', error)
  }
}

const onWindowResize = () => {
  if (!canvasContainer.value || !camera || !renderer) return

  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  // Update Three.js to match new dimensions
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  if (viewportGizmo) {
    viewportGizmo.update()
  }
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

  // Render viewport gizmo AFTER main scene
  if (viewportGizmo) {
    try {
      viewportGizmo.render()
    } catch (error) {
      console.error('Error rendering viewport gizmo:', error)
    }
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
      new THREE.Vector3(pointToDrag.x, pointToDrag.y, pointToDrag.z)
    )
    const intersectionPoint = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlane, intersectionPoint)
    dragOffset.subVectors(
      intersectionPoint,
      new THREE.Vector3(pointToDrag.x, pointToDrag.y, pointToDrag.z)
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
    // Throttle using shared constant to prevent flooding
    if (now - manualControl.lastSentTime > CRANE_DEFAULTS.WEBSOCKET_THROTTLE_MS) {
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

  // Update gripper animation based on backend gripper state
  if (state.gripper !== undefined) {
    crane.updateGripper(state.gripper)
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
        state.payloadPosition.z
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
  if (state.wrist !== undefined) {
    stats.wristAngle = ((state.wrist * 180) / Math.PI).toFixed(1)
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

  if (viewportGizmo) {
    viewportGizmo.dispose()
  }

  // Disconnect ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  // Disconnect WebSocket
  ws.disconnect()
})
</script>

<template>
  <div class="h-screen flex bg-gray-900 text-gray-50 overflow-hidden">
    <!-- Sidebar -->
    <div class="w-80 min-w-80 flex-shrink-0 bg-monumental-purple flex flex-col font-mono pb-5">
      <!-- Header with Logo -->
      <div class="pt-5 pr-5 pb-5 pl-5">
        <img
          src="@/assets/monumental.svg"
          alt="Monumental"
          class="w-full h-auto text-monumental-orange"
          style="
            filter: invert(47%) sepia(99%) saturate(2118%) hue-rotate(0deg) brightness(102%)
              contrast(101%);
          "
        />
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-y-auto pt-0 pr-5 pb-0 pl-5 space-y-4 flex flex-col">
        <!-- Combined Monitoring Display -->
        <div class="bg-black/75 p-4 rounded-[10px]">
          <!-- Live Stats -->
          <div>
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2 text-monumental-orange">
              <Activity class="w-4 h-4" />
              Live Solver Output
            </h3>
            <div class="text-xs space-y-2 text-gray-300">
              <div class="flex justify-between">
                <span>Lift Height:</span>
                <span class="text-monumental-orange">{{ stats.liftHeight }}</span>
              </div>
              <div class="flex justify-between">
                <span>Shoulder Yaw:</span>
                <span class="text-monumental-orange">{{ stats.shoulderAngle }}°</span>
              </div>
              <div class="flex justify-between">
                <span>Elbow Yaw:</span>
                <span class="text-monumental-orange">{{ stats.elbowAngle }}°</span>
              </div>
              <div class="flex justify-between">
                <span>Wrist Yaw:</span>
                <span class="text-monumental-orange">{{ stats.wristAngle }}°</span>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="-mx-4 my-4 border-t border-gray-600 opacity-30"></div>

          <!-- Point A Display -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2 text-green-400">
              <MapPin class="w-4 h-4" />
              Point A (Pickup)
            </h4>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-xs text-gray-300">X</label>
                <input
                  v-model.number="pointA.x"
                  type="number"
                  :step="SIMULATION_BOUNDS.STEP"
                  class="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-300">Y</label>
                <input
                  v-model.number="pointA.y"
                  type="number"
                  :step="SIMULATION_BOUNDS.STEP"
                  :min="0"
                  class="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-300">Z</label>
                <input
                  v-model.number="pointA.z"
                  type="number"
                  :step="SIMULATION_BOUNDS.STEP"
                  class="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                />
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="-mx-4 my-4 border-t border-gray-600 opacity-30"></div>

          <!-- Point B Display -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2 text-red-400">
              <Package class="w-4 h-4" />
              Point B (Drop-off)
            </h4>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-xs text-gray-300">X</label>
                <input
                  v-model.number="pointB.x"
                  type="number"
                  :step="SIMULATION_BOUNDS.STEP"
                  class="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-300">Y</label>
                <input
                  v-model.number="pointB.y"
                  type="number"
                  :step="SIMULATION_BOUNDS.STEP"
                  :min="0"
                  class="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-300">Z</label>
                <input
                  v-model.number="pointB.z"
                  type="number"
                  :step="SIMULATION_BOUNDS.STEP"
                  class="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Spacer to push controls to bottom -->
        <div class="flex-1"></div>

        <!-- Bottom Section - Controls -->
        <div class="space-y-4">
          <!-- Settings -->
          <div class="bg-monumental-purple-light p-4">
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2 text-monumental-orange">
              <Settings class="w-4 h-4" />
              Settings
            </h4>
            <div>
              <label class="text-xs text-gray-300 block mb-2">Crane Speed (units/s)</label>
              <div class="flex items-center gap-3">
                <Slider v-model="craneSpeedSlider" :min="1" :max="50" :step="1" class="flex-1" />
                <span class="text-sm text-monumental-orange font-mono w-8 text-right">{{
                  settings.craneSpeed
                }}</span>
              </div>
            </div>
          </div>

          <!-- Manual Control -->
          <div class="bg-monumental-purple-light p-4">
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2 text-monumental-orange">
              <Gamepad2 class="w-4 h-4" />
              Manual Control
            </h4>
            <label class="flex items-center space-x-3">
              <input
                v-model="manualControl.enabled"
                type="checkbox"
                :disabled="animationState.mode !== 'IDLE'"
                class="w-4 h-4 text-monumental-orange bg-monumental-purple focus:ring-monumental-orange focus:ring-2 rounded"
              />
              <span class="text-sm font-medium text-white">Enable Manual Control</span>
            </label>
            <div v-if="manualControl.enabled" class="mt-3 text-xs text-gray-300 space-y-1">
              <div><span class="text-monumental-orange">WASD:</span> Move end effector</div>
              <div><span class="text-monumental-orange">Q/E:</span> Lift up/down</div>
              <div><span class="text-monumental-orange">R/F:</span> Gripper open/close</div>
            </div>
          </div>

          <!-- Cycle Control -->
          <div class="bg-monumental-purple-light px-4 pt-4 pb-0">
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2 text-monumental-orange">
              <PlayCircle class="w-4 h-4" />
              Cycle Control
            </h4>
            <button
              @click="animationState.mode === 'IDLE' ? startCycle() : stopCycle()"
              :disabled="manualControl.enabled"
              class="w-full text-white font-bold py-4 px-6 mb-0 text-base transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 rounded-lg"
              :class="
                animationState.mode === 'IDLE'
                  ? 'bg-black/50 hover:bg-black/70'
                  : 'bg-red-600 hover:bg-red-700'
              "
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path v-if="animationState.mode === 'IDLE'" d="M8 5v14l11-7z" />
                <path v-else d="M6 6h12v12H6z" />
              </svg>
              {{ animationState.mode === 'IDLE' ? 'Start Cycle' : 'Stop Cycle' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main 3D Scene Area -->
    <div class="flex-1 bg-monumental-purple pt-5 pr-5 pb-5 min-w-0">
      <div class="w-full h-full rounded-[10px] border border-gray-600 overflow-hidden relative">
        <div ref="canvasContainer" class="absolute inset-0" style="cursor: grab"></div>

        <!-- Backend Status Badge -->
        <div
          class="absolute bottom-4 left-4 px-4 py-2 text-sm font-mono shadow-lg z-10 bg-gray-900 border border-gray-600 rounded-md"
        >
          <span
            class="inline-block w-2 h-2 rounded-full mr-2"
            :class="isBackendConnected ? 'bg-green-400' : 'bg-red-400'"
          ></span>
          Backend {{ isBackendConnected ? 'Connected' : 'Disconnected' }}
        </div>
      </div>
    </div>
  </div>
</template>
