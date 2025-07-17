import { CRANE_CONFIG, MessageType } from '@monumental/shared'
import type { CraneStats, TargetPosition } from '@monumental/shared'
import type { 
  ManualControlCommand, 
  StartCycleCommand, 
  CraneStateUpdate,
  BackendToFrontendMessage,
  CycleCompleteNotification 
} from '@monumental/shared'

export interface CraneState {
  // Joint positions
  swing: number // radians
  lift: number // mm
  elbow: number // radians
  wrist: number // radians
  gripper: number // mm (0 = closed, 1 = open)
  
  // Derived values
  endEffectorPosition: { x: number; y: number; z: number }
  payloadPosition: { x: number; y: number; z: number }
  payloadAttached: boolean
  isMoving: boolean
  hasTarget: boolean
  timestamp: number
  sequence: number
  
  // Animation state
  mode: 'IDLE' | 'MOVING_TO_A' | 'GRIPPING' | 'MOVING_TO_B' | 'RELEASING' | 'RETURNING'
  cycleProgress?: {
    isActive: boolean
    currentPhase: 'moving_to_a' | 'at_a' | 'moving_to_b' | 'at_b' | 'idle'
    progressPercent: number
    estimatedTimeRemaining: number
  }
}

export interface CycleConfig {
  pointA: { x: number; y: number; z: number }
  pointB: { x: number; y: number; z: number }
  speed: number
  pathSteps: number
}

export interface PathSegment {
  type: 'line' | 'arc'
  start: { x: number; y: number; z: number }
  end: { x: number; y: number; z: number }
  length: number
  radius?: number
  startAngle?: number
  angleDiff?: number
}

export class CraneController {
  private state: CraneState
  private sequenceNumber = 0
  private cycleConfig: CycleConfig | null = null
  private updateInterval: NodeJS.Timeout | null = null
  private broadcastCallback: ((message: BackendToFrontendMessage) => void) | null = null
  
  // Current path and navigation
  private currentPath: { x: number; y: number; z: number }[] = []
  private pathProgress = 0
  
  // Crane configuration from shared package
  private readonly upperArmLength = CRANE_CONFIG.ARM.UPPER_LENGTH
  private readonly lowerArmLength = CRANE_CONFIG.ARM.LOWER_LENGTH
  private readonly wristExtLength = CRANE_CONFIG.ARM.WRIST_EXT_LENGTH
  private readonly baseRadius = CRANE_CONFIG.BASE.RADIUS
  private readonly minRadius = CRANE_CONFIG.BASE.RADIUS
  private readonly liftMin = CRANE_CONFIG.LIFT.MIN
  private readonly liftMax = CRANE_CONFIG.LIFT.MAX
  
  constructor() {
    this.state = this.createInitialState()
    this.startUpdateLoop()
  }
  
  private createInitialState(): CraneState {
    const homePosition = { x: 8, y: 12, z: 8 }
    const endEffectorPos = homePosition
    
    return {
      swing: 0,
      lift: 12,
      elbow: 0,
      wrist: 0,
      gripper: 0.5,
      endEffectorPosition: endEffectorPos,
      payloadPosition: { x: 0, y: 0, z: 0 }, // Will be set when cycle starts
      payloadAttached: false,
      isMoving: false,
      hasTarget: false,
      timestamp: Date.now(),
      sequence: this.sequenceNumber++,
      mode: 'IDLE',
    }
  }
  
  public setBroadcastCallback(callback: (message: BackendToFrontendMessage) => void) {
    this.broadcastCallback = callback
  }
  
