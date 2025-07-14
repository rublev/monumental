<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CustomAxesHelper } from '@/utils/CustomAxesHelper'

const container = ref<HTMLDivElement>()

// Target position controls
const targetPosition = reactive({
  x: 200,
  y: 150,
  z: -200
})

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let keydownHandler: (event: KeyboardEvent) => void
let targetMesh: THREE.Mesh
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let clickPlane: THREE.Mesh

const initScene = () => {
  if (!container.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  // Camera setup
  const aspect = container.value.clientWidth / container.value.clientHeight
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000)
  camera.position.set(467.1499989026993, 203.9949611629354, -104.71262486187706)
  camera.lookAt(0, 100, 0)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(-4.393079717245485, 149.78045123816514, -78.00307962265074)
  controls.update()

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(200, 400, 200)
  directionalLight.castShadow = true
  directionalLight.shadow.camera.left = -500
  directionalLight.shadow.camera.right = 500
  directionalLight.shadow.camera.top = 500
  directionalLight.shadow.camera.bottom = -500
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 1000
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000)
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x404040,
    roughness: 0.8,
    metalness: 0.2
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Grid helper
  const gridHelper = new THREE.GridHelper(1000, 50, 0x666666, 0x444444)
  scene.add(gridHelper)

  // Custom axes helper with thicker lines and labels
  const axesHelper = new CustomAxesHelper(400)
  scene.add(axesHelper)

  // Create the FABRIK-based crane
  const craneData = createCraneWithFABRIK()
  
  // Store crane data for later use
  ;(window as any).craneData = craneData
  
  // Create target sphere for visualization
  const targetGeometry = new THREE.SphereGeometry(10)
  const targetMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5
  })
  targetMesh = new THREE.Mesh(targetGeometry, targetMaterial)
  targetMesh.position.set(targetPosition.x, targetPosition.y, targetPosition.z)
  scene.add(targetMesh)
  
  // Set up raycaster for 3D clicking
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  
  // Create an invisible plane for clicking
  const planeGeometry = new THREE.PlaneGeometry(1000, 1000)
  const planeMaterial = new THREE.MeshBasicMaterial({ 
    visible: false,
    side: THREE.DoubleSide 
  })
  clickPlane = new THREE.Mesh(planeGeometry, planeMaterial)
  clickPlane.rotation.x = -Math.PI / 2 // Make it horizontal
  scene.add(clickPlane)

  // Add keyboard listener for camera debugging and crane toggle
  keydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'c' || event.key === 'C') {
      console.log('=== Camera Values ===')
      console.log('Position:', {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      })
      console.log('Rotation:', {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z
      })
      console.log('Controls Target:', {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z
      })
      console.log('--- Copy-paste ready ---')
      console.log(`camera.position.set(${camera.position.x}, ${camera.position.y}, ${camera.position.z})`)
      console.log(`controls.target.set(${controls.target.x}, ${controls.target.y}, ${controls.target.z})`)
    }
    
    // Toggle crane visibility
    if (event.key === 'b' || event.key === 'B') {
      const { craneGroup } = (window as any).craneData
      craneGroup.visible = !craneGroup.visible
      console.log('Crane:', craneGroup.visible ? 'Visible' : 'Hidden')
    }
  }
  window.addEventListener('keydown', keydownHandler)
  
  // Add mouse click handler
  const handleMouseClick = (event: MouseEvent) => {
    if (!container.value) return
    
    // Calculate mouse position in normalized device coordinates
    const rect = container.value.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera)
    
    // Position click plane at current target height
    clickPlane.position.y = targetMesh.position.y
    
    // Check for intersection with the click plane
    const intersects = raycaster.intersectObject(clickPlane)
    
    if (intersects.length > 0) {
      const point = intersects[0].point
      
      // Update target position values (this will trigger the watcher)
      targetPosition.x = point.x
      targetPosition.y = point.y
      targetPosition.z = point.z
      
      console.log('Target position:', point)
    }
  }
  
  container.value.addEventListener('click', handleMouseClick)

  window.addEventListener('resize', handleResize)
}

