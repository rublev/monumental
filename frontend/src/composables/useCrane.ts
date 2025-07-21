import * as THREE from 'three'
import { CRANE_CONFIG } from '@monumental/shared'
import type { CraneStats, TargetPosition } from '@monumental/shared'

export interface PathSegment {
  type: 'line' | 'arc'
  start: THREE.Vector3
  end: THREE.Vector3
  length: number
  radius?: number
  startAngle?: number
  angleDiff?: number
}

export interface AnimationState {
  mode: 'IDLE' | 'MOVING_TO_A' | 'GRIPPING' | 'MOVING_TO_B' | 'RELEASING' | 'RETURNING'
  startTime: number
  duration: number
  progress: number
  path: THREE.Vector3[]
  payloadAttached: boolean
}

export class Crane {
  private liftHeight: number
  private liftMin: number
  private liftMax: number
  private upperArmLength: number
  private lowerArmLength: number
  private wristExtLength: number
  private baseRadius: number
  private minRadius: number = 4.0 // Using baseRadius as the obstacle radius

  public base: THREE.Object3D
  public swingJoint: THREE.Object3D
  public liftJoint: THREE.Object3D
  public shoulderJoint: THREE.Object3D
  public elbowJoint: THREE.Object3D
  public wristJoint: THREE.Object3D
  public endEffector: THREE.Object3D
  private towerGroup!: THREE.Group

  public animation: AnimationState = {
    mode: 'IDLE',
    startTime: 0,
    duration: 0,
    progress: 0,
    path: [],
    payloadAttached: false,
  }

  constructor() {
    this.liftHeight = CRANE_CONFIG.LIFT.HEIGHT
    this.liftMin = CRANE_CONFIG.LIFT.MIN
    this.liftMax = CRANE_CONFIG.LIFT.MAX
    this.upperArmLength = CRANE_CONFIG.ARM.UPPER_LENGTH
    this.lowerArmLength = CRANE_CONFIG.ARM.LOWER_LENGTH
    this.wristExtLength = CRANE_CONFIG.ARM.WRIST_EXT_LENGTH
    this.baseRadius = CRANE_CONFIG.BASE.RADIUS
    this.minRadius = this.baseRadius // Use base radius as obstacle radius

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
    this.buildLift(materials)
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
        CRANE_CONFIG.BASE.SEGMENTS,
      ),
      materials.base,
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

