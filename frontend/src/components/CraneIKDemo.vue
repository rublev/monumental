<template>
  <div class="crane-ik-demo">
    <div ref="containerRef" class="canvas-container"></div>
    <div class="controls">
      <h3>Crane Bone Animation Demo</h3>
      <p style="font-size: 12px; margin: 5px 0;">CCDIKSolver integration pending - showing bone hierarchy animation</p>
      <label>
        X: <input type="range" v-model.number="targetX" min="-400" max="400" />
        <span>{{ targetX }}mm</span>
      </label>
      <label>
        Y: <input type="range" v-model.number="targetY" min="0" max="600" />
        <span>{{ targetY }}mm</span>
      </label>
      <label>
        Z: <input type="range" v-model.number="targetZ" min="-400" max="400" />
        <span>{{ targetZ }}mm</span>
      </label>
      <button @click="resetTarget">Reset Target</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { IKChainConfig } from '@monumental/shared'

const containerRef = ref<HTMLDivElement>()
const targetX = ref(200)
const targetY = ref(300)
const targetZ = ref(0)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let ikSolver: CCDIKSolver
let targetMesh: THREE.Mesh
let craneMesh: THREE.SkinnedMesh
let animationFrameId: number

function createCraneModel(): THREE.SkinnedMesh {
  // Create a simple crane arm with bones
  const segmentHeight = 75
  const segmentCount = 4
  const height = segmentHeight * segmentCount
  const halfHeight = height * 0.5
  
  const geometry = new THREE.CylinderGeometry(20, 20, height, 8, segmentCount * 3, true)
  
  // Create bone hierarchy
  const bones: THREE.Bone[] = []
  
  // Create bones
  let prevBone = new THREE.Bone()
  bones.push(prevBone)
  prevBone.position.y = -halfHeight
  
  for (let i = 0; i < segmentCount; i++) {
    const bone = new THREE.Bone()
    bone.position.y = segmentHeight
    bones.push(bone)
    prevBone.add(bone)
    prevBone = bone
  }
  
  // Set up skin indices and skin weights
  const position = geometry.attributes.position
  const vertex = new THREE.Vector3()
  
  const skinIndices = []
  const skinWeights = []
  
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    
    // Compute vertex position in bone space
    const y = vertex.y + halfHeight
    
    // Find which bone segment this vertex belongs to
    const skinIndex = Math.floor(y / segmentHeight)
    const skinWeight = (y % segmentHeight) / segmentHeight
    
    // Each vertex is influenced by two bones maximum
    skinIndices.push(skinIndex, skinIndex + 1, 0, 0)
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0)
  }
  
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4))
  
  // Create material
  const material = new THREE.MeshPhongMaterial({
    color: 0xff6600,
    side: THREE.DoubleSide
  })
  
  // Create skinned mesh
  const mesh = new THREE.SkinnedMesh(geometry, material)
  
  // Create skeleton
  const skeleton = new THREE.Skeleton(bones)
  
  // Bind skeleton to mesh
  const rootBone = bones[0]
  mesh.add(rootBone)
  mesh.bind(skeleton)
  
  return mesh
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
    2000
  )
  camera.position.set(500, 500, 500)
  
  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(containerRef.value!.clientWidth, containerRef.value!.clientHeight)
  containerRef.value!.appendChild(renderer.domElement)
  
  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)
  
  // Grid helper
  const gridHelper = new THREE.GridHelper(1000, 20)
  scene.add(gridHelper)
  
  // Axes helper
  const axesHelper = new THREE.AxesHelper(200)
  scene.add(axesHelper)
  
  // Create crane
  craneMesh = createCraneModel()
  scene.add(craneMesh)
  
  // Create target sphere
  const targetGeometry = new THREE.SphereGeometry(20)
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  targetMesh = new THREE.Mesh(targetGeometry, targetMaterial)
  scene.add(targetMesh)
  
  // For now, let's create a simple manual IK demonstration
  // The CCDIKSolver requires a more complex setup with proper bone weights
  // We'll implement a basic rotation animation to show the concept
  
  // Store bones for manual control
  const bones = craneMesh.skeleton.bones
  
  // Helper to visualize bones
  const helper = new THREE.SkeletonHelper(craneMesh)
  scene.add(helper)
}

function updateTarget() {
  if (!targetMesh) return
  
  targetMesh.position.set(targetX.value, targetY.value, targetZ.value)
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  
  if (controls) {
    controls.update()
  }
  
  // Ensure matrices are updated before IK solver
  if (scene) {
    scene.updateMatrixWorld(true)
  }
  
  // Simple animation to demonstrate movement
  if (craneMesh && craneMesh.skeleton) {
    const bones = craneMesh.skeleton.bones
    const time = Date.now() * 0.001
    
    // Animate base rotation (swing)
    if (bones[0]) {
      bones[0].rotation.y = Math.sin(time * 0.5) * 0.5
    }
    
    // Animate middle bones
    for (let i = 1; i < bones.length; i++) {
      if (bones[i]) {
        bones[i].rotation.z = Math.sin(time + i) * 0.2
      }
    }
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function resetTarget() {
  targetX.value = 200
  targetY.value = 300
  targetZ.value = 0
}

function handleResize() {
  if (!containerRef.value) return
  
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
}

watch([targetX, targetY, targetZ], updateTarget)

onMounted(() => {
  initThreeJS()
  updateTarget()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  renderer.dispose()
})
</script>

<style scoped>
.crane-ik-demo {
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
  left: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.controls h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
}

.controls label {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.controls input[type="range"] {
  width: 150px;
}

.controls span {
  width: 60px;
  font-family: monospace;
}

.controls button {
  margin-top: 10px;
  padding: 8px 16px;
  background: #ff6600;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #e55500;
}
</style>