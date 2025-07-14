<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { IK, IKChain, IKJoint, IKBallConstraint, IKHelper } from '@/lib/three-ik.module.js'
import * as dat from 'dat.gui'

const DISTANCE = 0.5
const COUNT = 10

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let gui: dat.GUI
let ik: IK
let helper: IKHelper

const initScene = () => {
  if (!container.value) return

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeeeeee)

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100)
  camera.position.set(10, 5, 6)
  camera.lookAt(scene.position)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  container.value.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(10, 10, 0)
  scene.add(light)

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshPhongMaterial({ color: 0x555555 }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  // Grid
  const grid = new THREE.GridHelper(20, 20)
  grid.position.y = 0.001
  scene.add(grid)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)

  // Setup IK
  setupIK()

  // GUI
  gui = new dat.GUI()
  gui.add({ angle: 360 }, 'angle', 0, 360).onChange((value) => {
    ik.chains[0].joints.forEach((joint: any) => {
      if (joint.constraints[0]) {
        joint.constraints[0].angle = value
      }
    })
  })

  window.addEventListener('resize', handleResize)
}

const setupIK = () => {
  ik = new IK()
  const chain = new IKChain()

  // Create bones individually
  const bone0 = new THREE.Bone()
  bone0.position.set(0, 0, 0)

  const bone1 = new THREE.Bone()
  bone1.position.y = DISTANCE
  bone0.add(bone1)

  const bone2 = new THREE.Bone()
  bone2.position.y = DISTANCE
  bone1.add(bone2)

  const bone3 = new THREE.Bone()
  bone3.position.y = DISTANCE
  bone2.add(bone3)

  const bone4 = new THREE.Bone()
  bone4.position.y = DISTANCE
  bone3.add(bone4)

  const bone5 = new THREE.Bone()
  bone5.position.y = DISTANCE
  bone4.add(bone5)

  const bone6 = new THREE.Bone()
  bone6.position.y = DISTANCE
  bone5.add(bone6)

  const bone7 = new THREE.Bone()
  bone7.position.y = DISTANCE
  bone6.add(bone7)

  const bone8 = new THREE.Bone()
  bone8.position.y = DISTANCE
  bone7.add(bone8)

  const bone9 = new THREE.Bone()
  bone9.position.y = DISTANCE
  bone8.add(bone9)

  // Create joints individually
  const joint0 = new IKJoint(bone0, { constraints: [new IKBallConstraint(360)] }) // Allow rotation
  chain.add(joint0)

  const joint1 = new IKJoint(bone1, { constraints: [new IKBallConstraint(360)] }) // Allow rotation
  chain.add(joint1)

  const joint2 = new IKJoint(bone2, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint2)

  const joint3 = new IKJoint(bone3, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint3)

  const joint4 = new IKJoint(bone4, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint4)

  const joint5 = new IKJoint(bone5, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint5)

  const joint6 = new IKJoint(bone6, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint6)

  const joint7 = new IKJoint(bone7, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint7)

  const joint8 = new IKJoint(bone8, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint8)

  // Last joint with target
  const target = new THREE.Object3D()
  const targetControl = new TransformControls(camera, renderer.domElement)
  targetControl.attach(target)
  target.position.set(0, COUNT * DISTANCE, 0)
  scene.add(targetControl)
  scene.add(target)

  targetControl.addEventListener('mouseDown', () => (controls.enabled = false))
  targetControl.addEventListener('mouseUp', () => (controls.enabled = true))

  const joint9 = new IKJoint(bone9, { constraints: [new IKBallConstraint(360)] })
  chain.add(joint9, { target })

  ik.add(chain)

  // Rotate to vertical
  const pivot = new THREE.Object3D()
  pivot.rotation.x = -Math.PI / 2
  pivot.add(ik.getRootBone())
  scene.add(pivot)

  // Helper
  helper = new IKHelper(ik)
  scene.add(helper)
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  ik.solve()

  // Post-solve: Keep first two bones vertical but allow Y rotation
  if (ik.chains && ik.chains[0]) {
    const chain = ik.chains[0]

    // First bone (bone0) - only allow Y rotation
    if (chain.joints[0]) {
      const bone0 = chain.joints[0].bone
      const yRotation = bone0.rotation.y
      bone0.rotation.set(0, yRotation, 0)
    }

    // Second bone (bone1) - keep completely vertical (no rotation)
    if (chain.joints[1]) {
      chain.joints[1].bone.rotation.set(0, 0, 0)
    }
  }

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
  gui?.destroy()
  renderer?.dispose()
})
</script>

<template>
  <div ref="container" class="w-full h-full"></div>
</template>