  public handleManualControl(command: ManualControlCommand): void {
    if (this.state.mode !== 'IDLE') {
      console.log('Manual control ignored - crane is not in IDLE mode')
      return
    }
    
    // Apply manual control movements
    const currentPos = this.state.endEffectorPosition
    const newPos = {
      x: currentPos.x + (command.command.endActuatorX || 0) * 0.2,
      y: currentPos.y + (command.command.liftDirection || 0) * 0.2,
      z: currentPos.z + (command.command.endActuatorY || 0) * 0.2,
    }
    
    // Clamp to reasonable bounds
    newPos.x = Math.max(-15, Math.min(15, newPos.x))
    newPos.z = Math.max(-15, Math.min(15, newPos.z))
    newPos.y = Math.max(2, Math.min(25, newPos.y))
    
    // Apply gripper control
    if (command.command.gripperAction === 'open') {
      this.state.gripper = Math.min(1, this.state.gripper + 0.02)
    } else if (command.command.gripperAction === 'close') {
      this.state.gripper = Math.max(0, this.state.gripper - 0.02)
    }
    
    // Update crane state using inverse kinematics
    this.solveIK(newPos)
    this.state.isMoving = true
    this.state.hasTarget = true
    this.state.timestamp = Date.now()
    this.state.sequence = this.sequenceNumber++
  }
  
  public startCycle(command: StartCycleCommand): void {
    if (this.state.mode !== 'IDLE') {
      console.log('Cycle start ignored - crane is not in IDLE mode')
      return
    }
    
    this.cycleConfig = {
      pointA: command.command.pointA,
      pointB: command.command.pointB,
      speed: command.command.speed || 10,
      pathSteps: 200,
    }
    
    // Initialize payload at point A
    this.state.payloadPosition = { ...this.cycleConfig.pointA }
    this.state.payloadAttached = false
    
    this.state.mode = 'MOVING_TO_A'
    this.state.cycleProgress = {
      isActive: true,
      currentPhase: 'moving_to_a',
      progressPercent: 0,
      estimatedTimeRemaining: 0,
    }
    
    console.log('Started cycle from', this.cycleConfig.pointA, 'to', this.cycleConfig.pointB)
  }
  
  public stopCycle(): void {
    // If we're in the middle of a cycle, transition to returning home
    if (this.state.mode !== 'IDLE' && this.state.mode !== 'RETURNING') {
      // Create a temporary cycle config if none exists (for return home path)
      if (!this.cycleConfig) {
        this.cycleConfig = {
          pointA: { x: 0, y: 0, z: 0 },
          pointB: { x: 0, y: 0, z: 0 },
          speed: 10,
          pathSteps: 200,
        }
      }
      
      this.state.mode = 'RETURNING'
      this.state.cycleProgress = {
        isActive: false,
        currentPhase: 'idle',
        progressPercent: 90,
        estimatedTimeRemaining: 0,
      }
      this.currentPath = [] // Clear current path to force recalculation
      this.state.payloadAttached = false // Drop payload if attached
      console.log('Cycle stopped - returning to home')
    } else {
      // If already returning or idle, just stop
      this.cycleConfig = null
      this.state.mode = 'IDLE'
      this.state.cycleProgress = undefined
      this.state.isMoving = false
      this.state.hasTarget = false
      console.log('Cycle stopped')
    }
  }
  
  public emergencyStop(): void {
    this.stopCycle()
    console.log('Emergency stop activated')
  }
  
  public getCurrentState(): CraneState {
    return { ...this.state }
  }
  
  private startUpdateLoop(): void {
    // Send state updates at 60Hz (every ~16ms)
    this.updateInterval = setInterval(() => {
      this.updateCraneState()
      this.broadcastState()
    }, 16)
  }
  
  private updateCraneState(): void {
    if (this.state.mode === 'IDLE') {
      this.state.isMoving = false
      this.state.hasTarget = false
      return
    }
    
    // Handle cycle animation
    if (this.cycleConfig && this.state.cycleProgress) {
      this.updateCycleAnimation()
    }
    
    this.state.timestamp = Date.now()
    this.state.sequence = this.sequenceNumber++
  }
  
