<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js'
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
let ikSolver: CCDIKSolver
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

  // Create the bone-based crane
  const craneData = createCraneWithBones()
  
  // Store crane data for later use
  ;(window as any).craneData = craneData
  
  // Set up IK solver
  setupIKSolver(craneData)
  
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
    
    // Toggle skeleton helper visibility
    if (event.key === 'b' || event.key === 'B') {
      const { helper } = (window as any).craneData
      helper.visible = !helper.visible
      console.log('Skeleton helper:', helper.visible ? 'Visible' : 'Hidden')
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

// Original crane function removed - using bone-based crane only
const createCrane_OLD = () => {
  // Crane group
  const craneGroup = new THREE.Group()
  craneGroup.name = 'craneGroup'
  
  // 1. Circular base (from reference images)
  const baseRadius = 60
  const baseHeight = 20
  const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32)
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc,
    roughness: 0.7,
    metalness: 0.3
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = baseHeight / 2
  base.castShadow = true
  base.receiveShadow = true
  craneGroup.add(base)

  // 2. Tower crane mast with lattice structure
  const columnWidth = 50
  const columnDepth = 50
  const columnHeight = 300
  const beamThickness = 3
  const segmentHeight = 30 // Height of each lattice segment
  const numSegments = Math.floor(columnHeight / segmentHeight)

  // Material for the tower structure
  const towerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFA500, // Orange color like the reference
    roughness: 0.7,
    metalness: 0.3
  })

  // Create tower mast group
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
    post.position.set(pos[0], baseHeight + columnHeight/2, pos[2])
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

  craneGroup.add(towerGroup)

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
  craneGroup.add(cap)

  // 3. Lift block inside column
  const liftWidth = columnWidth - beamThickness * 2 - 10 // Leave some clearance
  const liftDepth = columnDepth - beamThickness * 2 - 10
  const liftHeight = 25
  const liftGeometry = new THREE.BoxGeometry(liftWidth, liftHeight, liftDepth)
  const liftMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffcc00,
    roughness: 0.5,
    metalness: 0.5,
    emissive: 0xffcc00,
    emissiveIntensity: 0.1
  })
  const lift = new THREE.Mesh(liftGeometry, liftMaterial)
  lift.position.y = baseHeight + columnHeight * 0.75 // Position at 75% of column height
  lift.castShadow = true
  lift.receiveShadow = true
  craneGroup.add(lift)

  // 4. Hierarchical crane arm structure for IK
  // Shoulder group (attached to lift)
  const shoulderGroup = new THREE.Group()
  shoulderGroup.position.set(0, 0, -(liftDepth/2 + 10))
  lift.add(shoulderGroup)
  
  // First arm
  const armBlock1 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 100),
    new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.6,
      metalness: 0.4
    })
  )
  armBlock1.position.set(0, 0, -50) // Center at -50 (half length)
  armBlock1.castShadow = true
  armBlock1.receiveShadow = true
  shoulderGroup.add(armBlock1)
  
  // Elbow group (pivot point for second arm)
  const elbowGroup = new THREE.Group()
  elbowGroup.position.set(0, 0, -100) // At end of first arm
  shoulderGroup.add(elbowGroup)
  
  // Elbow joint visual (pulled back to hide under arm)
  const elbowJoint = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, 10, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.6
    })
  )
  elbowJoint.position.set(0, -15, 10) // Below arm and pulled back
  elbowJoint.castShadow = true
  elbowJoint.receiveShadow = true
  elbowGroup.add(elbowJoint)
  
  // Second arm
  const armBlock2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 100),
    new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.6,
      metalness: 0.4
    })
  )
  armBlock2.position.set(0, -15, -40) // Below joint, centered at -40
  armBlock2.castShadow = true
  armBlock2.receiveShadow = true
  elbowJoint.add(armBlock2)
  
  // Wrist group (pivot point for third arm)
  // const wristGroup = new THREE.Group()
  // wristGroup.position.set(0, -25, -80) // At end of second arm
  // armBlock2.add(wristGroup)
  
  // Wrist joint visual (pulled back to hide under arm)
  const wristJoint = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, 10, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.6
    })
  )
  wristJoint.position.set(0, -15, -40) // Below arm and pulled back
  wristJoint.castShadow = true
  wristJoint.receiveShadow = true
  armBlock2.add(wristJoint)
  
  // // Third arm (vertical)
  // const armBlock3 = new THREE.Mesh(
  //   new THREE.BoxGeometry(20, 60, 20),
  //   new THREE.MeshStandardMaterial({
  //     color: 0x808080,
  //     roughness: 0.6,
  //     metalness: 0.4
  //   })
  // )
  // armBlock3.position.set(0, -55, 10) // Below joint, extends down
  // armBlock3.castShadow = true
  // armBlock3.receiveShadow = true
  // wristGroup.add(armBlock3)
  
  // // Gripper mount group
  // const gripperMountGroup = new THREE.Group()
  // // gripperMountGroup.position.set(0, -72.5, 0) // At end of third arm
  // wristGroup.add(gripperMountGroup)
  
  // // Gripper extension arm
  // const gripperArm = new THREE.Mesh(
  //   new THREE.BoxGeometry(20, 10, 60),
  //   new THREE.MeshStandardMaterial({
  //     color: 0x808080,
  //     roughness: 0.6,
  //     metalness: 0.4
  //   })
  // )
  // gripperArm.position.set(0, 0, 0)
  // gripperArm.castShadow = true
  // gripperArm.receiveShadow = true
  // gripperMountGroup.add(gripperArm)
  
  // // Gripper
  // const gripperGroup = new THREE.Group()
  // gripperGroup.position.set(0, -15, -30)
  // gripperGroup.rotation.y = Math.PI / 2
  // gripperMountGroup.add(gripperGroup)
  
  // const gripperBase = new THREE.Mesh(
  //   new THREE.BoxGeometry(25, 10, 25),
  //   new THREE.MeshStandardMaterial({
  //     color: 0x444444,
  //     roughness: 0.6,
  //     metalness: 0.4
  //   })
  // )
  // gripperGroup.add(gripperBase)
  
  // const fixedJaw = new THREE.Mesh(
  //   new THREE.BoxGeometry(5, 15, 20),
  //   new THREE.MeshStandardMaterial({
  //     color: 0x333333,
  //     roughness: 0.7,
  //     metalness: 0.3
  //   })
  // )
  // fixedJaw.position.set(-10, -10, 0)
  // gripperGroup.add(fixedJaw)
  
  // const movableJaw = new THREE.Mesh(
  //   new THREE.BoxGeometry(5, 15, 20),
  //   new THREE.MeshStandardMaterial({
  //     color: 0x333333,
  //     roughness: 0.7,
  //     metalness: 0.3
  //   })
  // )
  // movableJaw.position.set(10, -10, 0)
  // gripperGroup.add(movableJaw)
  
  // Add crane to scene
  scene.add(craneGroup)
}

