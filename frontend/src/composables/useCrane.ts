import * as THREE from 'three'
import { CRANE_CONFIG, SCENE_CONFIG } from '@monumental/shared/config'
import type { CraneStats, TargetPosition, AnimationState } from '@monumental/shared/crane'
import * as CraneMath from '@monumental/shared/crane'

// Helper functions to convert between THREE.Vector3 and Point3D
function vectorToPoint(v: THREE.Vector3): CraneMath.Point3D {
  return { x: v.x, y: v.y, z: v.z }
}

function pointToVector(p: CraneMath.Point3D): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z)
}

function pointsToVectors(points: CraneMath.Point3D[]): THREE.Vector3[] {
  return points.map(pointToVector)
}

// Frontend-specific path segment using THREE.Vector3 for 3D rendering
export interface ThreePathSegment {
  type: 'line' | 'arc'
  start: THREE.Vector3
  end: THREE.Vector3
  length: number
  radius?: number
  startAngle?: number
  angleDiff?: number
}

// Frontend-specific animation state with THREE.js path array
export interface ThreeAnimationState extends AnimationState {
  path: THREE.Vector3[]
}

export class Crane {
  private wristExtLength: number
  private minRadius: number

  public base: THREE.Object3D
  public swingJoint: THREE.Object3D
  public liftJoint: THREE.Object3D
  public shoulderJoint: THREE.Object3D
  public elbowJoint: THREE.Object3D
  public wristJoint: THREE.Object3D
  public endEffector: THREE.Object3D
  private towerGroup!: THREE.Group
  private movingJaw!: THREE.Mesh

  public animation: ThreeAnimationState = {
    mode: 'IDLE',
    startTime: 0,
    duration: 0,
    progress: 0,
    path: [],
    payloadAttached: false,
  }

  constructor() {
    this.wristExtLength = CRANE_CONFIG.ARM.WRIST_EXT_LENGTH
    this.minRadius = CRANE_CONFIG.OBSTACLE.RADIUS

    this.base = new THREE.Object3D()
    this.swingJoint = new THREE.Object3D()
    this.liftJoint = new THREE.Object3D()
    this.shoulderJoint = new THREE.Object3D()
    this.elbowJoint = new THREE.Object3D()
    this.wristJoint = new THREE.Object3D()
    this.endEffector = new THREE.Object3D()

    this.build()
  }

  private build(): void {
    const materials = this.createMaterials()

    this.buildBase(materials)
    this.buildTower(materials)
    this.buildArms(materials)
    this.buildGripper(materials)

    this.setupHierarchy()
  }

