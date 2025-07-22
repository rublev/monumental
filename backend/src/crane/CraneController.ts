import { CRANE_CONFIG } from '@monumental/shared/config'
import { MessageType } from '@monumental/shared/websocket'
import type {
  ManualControlCommand,
  StartCycleCommand,
  CraneStateUpdate,
  BackendToFrontendMessage,
  CycleCompleteNotification,
} from '@monumental/shared/websocket'
import type { CraneState, CycleConfig, PathSegment } from '@monumental/shared/crane'
import { CRANE_DEFAULTS } from '@monumental/shared/crane'
import * as CraneMath from '@monumental/shared/crane'

export class CraneController {
  private state: CraneState
  private sequenceNumber = 0
  private cycleConfig: CycleConfig | null = null
  private updateInterval: NodeJS.Timeout | null = null
  private broadcastCallback: ((message: BackendToFrontendMessage) => void) | null = null

  // Current path and navigation
  private currentPath: { x: number; y: number; z: number }[] = []

  // Animation timing for easing
  private phaseStartTime = 0
  private phaseDuration = 0

  // Crane configuration from shared package
  private readonly upperArmLength = CRANE_CONFIG.ARM.UPPER_LENGTH
  private readonly lowerArmLength = CRANE_CONFIG.ARM.LOWER_LENGTH
  private readonly minRadius = CRANE_CONFIG.OBSTACLE.RADIUS

  constructor() {
    this.state = this.createInitialState()
    this.startUpdateLoop()
  }