const createCraneWithFABRIK = (): { crane: any, craneGroup: THREE.Group } => {
  // Create root group for the entire crane
  const craneGroup = new THREE.Group()
  
  // Create crane using FABRIK-style structure
  const crane = {
    // Crane parameters - scaled up from FABRIK version
    liftHeight: 250,
    liftMin: 70,  // Base height + clearance
    liftMax: 300, // Near top of column
    upperArmLength: 100, // Length of first arm
    lowerArmLength: 80,  // Length of second arm
    wristExtLength: 60,  // Vertical drop
    
    // Object3D hierarchy - same as FABRIK but scaled up
    base: new THREE.Object3D(),
    swingJoint: new THREE.Object3D(), // Main column (rotates entire tower)
    liftJoint: new THREE.Object3D(),  // Vertical slide
    shoulderJoint: new THREE.Object3D(), // First arm attachment (no rotation)
    elbowJoint: new THREE.Object3D(),    // Second arm articulation
    wristJoint: new THREE.Object3D(),    // End of horizontal arm
    endEffector: new THREE.Object3D()    // Gripper tip
  }
  
  // Build the crane hierarchy
  crane.base.add(crane.swingJoint)
  crane.swingJoint.add(crane.liftJoint)
  crane.liftJoint.add(crane.shoulderJoint)
  crane.shoulderJoint.add(crane.elbowJoint)
  crane.elbowJoint.add(crane.wristJoint)
  crane.wristJoint.add(crane.endEffector)
  
  // Set initial positions
  crane.liftJoint.position.y = crane.liftHeight
  crane.elbowJoint.position.z = -crane.upperArmLength
  crane.wristJoint.position.z = -crane.lowerArmLength
  crane.endEffector.position.y = -crane.wristExtLength
  
  // Create materials
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc,
    roughness: 0.7,
    metalness: 0.3
  })
  const armMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.6,
    metalness: 0.4
  })
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.5,
    metalness: 0.6
  })
  const gripperMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.4
  })
  
  // 1. Base (attached to base object)
  const baseRadius = 60
  const baseHeight = 20
  const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32)
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = baseHeight / 2
  base.castShadow = true
  base.receiveShadow = true
  crane.base.add(base)
  
  // 2. Tower/Column (static, attached to swingJoint so it rotates with base)
  const columnWidth = 50
  const columnDepth = 50
  const columnHeight = 300
  const beamThickness = 3
  const segmentHeight = 30
  const numSegments = Math.floor(columnHeight / segmentHeight)
  
  const towerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFA500,
    roughness: 0.7,
    metalness: 0.3
  })
  
  const towerGroup = new THREE.Group()
  
  // Corner posts (vertical beams)
  const cornerPositions = [
    [-columnWidth/2, 0, -columnDepth/2],
    [columnWidth/2, 0, -columnDepth/2],
    [-columnWidth/2, 0, columnDepth/2],
    [columnWidth/2, 0, columnDepth/2]
  ]
  
  cornerPositions.forEach(pos => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(beamThickness, columnHeight, beamThickness),
      towerMaterial
    )
    post.position.set(pos[0], columnHeight/2 + baseHeight, pos[2])
    post.castShadow = true
    post.receiveShadow = true
    towerGroup.add(post)
  })
  
  // Create horizontal and diagonal bracing for each segment
  for (let i = 0; i < numSegments; i++) {
    const y = baseHeight + i * segmentHeight + segmentHeight / 2
    
    // Horizontal braces (3 per segment - front face left open)
    const horizontalBraces = [
      // Back
      { pos: [0, y, columnDepth/2], rot: [0, 0, 0], size: [columnWidth, beamThickness, beamThickness] },
      // Left
      { pos: [-columnWidth/2, y, 0], rot: [0, Math.PI/2, 0], size: [columnDepth, beamThickness, beamThickness] },
      // Right
      { pos: [columnWidth/2, y, 0], rot: [0, Math.PI/2, 0], size: [columnDepth, beamThickness, beamThickness] }
    ]
    
    horizontalBraces.forEach(brace => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(brace.size[0], brace.size[1], brace.size[2]),
        towerMaterial
      )
      mesh.position.set(brace.pos[0], brace.pos[1], brace.pos[2])
      mesh.rotation.set(brace.rot[0], brace.rot[1], brace.rot[2])
      mesh.castShadow = true
      mesh.receiveShadow = true
      towerGroup.add(mesh)
    })
    
    // Diagonal braces (X pattern on each face)
    const diagonalLength = Math.sqrt(columnWidth * columnWidth + segmentHeight * segmentHeight)
    const diagonalAngle = Math.atan2(segmentHeight, columnWidth)
    
    // X-braces on back face only (front face left open for lift arm)
    const faceDiagonals = [
      // Back face diagonals only
      { pos: [0, y, columnDepth/2 - beamThickness/2], rotY: 0, rotZ: diagonalAngle },
      { pos: [0, y, columnDepth/2 - beamThickness/2], rotY: 0, rotZ: -diagonalAngle }
    ]
    
    faceDiagonals.forEach(diag => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(diagonalLength, beamThickness, beamThickness),
        towerMaterial
      )
      mesh.position.set(diag.pos[0], diag.pos[1], diag.pos[2])
      mesh.rotation.set(0, diag.rotY, diag.rotZ)
      mesh.castShadow = true
      mesh.receiveShadow = true
      towerGroup.add(mesh)
    })
    
    // X-braces on left and right faces
    const sideDiagonals = [
      // Left face diagonals
      { pos: [-columnWidth/2 + beamThickness/2, y, 0], rotY: Math.PI/2, rotZ: diagonalAngle },
      { pos: [-columnWidth/2 + beamThickness/2, y, 0], rotY: Math.PI/2, rotZ: -diagonalAngle },
      // Right face diagonals
      { pos: [columnWidth/2 - beamThickness/2, y, 0], rotY: Math.PI/2, rotZ: diagonalAngle },
      { pos: [columnWidth/2 - beamThickness/2, y, 0], rotY: Math.PI/2, rotZ: -diagonalAngle }
    ]
    
    sideDiagonals.forEach(diag => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(diagonalLength, beamThickness, beamThickness),
        towerMaterial
      )
      mesh.position.set(diag.pos[0], diag.pos[1], diag.pos[2])
      mesh.rotation.set(0, diag.rotY, diag.rotZ)
      mesh.castShadow = true
      mesh.receiveShadow = true
      towerGroup.add(mesh)
    })
  }
  
  // Rotate tower so open face aligns with arm direction (arm extends in -Z)
  towerGroup.rotation.y = 0 // No rotation needed - arm extends in -Z, open face is at -Z
  crane.swingJoint.add(towerGroup)
  
  // Column top cap
  const capGeometry = new THREE.BoxGeometry(columnWidth + 10, 10, columnDepth + 10)
  const capMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x777777,
    roughness: 0.6,
    metalness: 0.4
  })
  const cap = new THREE.Mesh(capGeometry, capMaterial)
  cap.position.y = baseHeight + columnHeight + 5
  cap.castShadow = true
  cap.receiveShadow = true
  crane.swingJoint.add(cap)
  
  // 3. Lift (attached to lift joint)
  const liftWidth = columnWidth - beamThickness * 2 - 10
  const liftDepth = columnDepth - beamThickness * 2 - 10
  const liftHeightMesh = 25
  const liftGeometry = new THREE.BoxGeometry(liftWidth, liftHeightMesh, liftDepth)
  const liftMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffcc00,
    roughness: 0.5,
    metalness: 0.5,
    emissive: 0xffcc00,
    emissiveIntensity: 0.1
  })
  const lift = new THREE.Mesh(liftGeometry, liftMaterial)
  lift.castShadow = true
  lift.receiveShadow = true
  crane.liftJoint.add(lift)
  
  // 4. First arm (attached to shoulder joint)
  const armBlock1 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 100),
    armMaterial
  )
  armBlock1.position.z = -50 // Center of arm
  armBlock1.castShadow = true
  armBlock1.receiveShadow = true
  crane.shoulderJoint.add(armBlock1)
  
  // 5. Elbow joint visual (attached to elbow joint)
  const elbowJointVisual = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 5, 32),
    jointMaterial
  )
  elbowJointVisual.position.set(0, -12.5, 5)
  elbowJointVisual.castShadow = true
  elbowJointVisual.receiveShadow = true
  crane.elbowJoint.add(elbowJointVisual)
  
  // 6. Second arm (attached to elbow joint)
  const armBlock2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 80),
    armMaterial
  )
  armBlock2.position.set(0, -25, -40)
  armBlock2.castShadow = true
  armBlock2.receiveShadow = true
  crane.elbowJoint.add(armBlock2)
  
  // 7. Wrist joint visual (attached to wrist joint)
  const wristJointVisual = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 5, 32),
    jointMaterial
  )
  wristJointVisual.position.set(0, -12.5, 5)
  wristJointVisual.castShadow = true
  wristJointVisual.receiveShadow = true
  crane.wristJoint.add(wristJointVisual)
  
  // 8. Third arm/vertical column (attached to wrist joint)
  const armBlock3 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 60, 20),
    armMaterial
  )
  armBlock3.position.y = -30
  armBlock3.castShadow = true
  armBlock3.receiveShadow = true
  crane.wristJoint.add(armBlock3)
  
  // 9. Gripper (attached to end effector)
  const gripperGroup = new THREE.Group()
  
  const gripperBase = new THREE.Mesh(
    new THREE.BoxGeometry(25, 10, 25),
    gripperMaterial
  )
  gripperGroup.add(gripperBase)
  
  const fixedJaw = new THREE.Mesh(
    new THREE.BoxGeometry(5, 15, 20),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.3
    })
  )
  fixedJaw.position.set(-10, -10, 0)
  gripperGroup.add(fixedJaw)
  
  const movableJaw = new THREE.Mesh(
    new THREE.BoxGeometry(5, 15, 20),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.3
    })
  )
  movableJaw.position.set(10, -10, 0)
  gripperGroup.add(movableJaw)
  
  crane.endEffector.add(gripperGroup)
  
  
  // Add crane to scene
  craneGroup.add(crane.base)
  craneGroup.visible = true
  scene.add(craneGroup)
  
  // Return crane for use
  return { crane, craneGroup }
}