  private updateCycleAnimation(): void {
    if (!this.cycleConfig || !this.state.cycleProgress) return
    
    const now = Date.now()
    const deltaTime = 16 / 1000 // 16ms in seconds
    
    switch (this.state.mode) {
      case 'MOVING_TO_A':
        // Initialize path if not already set
        if (this.currentPath.length === 0) {
          const startPoint = this.state.endEffectorPosition
          let endPoint = this.cycleConfig.pointA
          
          // Check if point A is reachable, if not, find the maximum reachable point
          if (!this.isReachable(endPoint)) {
            const pathToA = this.calculatePath(startPoint, endPoint, this.cycleConfig.pathSteps)
            endPoint = this.findMaxReachablePoint(pathToA)
          }
          
          this.currentPath = this.calculatePath(startPoint, endPoint, this.cycleConfig.pathSteps)
          this.pathProgress = 0
        }
        
        // Move along the calculated path
        const pathSpeedA = this.cycleConfig.speed * deltaTime
        const pathLengthA = this.currentPath.length
        const progressIncrementA = pathSpeedA * 2 // Increase speed significantly
        
        this.pathProgress += progressIncrementA
        
        if (this.pathProgress >= pathLengthA - 1) {
          // Reached point A
          this.state.mode = 'GRIPPING'
          this.state.cycleProgress.currentPhase = 'at_a'
          this.state.cycleProgress.progressPercent = 25
          this.currentPath = []
        } else {
          // Interpolate between path points
          const lowerIndex = Math.floor(this.pathProgress)
          const upperIndex = Math.min(lowerIndex + 1, pathLengthA - 1)
          const t = this.pathProgress - lowerIndex
          
          if (this.currentPath[lowerIndex] && this.currentPath[upperIndex]) {
            const newPos = this.lerp3D(this.currentPath[lowerIndex], this.currentPath[upperIndex], t)
            this.solveIK(newPos)
            this.state.isMoving = true
            this.state.hasTarget = true
          }
        }
        break
        
      case 'GRIPPING':
        // Simulate gripping animation
        this.state.gripper = Math.max(0, this.state.gripper - 0.02)
        if (this.state.gripper <= 0) {
          // Attach payload to end effector
          this.state.payloadAttached = true
          this.state.mode = 'MOVING_TO_B'
          this.state.cycleProgress.currentPhase = 'moving_to_b'
          this.state.cycleProgress.progressPercent = 50
        }
        break
        
      case 'MOVING_TO_B':
        // Initialize path if not already set
        if (this.currentPath.length === 0) {
          const startPoint = this.state.endEffectorPosition
          let endPoint = this.cycleConfig.pointB
          
          // Check if point B is reachable, if not, find the maximum reachable point
          if (!this.isReachable(endPoint)) {
            const pathToB = this.calculatePath(startPoint, endPoint, this.cycleConfig.pathSteps)
            endPoint = this.findMaxReachablePoint(pathToB)
          }
          
          this.currentPath = this.calculatePath(startPoint, endPoint, this.cycleConfig.pathSteps)
          this.pathProgress = 0
        }
        
        // Move along the calculated path
        const pathSpeedB = this.cycleConfig.speed * deltaTime
        const pathLengthB = this.currentPath.length
        const progressIncrementB = pathSpeedB * 2 // Increase speed significantly
        
        this.pathProgress += progressIncrementB
        
        if (this.pathProgress >= pathLengthB - 1) {
          // Reached point B
          this.state.mode = 'RELEASING'
          this.state.cycleProgress.currentPhase = 'at_b'
          this.state.cycleProgress.progressPercent = 75
          this.currentPath = []
        } else {
          // Interpolate between path points
          const lowerIndex = Math.floor(this.pathProgress)
          const upperIndex = Math.min(lowerIndex + 1, pathLengthB - 1)
          const t = this.pathProgress - lowerIndex
          
          if (this.currentPath[lowerIndex] && this.currentPath[upperIndex]) {
            const newPos = this.lerp3D(this.currentPath[lowerIndex], this.currentPath[upperIndex], t)
            this.solveIK(newPos)
            this.state.isMoving = true
            this.state.hasTarget = true
          }
        }
        break
        
      case 'RELEASING':
        // Simulate releasing animation
        this.state.gripper = Math.min(1, this.state.gripper + 0.02)
        if (this.state.gripper >= 1) {
          // Detach payload and leave it at current position
          this.state.payloadAttached = false
          this.state.payloadPosition = { ...this.state.endEffectorPosition }
          this.state.mode = 'RETURNING'
          this.state.cycleProgress.currentPhase = 'idle'
          this.state.cycleProgress.progressPercent = 90
        }
        break
        
      case 'RETURNING':
        // Initialize path if not already set
        if (this.currentPath.length === 0) {
          const startPoint = this.state.endEffectorPosition
          const homePos = { x: 8, y: 12, z: 8 }
          
          this.currentPath = this.calculatePath(startPoint, homePos, this.cycleConfig.pathSteps)
          this.pathProgress = 0
        }
        
        // Move along the calculated path
        const pathSpeedHome = this.cycleConfig.speed * deltaTime
        const pathLengthHome = this.currentPath.length
        const progressIncrementHome = pathSpeedHome * 2 // Increase speed significantly
        
        this.pathProgress += progressIncrementHome
        
        if (this.pathProgress >= pathLengthHome - 1) {
          // Reached home - cycle complete
          this.stopCycle()
          this.state.cycleProgress = {
            isActive: false,
            currentPhase: 'idle',
            progressPercent: 100,
            estimatedTimeRemaining: 0,
          }
          
          // Broadcast cycle complete message
          if (this.broadcastCallback) {
            const cycleCompleteMessage: CycleCompleteNotification = {
              type: MessageType.CYCLE_COMPLETE,
              timestamp: Date.now(),
              sequence: this.sequenceNumber++,
              details: {
                totalTime: 0, // TODO: Calculate actual time
                cycleCount: 1,
                finalPosition: this.state.endEffectorPosition,
              },
            }
            this.broadcastCallback(cycleCompleteMessage)
          }
          this.currentPath = []
        } else {
          // Interpolate between path points
          const lowerIndex = Math.floor(this.pathProgress)
          const upperIndex = Math.min(lowerIndex + 1, pathLengthHome - 1)
          const t = this.pathProgress - lowerIndex
          
          if (this.currentPath[lowerIndex] && this.currentPath[upperIndex]) {
            const newPos = this.lerp3D(this.currentPath[lowerIndex], this.currentPath[upperIndex], t)
            this.solveIK(newPos)
            this.state.isMoving = true
            this.state.hasTarget = true
          }
        }
        break
    }
  }
  
