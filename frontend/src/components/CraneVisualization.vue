<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CustomAxesHelper } from '@/utils/CustomAxesHelper'

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let keydownHandler: (event: KeyboardEvent) => void

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

  createCrane()

  // Add keyboard listener for camera debugging
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
  }
  window.addEventListener('keydown', keydownHandler)

  window.addEventListener('resize', handleResize)
}

const createCrane = () => {
  // Crane group
  const craneGroup = new THREE.Group()
  
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

const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  controls.update()
  renderer.render(scene, camera)
}

const handleResize = () => {
  if (!container.value) return

  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
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
      Press 'C' to log camera values to console
    </div>
  </div>
</template>