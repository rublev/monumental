import * as THREE from 'three'

// Crane configuration constants
export const CRANE_CONFIG = {
  LIFT: {
    HEIGHT: 8,
    MIN: 2,
    MAX: 14
  },
  ARM: {
    UPPER_LENGTH: 6,
    LOWER_LENGTH: 5,
    WRIST_EXT_LENGTH: 3
  },
  BASE: {
    RADIUS: 4.0,
    HEIGHT: 1,
    SEGMENTS: 32
  },
  TOWER: {
    WIDTH: 3,
    DEPTH: 3,
    HEIGHT: 15,
    BEAM_THICKNESS: 0.3,
    SEGMENT_HEIGHT: 3
  },
  MATERIALS: {
    BASE: { color: 0xcccccc, roughness: 0.7, metalness: 0.3 },
    ARM: { color: 0xfacc15, roughness: 0.4 },
    JOINT: { color: 0x4f46e5, roughness: 0.5 },
    GRIPPER: { color: 0x374151, roughness: 0.6 },
    TOWER: { color: 0xffa500, roughness: 0.7, metalness: 0.3 },
    LIFT: { 
      color: 0xffcc00, 
      roughness: 0.5, 
      metalness: 0.5, 
      emissive: 0xffcc00, 
      emissiveIntensity: 0.1 
    },
    CAP: { color: 0x777777, roughness: 0.6, metalness: 0.4 }
  }
}

export class Crane {
  constructor() {
    this.liftHeight = CRANE_CONFIG.LIFT.HEIGHT
    this.liftMin = CRANE_CONFIG.LIFT.MIN
    this.liftMax = CRANE_CONFIG.LIFT.MAX
    this.upperArmLength = CRANE_CONFIG.ARM.UPPER_LENGTH
    this.lowerArmLength = CRANE_CONFIG.ARM.LOWER_LENGTH
    this.wristExtLength = CRANE_CONFIG.ARM.WRIST_EXT_LENGTH
    this.baseRadius = CRANE_CONFIG.BASE.RADIUS

    this.base = new THREE.Object3D()
    this.swingJoint = new THREE.Object3D()
    this.liftJoint = new THREE.Object3D()
    this.shoulderJoint = new THREE.Object3D()
    this.elbowJoint = new THREE.Object3D()
    this.wristJoint = new THREE.Object3D()
    this.endEffector = new THREE.Object3D()

    this.build()
  }

  build() {
    const materials = this.createMaterials()
    
    this.buildBase(materials)
    this.buildTower(materials)
    this.buildLift(materials)
    this.buildArms(materials)
    this.buildGripper(materials)
    
    this.setupHierarchy()
  }