  private createMaterials() {
    return {
      base: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.BASE }),
      arm: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.ARM }),
      joint: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.JOINT }),
      gripper: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.GRIPPER }),
      tower: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.TOWER }),
      lift: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.LIFT }),
      cap: new THREE.MeshStandardMaterial({ color: CRANE_CONFIG.MATERIALS.CAP }),
    }
  }

  private buildBase(materials: ReturnType<typeof this.createMaterials>): void {
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

  private buildTower(materials: ReturnType<typeof this.createMaterials>): void {
    const { HEIGHT } = CRANE_CONFIG.TOWER
    const towerGroup = new THREE.Group()

    // Simple cylindrical pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, HEIGHT, 16), materials.tower)
    pole.position.y = HEIGHT / 2
    pole.castShadow = true
    pole.receiveShadow = true
    towerGroup.add(pole)

    // Tower will be added to shoulder joint so it rotates with the lift
    // Store tower group to be added later in buildShoulder
    this.towerGroup = towerGroup
  }

  private buildArms(materials: ReturnType<typeof this.createMaterials>): void {
    this.buildShoulder(materials)
    this.buildElbow(materials)
    this.buildWrist(materials)
  }

  private buildShoulder(materials: ReturnType<typeof this.createMaterials>): void {
    // Replace shoulder cylinder with lift geometry
    const { WIDTH, DEPTH, BEAM_THICKNESS } = CRANE_CONFIG.TOWER
    const liftWidth = WIDTH - BEAM_THICKNESS * 2 - 1
    const liftDepth = DEPTH - BEAM_THICKNESS * 2 - 1
    const liftHeight = 2.5

    const shoulderLift = new THREE.Mesh(
      new THREE.BoxGeometry(liftWidth, liftHeight, liftDepth),
      materials.lift
    )
    shoulderLift.castShadow = true
    shoulderLift.receiveShadow = true
    this.shoulderJoint.add(shoulderLift)

    // Tower will be added to swing joint in setupHierarchy() to remain static vertically

    const upperArm = new THREE.Mesh(
      new THREE.BoxGeometry(CRANE_CONFIG.ARM.UPPER_LENGTH, 0.4, 0.6),
      materials.arm
    )
    upperArm.position.x = CRANE_CONFIG.ARM.UPPER_LENGTH / 2
    this.shoulderJoint.add(upperArm)
  }

  private buildElbow(materials: ReturnType<typeof this.createMaterials>): void {
    const elbowCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32), materials.joint)
    this.elbowJoint.add(elbowCyl)

    const lowerArm = new THREE.Mesh(
      new THREE.BoxGeometry(CRANE_CONFIG.ARM.LOWER_LENGTH, 0.4, 0.6),
      materials.arm
    )
    lowerArm.position.x = CRANE_CONFIG.ARM.LOWER_LENGTH / 2
    this.elbowJoint.add(lowerArm)
  }

  private buildWrist(materials: ReturnType<typeof this.createMaterials>): void {
    const wristCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32), materials.joint)
    this.wristJoint.add(wristCyl)

    const wristExt = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, this.wristExtLength, 0.4),
      materials.base
    )
    wristExt.position.y = -this.wristExtLength / 2
    this.wristJoint.add(wristExt)
  }

  private buildGripper(materials: ReturnType<typeof this.createMaterials>): void {
    // Position gripper base at the END of the wrist extension to create "L" shape
    const gripperBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.8), materials.gripper)
    gripperBase.position.x = 1.0 // Offset horizontally to create "L" shape
    gripperBase.position.y = -this.wristExtLength - 0.25
    this.wristJoint.add(gripperBase)

    // Position jaws at the far ends of the gripper base for proper gripping
    // Moving jaw (will slide along the base length when opening/closing)
    this.movingJaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 1.0), materials.gripper)
    this.movingJaw.position.set(-0.9, -0.65, 0) // Moving jaw starts at far left end
    gripperBase.add(this.movingJaw)

    // Fixed jaw at one end
    const jaw2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 1.0), materials.gripper)
    jaw2.position.set(0.9, -0.65, 0) // Fixed jaw at far right end
    gripperBase.add(jaw2)

    // Position end effector next to the outermost jaw where objects would be picked up
    this.endEffector.position.x = 1.0 + 5.5 // Horizontal offset + beyond the far jaw
    this.endEffector.position.y = -this.wristExtLength - 0.65 // Same level as the jaws
    this.endEffector.position.z = 0 // Centered on the jaw axis
    this.wristJoint.add(this.endEffector)
  }

  private setupHierarchy(): void {
    this.base.add(this.swingJoint)

    // Add tower to swing joint so it rotates but doesn't move up/down with lift
    if (this.towerGroup) {
      this.towerGroup.position.y = 0 // Tower starts at base level
      this.swingJoint.add(this.towerGroup)
    }

    this.swingJoint.add(this.liftJoint)
    this.liftJoint.add(this.shoulderJoint)
    // Add offset to match 3d-playground-v2.html where armAssembly.position.x = 10
    // this.shoulderJoint.position.x = 0 // Scaled down from 10 to match our smaller crane scale
    // this.shoulderJoint.position.z = 0 // Scaled down from 10 to match our smaller crane scale
    this.shoulderJoint.add(this.elbowJoint)
    this.elbowJoint.position.x = CRANE_CONFIG.ARM.UPPER_LENGTH
    this.elbowJoint.add(this.wristJoint)
    this.wristJoint.position.x = CRANE_CONFIG.ARM.LOWER_LENGTH
  }

  public calculatePath(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Vector3[] {
    // Use shared crane math utility and convert back to THREE.Vector3 array
    const pathPoints = CraneMath.calculatePath(vectorToPoint(startPoint), vectorToPoint(endPoint))
    return pointsToVectors(pathPoints)
  }

  public isReachable(targetPosition: TargetPosition): boolean {
    return CraneMath.isReachable(targetPosition)
  }

  public findMaxReachablePoint(path: THREE.Vector3[]): THREE.Vector3 {
    // Convert to Point3D array, use shared utility, convert back to THREE.Vector3
    const plainPoints = path.map(vectorToPoint)
    const maxReachablePoint = CraneMath.findMaxReachablePoint(plainPoints)
    return pointToVector(maxReachablePoint)
  }

  public solveIK(targetPosition: TargetPosition): void {
    const targetPos = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)

    // Calculate swing angle - matching the HTML version exactly
    const swingAngle = Math.atan2(targetPos.x, targetPos.z) - Math.PI / 2
    this.swingJoint.rotation.y = swingAngle

    // Set lift position
    // The end effector is now at -wristExtLength - 1.0 relative to the wrist
    // So we need to adjust the lift position to compensate
    this.liftJoint.position.y = targetPos.y + this.wristExtLength + 1.0

    // Calculate horizontal distance
    // Since the end effector (target position) is offset by 2.2 units forward from the wrist,
    // we need to solve IK for the wrist position that puts the end effector at the target
    const endEffectorOffset = 1.25 // 1.0 (gripper base) + 1.2 (jaw offset)
    const adjustedHorizontalDist = Math.max(
      0,
      new THREE.Vector2(targetPos.x, targetPos.z).length() - endEffectorOffset
    )

    const dist = adjustedHorizontalDist
    const distSq = dist * dist

    const l1 = CRANE_CONFIG.ARM.UPPER_LENGTH
    const l2 = CRANE_CONFIG.ARM.LOWER_LENGTH

    if (dist > l1 + l2) {
      // Set joints to fully extended position
      this.shoulderJoint.rotation.y = 0
      this.elbowJoint.rotation.y = 0
      return
    }

    const elbowAngle = -Math.acos((distSq - l1 * l1 - l2 * l2) / (2 * l1 * l2))
    const shoulderAngle =
      Math.atan2(0, adjustedHorizontalDist) +
      Math.acos((distSq + l1 * l1 - l2 * l2) / (2 * dist * l1))

    if (!isNaN(shoulderAngle) && !isNaN(elbowAngle)) {
      this.shoulderJoint.rotation.y = shoulderAngle
      this.elbowJoint.rotation.y = elbowAngle
      this.wristJoint.rotation.y = -shoulderAngle - elbowAngle
    }
  }

  public getStats(): CraneStats {
    // Calculate shoulder yaw (swing joint rotation relative to positive X-axis)
    const shoulderYawRadians = this.swingJoint.rotation.y
    const shoulderYawDegrees = (shoulderYawRadians * 180) / Math.PI

    // Calculate elbow yaw (elbow joint rotation)
    const elbowYawRadians = this.elbowJoint.rotation.y
    const elbowYawDegrees = (elbowYawRadians * 180) / Math.PI

    // Calculate wrist yaw (wrist joint rotation)
    const wristYawRadians = this.wristJoint.rotation.y
    const wristYawDegrees = (wristYawRadians * 180) / Math.PI

    return {
      position: {
        x: this.liftJoint.position.x,
        y: this.liftJoint.position.y,
        z: this.liftJoint.position.z,
      },
      isMoving: false,
      hasTarget: false,
      lastUpdate: Date.now(),
      liftHeight: this.liftJoint.position.y,
      shoulderYaw: shoulderYawDegrees,
      elbowYaw: elbowYawDegrees,
      wristYaw: wristYawDegrees,
    }
  }

  public get getBaseRadius(): number {
    return CRANE_CONFIG.BASE.RADIUS
  }

  public get getMinRadius(): number {
    return this.minRadius
  }

  public getEndEffectorPosition(): THREE.Vector3 {
    const worldPos = new THREE.Vector3()
    this.endEffector.getWorldPosition(worldPos)
    return worldPos
  }

  public updateGripper(gripperValue: number): void {
    // Animate moving jaw: when gripperValue = 0 (closed), left jaw moves toward center
    // but stops at target's edge to avoid going through it
    const openPosition = -0.9 // Far left when open
    const targetRadius = SCENE_CONFIG.TARGET.RADIUS // 0.5
    const closedPosition = -targetRadius // Stop at target edge when gripping
    const jawX = openPosition + (closedPosition - openPosition) * (1 - gripperValue)
    this.movingJaw.position.x = jawX
  }
}

export function useCrane() {
  const createCrane = (): Crane => new Crane()

  return {
    createCrane,
    CRANE_CONFIG,
  }
}