  private buildCornerPosts(
    towerGroup: THREE.Group,
    material: THREE.MeshStandardMaterial,
    width: number,
    depth: number,
    height: number,
    beamThickness: number,
  ): void {
    const cornerPositions = [
      [-width / 2, 0, -depth / 2],
      [width / 2, 0, -depth / 2],
      [-width / 2, 0, depth / 2],
      [width / 2, 0, depth / 2],
    ]

    cornerPositions.forEach((pos) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(beamThickness, height, beamThickness),
        material,
      )
      post.position.set(pos[0], height / 2 + 1, pos[2])
      post.castShadow = true
      post.receiveShadow = true
      towerGroup.add(post)
    })
  }

  private buildHorizontalBracing(
    towerGroup: THREE.Group,
    material: THREE.MeshStandardMaterial,
    width: number,
    depth: number,
    beamThickness: number,
    segmentHeight: number,
    numSegments: number,
  ): void {
    for (let i = 0; i < numSegments; i++) {
      const y = 1 + i * segmentHeight + segmentHeight / 2

      const braces = [
        {
          pos: [0, y, depth / 2],
          rot: [0, 0, 0],
          size: [width, beamThickness, beamThickness],
        },
        {
          pos: [-width / 2, y, 0],
          rot: [0, Math.PI / 2, 0],
          size: [depth, beamThickness, beamThickness],
        },
        {
          pos: [width / 2, y, 0],
          rot: [0, Math.PI / 2, 0],
          size: [depth, beamThickness, beamThickness],
        },
      ]

      braces.forEach((brace) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(brace.size[0], brace.size[1], brace.size[2]),
          material,
        )
        mesh.position.set(brace.pos[0], brace.pos[1], brace.pos[2])
        mesh.rotation.set(brace.rot[0], brace.rot[1], brace.rot[2])
        mesh.castShadow = true
        mesh.receiveShadow = true
        towerGroup.add(mesh)
      })
    }
  }

  private buildTowerCap(
    material: THREE.MeshStandardMaterial,
    width: number,
    depth: number,
    height: number,
  ): void {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 1, 0.5, depth + 1), material)
    cap.position.y = 1 + height + 0.25
    cap.castShadow = true
    cap.receiveShadow = true
    this.swingJoint.add(cap)
  }

  private buildLift(materials: ReturnType<typeof this.createMaterials>): void {
    // Lift geometry is now handled by the shoulder joint
    // Just set the lift joint position
    this.liftJoint.position.y = this.liftHeight
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
      materials.lift,
    )
    shoulderLift.castShadow = true
    shoulderLift.receiveShadow = true
    this.shoulderJoint.add(shoulderLift)

    // Tower will be added to swing joint in setupHierarchy() to remain static vertically

    const upperArm = new THREE.Mesh(
      new THREE.BoxGeometry(this.upperArmLength, 0.4, 0.6),
      materials.arm,
    )
    upperArm.position.x = this.upperArmLength / 2
    this.shoulderJoint.add(upperArm)
  }

  private buildElbow(materials: ReturnType<typeof this.createMaterials>): void {
    const elbowCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32), materials.joint)
    this.elbowJoint.add(elbowCyl)

    const lowerArm = new THREE.Mesh(
      new THREE.BoxGeometry(this.lowerArmLength, 0.4, 0.6),
      materials.arm,
    )
    lowerArm.position.x = this.lowerArmLength / 2
    this.elbowJoint.add(lowerArm)
  }

  private buildWrist(materials: ReturnType<typeof this.createMaterials>): void {
    const wristCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32), materials.joint)
    this.wristJoint.add(wristCyl)

    const wristExt = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, this.wristExtLength, 0.4),
      materials.base,
    )
    wristExt.position.y = -this.wristExtLength / 2
    this.wristJoint.add(wristExt)
  }

  private buildGripper(materials: ReturnType<typeof this.createMaterials>): void {
    const gripperBase = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), materials.gripper)
    gripperBase.position.y = -this.wristExtLength - 0.25
    this.wristJoint.add(gripperBase)

    const jaw1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.2), materials.gripper)
    jaw1.position.set(0, -0.65, -0.6)
    gripperBase.add(jaw1)

    const jaw2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.2), materials.gripper)
    jaw2.position.set(0, -0.65, 0.6)
    gripperBase.add(jaw2)

    // Position end effector at the gripping point (between the jaws)
    // The gripper base is at -wristExtLength - 0.25
    // The gripper base extends down by 0.25 (half its height)
    // We want the payload sphere (radius 0.5) to touch the bottom of the gripper base
    // So the end effector should be at -wristExtLength - 0.5 - 0.5 = -wristExtLength - 1.0
    this.endEffector.position.y = -this.wristExtLength - 1.0
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
    this.elbowJoint.position.x = this.upperArmLength
    this.elbowJoint.add(this.wristJoint)
    this.wristJoint.position.x = this.lowerArmLength
  }

  public calculatePath(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    pathSteps: number = 200,
  ): THREE.Vector3[] {
    const pathPoints: THREE.Vector3[] = []
    const pA_2d = new THREE.Vector2(startPoint.x, startPoint.z)
    const pB_2d = new THREE.Vector2(endPoint.x, endPoint.z)
    const lineVec_2d = new THREE.Vector2().subVectors(pB_2d, pA_2d)

    const a = lineVec_2d.dot(lineVec_2d)
    const b = 2 * pA_2d.dot(lineVec_2d)
    const c = pA_2d.dot(pA_2d) - this.minRadius * this.minRadius

    const discriminant = b * b - 4 * a * c

    let intersections_t: number[] = []
    if (discriminant >= 0) {
      const sqrtDiscriminant = Math.sqrt(discriminant)
      const t1 = (-b - sqrtDiscriminant) / (2 * a)
      const t2 = (-b + sqrtDiscriminant) / (2 * a)
      if (t1 > 0.001 && t1 < 0.999) intersections_t.push(t1)
      if (t2 > 0.001 && t2 < 0.999) intersections_t.push(t2)
    }
    intersections_t.sort()

    const pathSegments: PathSegment[] = []
    if (intersections_t.length < 2) {
      pathSegments.push({
        type: 'line',
        start: startPoint,
        end: endPoint,
        length: startPoint.distanceTo(endPoint),
      })
    } else {
      const t1 = intersections_t[0]
      const t2 = intersections_t[1]

      const I1 = new THREE.Vector3().lerpVectors(startPoint, endPoint, t1)
      const I2 = new THREE.Vector3().lerpVectors(startPoint, endPoint, t2)

      pathSegments.push({
        type: 'line',
        start: startPoint,
        end: I1,
        length: startPoint.distanceTo(I1),
      })

      const I1_2d = new THREE.Vector2(I1.x, I1.z)
      const I2_2d = new THREE.Vector2(I2.x, I2.z)
      const startAngle = Math.atan2(I1_2d.y, I1_2d.x)
      let endAngle = Math.atan2(I2_2d.y, I2_2d.x)

      let angleDiff = endAngle - startAngle
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

      pathSegments.push({
        type: 'arc',
        start: I1,
        end: I2,
        radius: this.minRadius,
        startAngle,
        angleDiff,
        length: Math.abs(angleDiff) * this.minRadius,
      })

      pathSegments.push({
        type: 'line',
        start: I2,
        end: endPoint,
        length: I2.distanceTo(endPoint),
      })
    }

    const totalLength = pathSegments.reduce((sum, seg) => sum + seg.length, 0)

    if (totalLength > 0) {
      const numSteps = Math.max(pathSteps, 2)
      for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps
        let distAlongPath = t * totalLength
        let distRemaining = distAlongPath

        for (const segment of pathSegments) {
          if (distRemaining <= segment.length + 0.001) {
            const p_t = segment.length === 0 ? 0 : distRemaining / segment.length

            if (segment.type === 'line') {
              pathPoints.push(new THREE.Vector3().lerpVectors(segment.start, segment.end, p_t))
            } else {
              // arc - fix precision issues at segment boundaries
              if (p_t >= 1.0) {
                // At the end of the arc, use the exact end point to prevent drift
                pathPoints.push(segment.end.clone())
              } else {
                const currentAngle = segment.startAngle! + segment.angleDiff! * p_t
                const x = segment.radius! * Math.cos(currentAngle)
                const z = segment.radius! * Math.sin(currentAngle)
                const y = THREE.MathUtils.lerp(segment.start.y, segment.end.y, p_t)
                pathPoints.push(new THREE.Vector3(x, y, z))
              }
            }
            break
          }
          distRemaining -= segment.length
        }
      }
    } else {
      pathPoints.push(startPoint)
    }

    return pathPoints
  }

  public isReachable(targetPosition: TargetPosition): boolean {
    const targetPos = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
    const horizontalDist = new THREE.Vector2(targetPos.x, targetPos.z).length()
    const maxReach = this.upperArmLength + this.lowerArmLength
    return horizontalDist <= maxReach
  }

  public findMaxReachablePoint(path: THREE.Vector3[]): THREE.Vector3 {
    const maxReach = this.upperArmLength + this.lowerArmLength

    // Find the last reachable point in the path
    for (let i = path.length - 1; i >= 0; i--) {
      const point = path[i]
      const horizontalDist = new THREE.Vector2(point.x, point.z).length()
      if (horizontalDist <= maxReach) {
        return point.clone()
      }
    }

    // If no point is reachable, return the first point (shouldn't happen in normal usage)
    return path[0]?.clone() || new THREE.Vector3()
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
    const horizontalDist = new THREE.Vector2(targetPos.x, targetPos.z).length()

    const dist = horizontalDist
    const distSq = dist * dist

    const l1 = this.upperArmLength
    const l2 = this.lowerArmLength

    if (dist > l1 + l2) {
      // Set joints to fully extended position
      this.shoulderJoint.rotation.y = 0
      this.elbowJoint.rotation.y = 0
      return
    }

    const elbowAngle = -Math.acos((distSq - l1 * l1 - l2 * l2) / (2 * l1 * l2))
    const shoulderAngle =
      Math.atan2(0, horizontalDist) + Math.acos((distSq + l1 * l1 - l2 * l2) / (2 * dist * l1))

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
    }
  }

  public get getBaseRadius(): number {
    return this.baseRadius
  }

  public get getMinRadius(): number {
    return this.minRadius
  }

  public getEndEffectorPosition(): THREE.Vector3 {
    const worldPos = new THREE.Vector3()
    this.endEffector.getWorldPosition(worldPos)
    return worldPos
  }
}

export function useCrane() {
  const createCrane = (): Crane => new Crane()

  return {
    createCrane,
    CRANE_CONFIG,
  }
}