  private createInitialState(): CraneState {
    const homePosition = CRANE_CONFIG.HOME_POSITION
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
    const ikSolution = CraneMath.solveIK(newPos)
    this.state.swing = ikSolution.swing
    this.state.lift = ikSolution.lift
    this.state.elbow = ikSolution.elbow
    this.state.wrist = ikSolution.wrist
    this.state.endEffectorPosition = newPos
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

    switch (this.state.mode) {
      case 'MOVING_TO_A':
        // Initialize path if not already set
        if (this.currentPath.length === 0) {
          const startPoint = this.state.endEffectorPosition
          let endPoint = this.cycleConfig.pointA

          // Create approach point - target height + 2 target radii (stack two targets)
          const targetRadius = 0.5 // From SCENE_CONFIG.TARGET.RADIUS
          const approachHeight = Math.max(startPoint.y, endPoint.y + 2 * targetRadius)
          const approachPoint = {
            x: endPoint.x,
            y: approachHeight,
            z: endPoint.z,
          }

          // Check if approach point is reachable, if not, find the maximum reachable point
          if (!CraneMath.isReachable(approachPoint)) {
            const pathToApproach = CraneMath.calculatePath(startPoint, approachPoint)
            const maxReachableApproach = CraneMath.findMaxReachablePoint(pathToApproach)
            // Use the reachable approach point, but keep the target coordinates for X and Z
            approachPoint.x = maxReachableApproach.x
            approachPoint.z = maxReachableApproach.z
          }

          // Create two-stage path: 1) to approach point, 2) descend to target
          const pathToApproach = CraneMath.calculatePath(startPoint, approachPoint)
          const pathToTarget = CraneMath.calculatePath(approachPoint, endPoint)

          // Combine both paths
          this.currentPath = [...pathToApproach, ...pathToTarget]

          // Calculate phase duration based on path length and speed
          const totalLength = this.currentPath.reduce((acc, point, i, arr) => {
            if (i > 0) acc += CraneMath.distance3D(point, arr[i - 1])
            return acc
          }, 0)
          this.phaseDuration = totalLength / this.cycleConfig.speed
          this.phaseStartTime = now
        }

        // Calculate eased progress
        const elapsedTime = (now - this.phaseStartTime) / 1000
        const progress = Math.min(elapsedTime / this.phaseDuration, 1)
        const easedProgress = CraneMath.easeInOutCubic(progress)
        const pathIndex = easedProgress * (this.currentPath.length - 1)

        if (progress >= 1) {
          // Reached point A
          this.state.mode = 'GRIPPING'
          this.state.cycleProgress.currentPhase = 'at_a'
          this.state.cycleProgress.progressPercent = 25
          this.currentPath = []
        } else {
          // Interpolate between path points using eased progress
          const lowerIndex = Math.floor(pathIndex)
          const upperIndex = Math.min(lowerIndex + 1, this.currentPath.length - 1)
          const t = pathIndex - lowerIndex

          if (this.currentPath[lowerIndex] && this.currentPath[upperIndex]) {
            const newPos = CraneMath.lerp3D(
              this.currentPath[lowerIndex],
              this.currentPath[upperIndex],
              t
            )
            const ikSolution = CraneMath.solveIK(newPos)
            this.state.swing = ikSolution.swing
            this.state.lift = ikSolution.lift
            this.state.elbow = ikSolution.elbow
            this.state.wrist = ikSolution.wrist
            this.state.endEffectorPosition = newPos
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
          if (!CraneMath.isReachable(endPoint)) {
            const pathToB = CraneMath.calculatePath(startPoint, endPoint)
            endPoint = CraneMath.findMaxReachablePoint(pathToB)
          }

          this.currentPath = CraneMath.calculatePath(startPoint, endPoint)

          // Calculate phase duration based on path length and speed
          const totalLength = this.currentPath.reduce((acc, point, i, arr) => {
            if (i > 0) acc += CraneMath.distance3D(point, arr[i - 1])
            return acc
          }, 0)
          this.phaseDuration = totalLength / this.cycleConfig.speed
          this.phaseStartTime = now
        }

        // Calculate eased progress
        const elapsedTimeB = (now - this.phaseStartTime) / 1000
        const progressB = Math.min(elapsedTimeB / this.phaseDuration, 1)
        const easedProgressB = CraneMath.easeInOutCubic(progressB)
        const pathIndexB = easedProgressB * (this.currentPath.length - 1)

        if (progressB >= 1) {
          // Reached point B
          this.state.mode = 'RELEASING'
          this.state.cycleProgress.currentPhase = 'at_b'
          this.state.cycleProgress.progressPercent = 75
          this.currentPath = []
        } else {
          // Interpolate between path points using eased progress
          const lowerIndex = Math.floor(pathIndexB)
          const upperIndex = Math.min(lowerIndex + 1, this.currentPath.length - 1)
          const t = pathIndexB - lowerIndex

          if (this.currentPath[lowerIndex] && this.currentPath[upperIndex]) {
            const newPos = CraneMath.lerp3D(
              this.currentPath[lowerIndex],
              this.currentPath[upperIndex],
              t
            )
            const ikSolution = CraneMath.solveIK(newPos)
            this.state.swing = ikSolution.swing
            this.state.lift = ikSolution.lift
            this.state.elbow = ikSolution.elbow
            this.state.wrist = ikSolution.wrist
            this.state.endEffectorPosition = newPos
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
          const homePosition = CRANE_CONFIG.HOME_POSITION

          // Create lift-off point - target height + 2 target radii (stack two targets)
          const targetRadius = 0.5 // From SCENE_CONFIG.TARGET.RADIUS
          const liftOffHeight = this.cycleConfig.pointB.y + 2 * targetRadius
          const liftOffPoint = {
            x: startPoint.x,
            y: liftOffHeight,
            z: startPoint.z,
          }

          // Create two-stage path: 1) lift off from point B, 2) return to home
          const pathToLiftOff = CraneMath.calculatePath(startPoint, liftOffPoint)
          const pathToHome = CraneMath.calculatePath(liftOffPoint, homePosition)

          // Combine both paths
          this.currentPath = [...pathToLiftOff, ...pathToHome]

          // Calculate phase duration based on path length and speed
          const totalLength = this.currentPath.reduce((acc, point, i, arr) => {
            if (i > 0) acc += CraneMath.distance3D(point, arr[i - 1])
            return acc
          }, 0)
          this.phaseDuration = totalLength / this.cycleConfig.speed
          this.phaseStartTime = now
        }

        // Calculate eased progress
        const elapsedTimeHome = (now - this.phaseStartTime) / 1000
        const progressHome = Math.min(elapsedTimeHome / this.phaseDuration, 1)
        const easedProgressHome = CraneMath.easeInOutCubic(progressHome)
        const pathIndexHome = easedProgressHome * (this.currentPath.length - 1)

        if (progressHome >= 1) {
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
          // Interpolate between path points using eased progress
          const lowerIndex = Math.floor(pathIndexHome)
          const upperIndex = Math.min(lowerIndex + 1, this.currentPath.length - 1)
          const t = pathIndexHome - lowerIndex

          if (this.currentPath[lowerIndex] && this.currentPath[upperIndex]) {
            const newPos = CraneMath.lerp3D(
              this.currentPath[lowerIndex],
              this.currentPath[upperIndex],
              t
            )
            const ikSolution = CraneMath.solveIK(newPos)
            this.state.swing = ikSolution.swing
            this.state.lift = ikSolution.lift
            this.state.elbow = ikSolution.elbow
            this.state.wrist = ikSolution.wrist
            this.state.endEffectorPosition = newPos
            this.state.isMoving = true
            this.state.hasTarget = true
          }
        }
        break
    }
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
          mode: this.state.mode,
        },
        cycleProgress: this.state.cycleProgress,
      }

      this.broadcastCallback(message)
    }
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
}