  private solveIK(targetPosition: { x: number; y: number; z: number }): void {
    // Calculate swing angle
    const swingAngle = Math.atan2(targetPosition.x, targetPosition.z) - Math.PI / 2
    this.state.swing = swingAngle
    
    // Set lift position (compensate for wrist extension)
    this.state.lift = targetPosition.y + this.wristExtLength + 1.0
    
    // Calculate horizontal distance
    const horizontalDist = Math.sqrt(targetPosition.x ** 2 + targetPosition.z ** 2)
    const dist = horizontalDist
    const distSq = dist * dist
    
    const l1 = this.upperArmLength
    const l2 = this.lowerArmLength
    
    if (dist > l1 + l2) {
      // Set joints to fully extended position
      this.state.elbow = 0
      this.state.wrist = 0
    } else {
      // Calculate elbow and wrist angles
      const elbowAngle = -Math.acos((distSq - l1 * l1 - l2 * l2) / (2 * l1 * l2))
      const shoulderAngle = Math.atan2(0, horizontalDist) + Math.acos((distSq + l1 * l1 - l2 * l2) / (2 * dist * l1))
      
      if (!isNaN(shoulderAngle) && !isNaN(elbowAngle)) {
        this.state.elbow = elbowAngle
        this.state.wrist = -shoulderAngle - elbowAngle
      }
    }
    
    // Update end effector position
    this.state.endEffectorPosition = targetPosition
  }
  
