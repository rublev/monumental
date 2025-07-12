<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number

const initScene = () => {
  if (!container.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  // Camera setup
  const aspect = container.value.clientWidth / container.value.clientHeight
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000)
  camera.position.set(400, 300, 400)
  camera.lookAt(0, 150, 0)

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
  controls.target.set(0, 150, 0)
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

  createCrane()

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
  lift.position.y = baseHeight + 50 // Position inside column, near bottom
  lift.castShadow = true
  lift.receiveShadow = true
  craneGroup.add(lift)

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
  
  if (renderer) {
    renderer.dispose()
    container.value?.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div ref="container" class="w-full h-full min-h-[600px] bg-gray-900"></div>
</template>