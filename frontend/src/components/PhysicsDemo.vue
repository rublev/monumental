<template>
  <div class="physics-demo">
    <div ref="containerRef" class="canvas-container"></div>
    <div class="controls">
      <h3>Physics Demo Controls</h3>
      <button @click="spawnBrick">Spawn Brick</button>
      <button @click="clearBricks">Clear All Bricks</button>
      <p>Bricks spawned: {{ brickCount }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import RAPIER from '@dimforge/rapier3d-compat'
import { PHYSICS_CONFIG } from '@monumental/shared'

const containerRef = ref<HTMLDivElement>()
const brickCount = ref(0)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationFrameId: number

// Physics
let world: RAPIER.World
let brickBodies: Map<number, RAPIER.RigidBody> = new Map()
let brickMeshes: Map<number, THREE.Mesh> = new Map()
let nextBrickId = 0

async function initPhysics() {
  // Initialize Rapier
  await RAPIER.init()

  // Create physics world
  const gravity = new RAPIER.Vector3(
    PHYSICS_CONFIG.gravity.x,
    PHYSICS_CONFIG.gravity.y * 100, // Scale for mm units
    PHYSICS_CONFIG.gravity.z,
  )
  world = new RAPIER.World(gravity)

  // Create ground collider
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(500, 10, 500)
  world.createCollider(groundColliderDesc)
}

function initThreeJS() {
  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    containerRef.value!.clientWidth / containerRef.value!.clientHeight,
    0.1,
    5000,
  )
  camera.position.set(800, 800, 800)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(containerRef.value!.clientWidth, containerRef.value!.clientHeight)
  renderer.shadowMap.enabled = true
  containerRef.value!.appendChild(renderer.domElement)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  // Ground plane
  const groundGeometry = new THREE.BoxGeometry(1000, 20, 1000)
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.position.y = -10
  ground.receiveShadow = true
  scene.add(ground)

  // Grid helper
  const gridHelper = new THREE.GridHelper(1000, 20)
  scene.add(gridHelper)
}

function spawnBrick() {
  // Random spawn position
  const x = (Math.random() - 0.5) * 400
  const y = 500 + Math.random() * 300
  const z = (Math.random() - 0.5) * 400

  // Create physics body
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z)
  const body = world.createRigidBody(bodyDesc)

  // Create collider
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    PHYSICS_CONFIG.brickDimensions.x / 2,
    PHYSICS_CONFIG.brickDimensions.y / 2,
    PHYSICS_CONFIG.brickDimensions.z / 2,
  )
  world.createCollider(colliderDesc, body)

  // Create visual mesh
  const geometry = new THREE.BoxGeometry(
    PHYSICS_CONFIG.brickDimensions.x,
    PHYSICS_CONFIG.brickDimensions.y,
    PHYSICS_CONFIG.brickDimensions.z,
  )
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  // Store references
  const id = nextBrickId++
  brickBodies.set(id, body)
  brickMeshes.set(id, mesh)
  brickCount.value++
}

function clearBricks() {
  // Remove all bricks
  brickBodies.forEach((body, id) => {
    world.removeRigidBody(body)
    const mesh = brickMeshes.get(id)
    if (mesh) {
      scene.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
  })

  brickBodies.clear()
  brickMeshes.clear()
  brickCount.value = 0
}

function updatePhysics() {
  world.step()

  // Sync physics bodies with visual meshes
  brickBodies.forEach((body, id) => {
    const mesh = brickMeshes.get(id)
    if (mesh) {
      const position = body.translation()
      const rotation = body.rotation()

      mesh.position.set(position.x, position.y, position.z)
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }
  })
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)

  controls.update()
  updatePhysics()
  renderer.render(scene, camera)
}

function handleResize() {
  if (!containerRef.value) return

  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
}

onMounted(async () => {
  await initPhysics()
  initThreeJS()
  animate()
  window.addEventListener('resize', handleResize)

  // Spawn a few initial bricks
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnBrick(), i * 200)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  renderer.dispose()
  clearBricks()
})
</script>

<style scoped>
.physics-demo {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.canvas-container {
  flex: 1;
  position: relative;
}

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.controls h3 {
  margin: 0 0 15px 0;
}

.controls button {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #0056b3;
}

.controls p {
  margin: 10px 0 0 0;
  font-family: monospace;
}
</style>