const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  controls.update()
  
  // Update FABRIK solver
  if (targetMesh) {
    const { crane } = (window as any).craneData
    
    // Call the FABRIK solve function
    crane.solveIK(targetMesh.position)
  }
  
  renderer.render(scene, camera)
}

const handleResize = () => {
  if (!container.value) return

  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

// Watch target position changes
watch(targetPosition, (newPos) => {
  if (targetMesh) {
    targetMesh.position.set(newPos.x, newPos.y, newPos.z)
  }
})

// Reset target position
const resetTarget = () => {
  targetPosition.x = 200
  targetPosition.y = 150
  targetPosition.z = -200
}

onMounted(() => {
  initScene()
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler)
  }
  
  if (renderer) {
    renderer.dispose()
    container.value?.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div ref="container" class="w-full h-full min-h-[600px] bg-gray-900 relative">
    <div class="absolute top-4 left-4 text-white bg-black/50 p-2 rounded text-sm">
      <div>Click anywhere to move the crane gripper</div>
      <div>Press 'C' to log camera values to console</div>
      <div>Press 'B' to toggle skeleton helper</div>
    </div>

    <!-- Control Panel -->
    <div class="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
      <h3 class="text-lg font-bold mb-4">Target Position</h3>

      <!-- X Slider -->
      <div class="mb-3">
        <label class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">X:</span>
          <span class="text-sm font-mono">{{ targetPosition.x.toFixed(0) }}mm</span>
        </label>
        <input type="range" v-model.number="targetPosition.x" min="-400" max="400"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
      </div>

      <!-- Y Slider -->
      <div class="mb-3">
        <label class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">Y:</span>
          <span class="text-sm font-mono">{{ targetPosition.y.toFixed(0) }}mm</span>
        </label>
        <input type="range" v-model.number="targetPosition.y" min="0" max="300"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
      </div>

      <!-- Z Slider -->
      <div class="mb-3">
        <label class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">Z:</span>
          <span class="text-sm font-mono">{{ targetPosition.z.toFixed(0) }}mm</span>
        </label>
        <input type="range" v-model.number="targetPosition.z" min="-400" max="400"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
      </div>

      <!-- Reset Button -->
      <button @click="resetTarget"
        class="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        Reset Position
      </button>
    </div>
  </div>
</template>