  private broadcastState(): void {
    // Update payload position if attached
    if (this.state.payloadAttached) {
      this.state.payloadPosition = { ...this.state.endEffectorPosition }
    }
    
    if (this.broadcastCallback) {
      const message: CraneStateUpdate = {
        type: MessageType.STATE_UPDATE,
        timestamp: this.state.timestamp,
        sequence: this.state.sequence,
        state: {
          swing: this.state.swing,
          lift: this.state.lift,
          elbow: this.state.elbow,
          wrist: this.state.wrist,
          gripper: this.state.gripper,
          timestamp: this.state.timestamp,
          sequence: this.state.sequence,
          isMoving: this.state.isMoving,
          hasTarget: this.state.hasTarget,
          endEffectorPosition: this.state.endEffectorPosition,
          isGripperOpen: this.state.gripper > 0.5,
          payloadPosition: this.state.payloadPosition,
          payloadAttached: this.state.payloadAttached,
        },
        cycleProgress: this.state.cycleProgress,
      }
      
      this.broadcastCallback(message)
    }
  }
  
  public calculatePath(
    startPoint: { x: number; y: number; z: number },
    endPoint: { x: number; y: number; z: number },
    pathSteps: number = 200,
  ): { x: number; y: number; z: number }[] {
    const pathPoints: { x: number; y: number; z: number }[] = []
    const pA_2d = { x: startPoint.x, z: startPoint.z }
    const pB_2d = { x: endPoint.x, z: endPoint.z }
    const lineVec_2d = { x: pB_2d.x - pA_2d.x, z: pB_2d.z - pA_2d.z }

    const a = lineVec_2d.x * lineVec_2d.x + lineVec_2d.z * lineVec_2d.z
    const b = 2 * (pA_2d.x * lineVec_2d.x + pA_2d.z * lineVec_2d.z)
    const c = pA_2d.x * pA_2d.x + pA_2d.z * pA_2d.z - this.minRadius * this.minRadius

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
        length: this.distance3D(startPoint, endPoint),
      })
    } else {
      const t1 = intersections_t[0]
      const t2 = intersections_t[1]

      const I1 = this.lerp3D(startPoint, endPoint, t1)
      const I2 = this.lerp3D(startPoint, endPoint, t2)

      pathSegments.push({
        type: 'line',
        start: startPoint,
        end: I1,
        length: this.distance3D(startPoint, I1),
      })

      const I1_2d = { x: I1.x, z: I1.z }
      const I2_2d = { x: I2.x, z: I2.z }
      const startAngle = Math.atan2(I1_2d.z, I1_2d.x)
      let endAngle = Math.atan2(I2_2d.z, I2_2d.x)

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
        length: this.distance3D(I2, endPoint),
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
              pathPoints.push(this.lerp3D(segment.start, segment.end, p_t))
            } else {
              // arc - fix precision issues at segment boundaries
              if (p_t >= 1.0) {
                // At the end of the arc, use the exact end point to prevent drift
                pathPoints.push({ ...segment.end })
              } else {
                const currentAngle = segment.startAngle! + segment.angleDiff! * p_t
                const x = segment.radius! * Math.cos(currentAngle)
                const z = segment.radius! * Math.sin(currentAngle)
                const y = this.lerp(segment.start.y, segment.end.y, p_t)
                pathPoints.push({ x, y, z })
              }
            }
            break
          }
          distRemaining -= segment.length
        }
      }
    } else {
      pathPoints.push({ ...startPoint })
    }

    return pathPoints
  }

  private distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
  }

  private lerp3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, t: number): { x: number; y: number; z: number } {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  public isReachable(targetPosition: { x: number; y: number; z: number }): boolean {
    const horizontalDist = Math.sqrt(targetPosition.x ** 2 + targetPosition.z ** 2)
    const maxReach = this.upperArmLength + this.lowerArmLength
    return horizontalDist <= maxReach
  }

  public findMaxReachablePoint(path: { x: number; y: number; z: number }[]): { x: number; y: number; z: number } {
    const maxReach = this.upperArmLength + this.lowerArmLength
    
    // Find the last reachable point in the path
    for (let i = path.length - 1; i >= 0; i--) {
      const point = path[i]
      const horizontalDist = Math.sqrt(point.x ** 2 + point.z ** 2)
      if (horizontalDist <= maxReach) {
        return { ...point }
      }
    }
    
    // If no point is reachable, return the first point (shouldn't happen in normal usage)
    return path[0] ? { ...path[0] } : { x: 0, y: 0, z: 0 }
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
}