  createMaterials() {
    return {
      base: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.BASE),
      arm: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.ARM),
      joint: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.JOINT),
      gripper: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.GRIPPER),
      tower: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.TOWER),
      lift: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.LIFT),
      cap: new THREE.MeshStandardMaterial(CRANE_CONFIG.MATERIALS.CAP)
    }
  }

  buildBase(materials) {
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(
        CRANE_CONFIG.BASE.RADIUS,
        CRANE_CONFIG.BASE.RADIUS,
        CRANE_CONFIG.BASE.HEIGHT,
        CRANE_CONFIG.BASE.SEGMENTS
      ),
      materials.base
    )
    basePlate.position.y = CRANE_CONFIG.BASE.HEIGHT / 2
    this.base.add(basePlate)
  }

  buildTower(materials) {
    const { WIDTH, DEPTH, HEIGHT, BEAM_THICKNESS, SEGMENT_HEIGHT } = CRANE_CONFIG.TOWER
    const numSegments = Math.floor(HEIGHT / SEGMENT_HEIGHT)
    const towerGroup = new THREE.Group()

    this.buildCornerPosts(towerGroup, materials.tower, WIDTH, DEPTH, HEIGHT, BEAM_THICKNESS)
    this.buildHorizontalBracing(towerGroup, materials.tower, WIDTH, DEPTH, BEAM_THICKNESS, SEGMENT_HEIGHT, numSegments)
    this.buildTowerCap(materials.cap, WIDTH, DEPTH, HEIGHT)

    towerGroup.rotation.y = -Math.PI / 2
    this.swingJoint.add(towerGroup)
  }

  buildCornerPosts(towerGroup, material, width, depth, height, beamThickness) {
    const cornerPositions = [
      [-width / 2, 0, -depth / 2],
      [width / 2, 0, -depth / 2],
      [-width / 2, 0, depth / 2],
      [width / 2, 0, depth / 2]
    ]

    cornerPositions.forEach((pos) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(beamThickness, height, beamThickness),
        material
      )
      post.position.set(pos[0], height / 2 + 1, pos[2])
      post.castShadow = true
      post.receiveShadow = true
      towerGroup.add(post)
    })
  }

  buildHorizontalBracing(towerGroup, material, width, depth, beamThickness, segmentHeight, numSegments) {
    for (let i = 0; i < numSegments; i++) {
      const y = 1 + i * segmentHeight + segmentHeight / 2

      const braces = [
        {
          pos: [0, y, depth / 2],
          rot: [0, 0, 0],
          size: [width, beamThickness, beamThickness]
        },
        {
          pos: [-width / 2, y, 0],
          rot: [0, Math.PI / 2, 0],
          size: [depth, beamThickness, beamThickness]
        },
        {
          pos: [width / 2, y, 0],
          rot: [0, Math.PI / 2, 0],
          size: [depth, beamThickness, beamThickness]
        }
      ]

      braces.forEach((brace) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(brace.size[0], brace.size[1], brace.size[2]),
          material
        )
        mesh.position.set(brace.pos[0], brace.pos[1], brace.pos[2])
        mesh.rotation.set(brace.rot[0], brace.rot[1], brace.rot[2])
        mesh.castShadow = true
        mesh.receiveShadow = true
        towerGroup.add(mesh)
      })
    }
  }

  buildTowerCap(material, width, depth, height) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1, 0.5, depth + 1),
      material
    )
    cap.position.y = 1 + height + 0.25
    cap.castShadow = true
    cap.receiveShadow = true
    this.swingJoint.add(cap)
  }

  buildLift(materials) {
    const { WIDTH, DEPTH, BEAM_THICKNESS } = CRANE_CONFIG.TOWER
    const liftWidth = WIDTH - BEAM_THICKNESS * 2 - 1
    const liftDepth = DEPTH - BEAM_THICKNESS * 2 - 1
    const liftHeight = 2.5

    const lift = new THREE.Mesh(
      new THREE.BoxGeometry(liftWidth, liftHeight, liftDepth),
      materials.lift
    )
    lift.castShadow = true
    lift.receiveShadow = true
    this.liftJoint.add(lift)
    this.liftJoint.position.y = this.liftHeight
  }

  buildArms(materials) {
    this.buildShoulder(materials)
    this.buildElbow(materials)
    this.buildWrist(materials)
  }

  buildShoulder(materials) {
    const shoulderCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32),
      materials.joint
    )
    this.shoulderJoint.add(shoulderCyl)

    const upperArm = new THREE.Mesh(
      new THREE.BoxGeometry(this.upperArmLength, 0.4, 0.6),
      materials.arm
    )
    upperArm.position.x = this.upperArmLength / 2
    this.shoulderJoint.add(upperArm)
  }

  buildElbow(materials) {
    const elbowCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32),
      materials.joint
    )
    this.elbowJoint.add(elbowCyl)

    const lowerArm = new THREE.Mesh(
      new THREE.BoxGeometry(this.lowerArmLength, 0.4, 0.6),
      materials.arm
    )
    lowerArm.position.x = this.lowerArmLength / 2
    this.elbowJoint.add(lowerArm)
  }

  buildWrist(materials) {
    const wristCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32),
      materials.joint
    )
    this.wristJoint.add(wristCyl)

    const wristExt = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, this.wristExtLength, 0.4),
      materials.base
    )
    wristExt.position.y = -this.wristExtLength / 2
    this.wristJoint.add(wristExt)
  }

  buildGripper(materials) {
    const gripperBase = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.5, 1),
      materials.gripper
    )
    gripperBase.position.y = -this.wristExtLength - 0.25
    this.wristJoint.add(gripperBase)

    const jaw1 = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.8, 0.2),
      materials.gripper
    )
    jaw1.position.set(0, -0.65, -0.6)
    gripperBase.add(jaw1)

    const jaw2 = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.8, 0.2),
      materials.gripper
    )
    jaw2.position.set(0, -0.65, 0.6)
    gripperBase.add(jaw2)

    this.endEffector.position.y = -this.wristExtLength
    this.wristJoint.add(this.endEffector)
  }

  setupHierarchy() {
    this.base.add(this.swingJoint)
    this.swingJoint.add(this.liftJoint)
    this.liftJoint.add(this.shoulderJoint)
    this.shoulderJoint.add(this.elbowJoint)
    this.elbowJoint.position.x = this.upperArmLength
    this.elbowJoint.add(this.wristJoint)
    this.wristJoint.position.x = this.lowerArmLength
  }

  solveIK(targetPosition) {
    this.updateLiftPosition(targetPosition)
    this.solvePlanarIK(targetPosition)
  }

  updateLiftPosition(targetPosition) {
    let liftY = targetPosition.y + this.wristExtLength + 1
    liftY = Math.max(this.liftMin, Math.min(this.liftMax, liftY))
    this.liftJoint.position.y = liftY
  }

  solvePlanarIK(targetPosition) {
    const l1 = this.upperArmLength
    const l2 = this.lowerArmLength
    const targetX = targetPosition.x
    const targetZ = targetPosition.z

    const distSq = targetX * targetX + targetZ * targetZ
    const dist = Math.sqrt(distSq)

    let { elbowAngle, shoulderAngle } = this.calculateJointAngles(distSq, dist, l1, l2, targetX, targetZ)

    this.applyJointRotations(shoulderAngle, elbowAngle)
  }

  calculateJointAngles(distSq, dist, l1, l2, targetX, targetZ) {
    let elbowAngle = Math.acos((distSq - l1 * l1 - l2 * l2) / (2 * l1 * l2))

    const angleToTarget = Math.atan2(targetZ, targetX)
    const angleFromTarget = Math.atan2(
      l2 * Math.sin(elbowAngle),
      l1 + l2 * Math.cos(elbowAngle)
    )
    let shoulderAngle = angleToTarget - angleFromTarget

    // Handle edge cases
    if (dist > l1 + l2) {
      shoulderAngle = angleToTarget
      elbowAngle = 0
    }

    if (dist < Math.abs(l1 - l2)) {
      shoulderAngle = angleToTarget
      elbowAngle = Math.PI
    }

    if (isNaN(elbowAngle)) elbowAngle = 0
    if (isNaN(shoulderAngle)) shoulderAngle = 0

    return { elbowAngle, shoulderAngle }
  }

  applyJointRotations(shoulderAngle, elbowAngle) {
    this.swingJoint.rotation.y = -shoulderAngle
    this.shoulderJoint.rotation.y = 0
    this.elbowJoint.rotation.y = -elbowAngle
  }

  getStats() {
    return {
      liftHeight: this.liftJoint.position.y.toFixed(2),
      shoulderAngle: ((this.shoulderJoint.rotation.y * 180) / Math.PI).toFixed(1),
      elbowAngle: ((this.elbowJoint.rotation.y * 180) / Math.PI).toFixed(1)
    }
  }
}

export function useCrane() {
  const createCrane = () => new Crane()
  
  return {
    createCrane,
    CRANE_CONFIG
  }
}