const createCraneWithBones = (): { bones: THREE.Bone[], skeleton: THREE.Skeleton, helper: THREE.SkeletonHelper, craneGroup: THREE.Group } => {
  // Create root group for the entire crane
  const craneGroup = new THREE.Group()
  
  // Create bones for the kinematic chain
  const bones: THREE.Bone[] = []
  
  // Root bone (for base rotation)
  const rootBone = new THREE.Bone()
  rootBone.name = 'base'
  bones.push(rootBone)
  
  // Lift bone (for vertical translation)
  const liftBone = new THREE.Bone()
  liftBone.name = 'lift'
  liftBone.position.y = 250 // Initial lift height (75% of 300 column height + base)
  rootBone.add(liftBone)
  bones.push(liftBone)
  
  // Shoulder bone (first arm attachment point)
  const shoulderBone = new THREE.Bone()
  shoulderBone.name = 'shoulder'
  shoulderBone.position.z = -35 // Forward from lift
  liftBone.add(shoulderBone)
  bones.push(shoulderBone)
  
  // Elbow bone (between first and second arm)
  const elbowBone = new THREE.Bone()
  elbowBone.name = 'elbow'
  elbowBone.position.z = -100 // Length of first arm
  shoulderBone.add(elbowBone)
  bones.push(elbowBone)
  
  // Wrist bone (between second arm and vertical column)
  const wristBone = new THREE.Bone()
  wristBone.name = 'wrist'
  wristBone.position.set(0, -25, -80) // End of second arm
  elbowBone.add(wristBone)
  bones.push(wristBone)
  
  // Gripper bone (end effector)
  const gripperBone = new THREE.Bone()
  gripperBone.name = 'gripper'
  gripperBone.position.y = -60 // Length of vertical column
  wristBone.add(gripperBone)
  bones.push(gripperBone)
  
  // Create skeleton
  const skeleton = new THREE.Skeleton(bones)
  
  // Helper to visualize bones
  const helper = new THREE.SkeletonHelper(rootBone)
  helper.material.linewidth = 3
  scene.add(helper)
  
  // Now create visual meshes and attach them to bones
  
  // 1. Base (attached to root bone)
  const baseRadius = 60
  const baseHeight = 20
  const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32)
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc,
    roughness: 0.7,
    metalness: 0.3
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = baseHeight / 2
  base.castShadow = true
  base.receiveShadow = true
  rootBone.add(base)
  
  // 2. Tower/Column (static, attached to root)
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
  
  rootBone.add(towerGroup)
  
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
  rootBone.add(cap)
  
  // 3. Lift (attached to lift bone)
  const liftWidth = columnWidth - beamThickness * 2 - 10
  const liftDepth = columnDepth - beamThickness * 2 - 10
  const liftHeight = 25
  const liftGeometry = new THREE.BoxGeometry(liftWidth, liftHeight, liftDepth)
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
  liftBone.add(lift)
  
  // 4. First arm (attached to shoulder bone)
  const armBlock1 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 100),
    new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.6,
      metalness: 0.4
    })
  )
  armBlock1.position.z = -50 // Center of arm
  armBlock1.castShadow = true
  armBlock1.receiveShadow = true
  shoulderBone.add(armBlock1)
  
  // 5. Elbow joint visual (attached to elbow bone)
  const elbowJoint = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 5, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.6
    })
  )
  elbowJoint.position.set(0, -12.5, 5)
  elbowJoint.castShadow = true
  elbowJoint.receiveShadow = true
  elbowBone.add(elbowJoint)
  
  // 6. Second arm (attached to elbow bone)
  const armBlock2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 80),
    new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.6,
      metalness: 0.4
    })
  )
  armBlock2.position.set(0, -25, -40)
  armBlock2.castShadow = true
  armBlock2.receiveShadow = true
  elbowBone.add(armBlock2)
  
  // 7. Wrist joint visual (attached to wrist bone)
  const wristJoint = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 5, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.6
    })
  )
  wristJoint.position.set(0, -12.5, 5)
  wristJoint.castShadow = true
  wristJoint.receiveShadow = true
  wristBone.add(wristJoint)
  
  // 8. Third arm/vertical column (attached to wrist bone)
  const armBlock3 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 60, 20),
    new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.6,
      metalness: 0.4
    })
  )
  armBlock3.position.y = -30
  armBlock3.castShadow = true
  armBlock3.receiveShadow = true
  wristBone.add(armBlock3)
  
  // 9. Gripper (attached to gripper bone)
  const gripperGroup = new THREE.Group()
  
  const gripperBase = new THREE.Mesh(
    new THREE.BoxGeometry(25, 10, 25),
    new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6,
      metalness: 0.4
    })
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
  
  gripperBone.add(gripperGroup)
  
  // Add root bone to crane group
  craneGroup.add(rootBone)
  
  // Add crane to scene (visible by default now)
  craneGroup.visible = true
  scene.add(craneGroup)
  
  // Show the skeleton helper
  helper.visible = true
  
  // Return bones and skeleton for IK solver setup
  return { bones, skeleton, helper, craneGroup }
}

// Calculate the vertical offset from gripper to lift top
const calculateGripperToLiftOffset = (bones: THREE.Bone[]) => {
  // Calculate total vertical distance from lift to gripper
  // This includes: shoulder offset + arm lengths + joint offsets
  const shoulderOffset = bones[2].position.y // Should be 0
  const elbowOffset = bones[3].position.y // Should be 0
  const wristOffset = bones[4].position.y // -25 (arm2 drops down)
  const gripperOffset = bones[5].position.y // -60 (vertical column length)
  
  // Total offset from lift position to gripper
  return shoulderOffset + elbowOffset + wristOffset + gripperOffset // = -85
}

// Calculate required lift height for target position
const calculateLiftHeight = (targetY: number, bones: THREE.Bone[]) => {
  const offset = calculateGripperToLiftOffset(bones)
  const baseHeight = 20 // Base height constant
  const minLiftHeight = baseHeight + 50 // Minimum to clear base
  const maxLiftHeight = baseHeight + 280 // Maximum (near top of column)
  
  // Required lift height = target Y - offset
  let liftHeight = targetY - offset
  
  // Clamp to valid range
  liftHeight = Math.max(minLiftHeight, Math.min(maxLiftHeight, liftHeight))
  
  return liftHeight
}

const setupIKSolver = (craneData: { bones: THREE.Bone[], skeleton: THREE.Skeleton }) => {
  const { bones } = craneData
  
  // Create IK chains
  // Note: We'll create multiple chains since CCDIKSolver doesn't handle prismatic joints
  // We'll handle the lift separately and use IK for the rotational joints
  
  const ikChains = []
  
  // Create the IK target bone that will be controlled
  const targetBone = new THREE.Bone()
  targetBone.name = 'ikTarget'
  bones[5].add(targetBone) // Add as child of gripper
  targetBone.position.set(0, -15, 0) // Position at gripper tip
  bones.push(targetBone) // Add to bones array
  
  // Update skeleton with new bone
  craneData.skeleton.bones = bones
  craneData.skeleton.boneInverses.push(new THREE.Matrix4())
  
  // Chain 1: Base to gripper (excluding lift translation)
  // This chain will handle all rotational joints
  const chain1 = {
    target: 6, // Target bone we just created
    effector: 5, // Gripper bone is the effector
    links: [
      {
        index: 4, // Wrist bone
        rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
        rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
        // Constrain wrist to X-axis rotation for vertical column
        enabled: [true, false, false]
      },
      {
        index: 3, // Elbow bone  
        rotationMin: new THREE.Vector3(-Math.PI, -Math.PI/2, -Math.PI),
        rotationMax: new THREE.Vector3(Math.PI, Math.PI/2, Math.PI),
        // Constrain elbow to Y-axis rotation
        enabled: [false, true, false]
      },
      {
        index: 2, // Shoulder bone
        rotationMin: new THREE.Vector3(-Math.PI, -Math.PI/2, -Math.PI),
        rotationMax: new THREE.Vector3(Math.PI, Math.PI/2, Math.PI),
        // Constrain shoulder to Y-axis rotation
        enabled: [false, true, false]
      },
      {
        index: 0, // Base bone
        rotationMin: new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI),
        rotationMax: new THREE.Vector3(Math.PI, Math.PI, Math.PI),
        // Constrain base to Y-axis rotation
        enabled: [false, true, false]
      }
    ]
  }
  
  ikChains.push(chain1)
  
  // Create a simple mesh to use with the IK solver
  // CCDIKSolver requires a SkinnedMesh
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const positionAttribute = geometry.attributes.position
  const vertex = new THREE.Vector3()
  
  const skinIndices = []
  const skinWeights = []
  
  // Set all vertices to be influenced by the first bone
  for (let i = 0; i < positionAttribute.count; i++) {
    skinIndices.push(0, 0, 0, 0)
    skinWeights.push(1, 0, 0, 0)
  }
  
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4))
  
  const material = new THREE.MeshBasicMaterial({ visible: false })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  
  // Add the root bone to the mesh
  const rootBone = bones[0]
  mesh.add(rootBone)
  
  // Bind the skeleton
  mesh.bind(craneData.skeleton)
  
  // Add to scene
  scene.add(mesh)
  
  // Create IK solver
  ikSolver = new CCDIKSolver(mesh, ikChains)
  
  // Create target sphere for visualization
  const targetGeometry = new THREE.SphereGeometry(10)
  const targetMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5
  })
  targetMesh = new THREE.Mesh(targetGeometry, targetMaterial)
  targetMesh.position.set(targetPosition.x, targetPosition.y, targetPosition.z) // Initial target position
  scene.add(targetMesh)
  
  return ikSolver
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  controls.update()
  
  // Update IK solver
  if (ikSolver && targetMesh) {
    const { bones } = (window as any).craneData
    
    // Get the target bone (last one we added)
    const targetBone = bones[6]
    
    // Update world matrices before IK
    scene.updateMatrixWorld(true)
    
    // Convert target position to world space for the target bone
    // The target bone needs to reach the target mesh position
    const targetWorldPos = targetMesh.position.clone()
    
    // Convert to target bone's parent (gripper) local space
    const gripperWorldMatrix = new THREE.Matrix4()
    bones[5].updateWorldMatrix(true, false)
    gripperWorldMatrix.copy(bones[5].matrixWorld)
    
    const invGripperMatrix = gripperWorldMatrix.clone().invert()
    const localTargetPos = targetWorldPos.clone().applyMatrix4(invGripperMatrix)
    
    // Set target bone to this position
    targetBone.position.copy(localTargetPos)
    targetBone.updateMatrixWorld(true)
    
    // Update IK solver
    ikSolver.update()
    
    // Force update all bone matrices after IK solve
    bones.forEach(bone => bone.updateMatrixWorld(true))
  }
  
  // Test bone animation (disabled for now)
  if ((window as any).craneData && false) {
    const { bones } = (window as any).craneData
    const time = Date.now() * 0.001
    
    // Animate base rotation (Y axis - correct)
    bones[0].rotation.y = Math.sin(time * 0.5) * 0.3
    
    // Animate lift height (Y position - correct)
    bones[1].position.y = 200 + Math.sin(time * 0.7) * 50
    
    // Animate shoulder (should rotate around Y axis for horizontal swing)
    bones[2].rotation.y = Math.sin(time * 0.8) * 0.2
    
    // Animate elbow (should rotate around Y axis for horizontal swing)
    bones[3].rotation.y = Math.sin(time * 0.9) * 0.3
    
    // Animate wrist (should rotate around X axis for vertical column rotation)
    bones[4].rotation.x = Math.sin(time * 1.0) * 0.2
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
    
    // Update lift height when Y changes
    const craneData = (window as any).craneData
    if (craneData) {
      const { bones } = craneData
      const newLiftHeight = calculateLiftHeight(newPos.y, bones)
      bones[1].position.y = newLiftHeight
    }
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
        <input 
          type="range" 
          v-model.number="targetPosition.x" 
          min="-400" 
          max="400" 
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <!-- Y Slider -->
      <div class="mb-3">
        <label class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">Y:</span>
          <span class="text-sm font-mono">{{ targetPosition.y.toFixed(0) }}mm</span>
        </label>
        <input 
          type="range" 
          v-model.number="targetPosition.y" 
          min="0" 
          max="300" 
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <!-- Z Slider -->
      <div class="mb-3">
        <label class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">Z:</span>
          <span class="text-sm font-mono">{{ targetPosition.z.toFixed(0) }}mm</span>
        </label>
        <input 
          type="range" 
          v-model.number="targetPosition.z" 
          min="-400" 
          max="400" 
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <!-- Reset Button -->
      <button 
        @click="resetTarget"
        class="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Reset Position
      </button>
    </div>
  </div>
</template>