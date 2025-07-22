/**
 * WebSocket Event Flow Documentation
 *
 * This file defines the complete event flow between frontend and backend
 * for the crane control system.
 */

import type { BaseMessage, MessageType } from './types'
import type { CraneState } from '../crane/types'

// =============================================================================
// FRONTEND -> BACKEND EVENTS
// =============================================================================

/**
 * Manual control commands sent from frontend when user presses WASD keys
 * or height control keys. These provide direct actuator control.
 */
export interface ManualControlCommand extends BaseMessage {
  type: MessageType.MANUAL_CONTROL
  command: {
    // WASD controls for end actuator/gripper movement
    // W/S: Forward/backward movement
    // A/D: Left/right movement
    endActuatorX?: number // -1 to 1 for left/right
    endActuatorY?: number // -1 to 1 for forward/backward

    // Height controls for lift (e.g., Q/E keys)
    liftDirection?: number // -1 for down, 1 for up, 0 for stop

    // Optional gripper control
    gripperAction?: 'open' | 'close' | 'stop'
  }
}

/**
 * Start cycle command sent when user clicks "Start Cycle" button
 * after setting A and B points. Backend will begin automated movement.
 */
export interface StartCycleCommand extends BaseMessage {
  type: MessageType.START_CYCLE
  command: {
    pointA: { x: number; y: number; z: number }
    pointB: { x: number; y: number; z: number }
    speed?: number // Optional speed multiplier
  }
}

/**
 * Stop cycle command to halt automated movement
 */
export interface StopCycleCommand extends BaseMessage {
  type: MessageType.STOP_CYCLE
}

/**
 * Emergency stop command for immediate halt of all movement
 */
export interface EmergencyStopCommand extends BaseMessage {
  type: MessageType.EMERGENCY_STOP
}

/**
 * Request current crane state (for initialization or sync)
 */
export interface StateRequestCommand extends BaseMessage {
  type: MessageType.STATE_REQUEST
}

// =============================================================================
// BACKEND -> FRONTEND EVENTS
// =============================================================================

/**
 * Periodic crane state updates sent from backend at fixed intervals
 * Contains current actuator positions and movement status
 */
export interface CraneStateUpdate extends BaseMessage {
  type: MessageType.STATE_UPDATE
  state: CraneState
  cycleProgress?: {
    isActive: boolean
    currentPhase: 'moving_to_a' | 'at_a' | 'moving_to_b' | 'at_b' | 'idle'
    progressPercent: number
    estimatedTimeRemaining: number
  }
}

/**
 * Cycle completion notification sent when automated cycle finishes
 */
export interface CycleCompleteNotification extends BaseMessage {
  type: MessageType.CYCLE_COMPLETE
  details: {
    totalTime: number
    cycleCount: number
    finalPosition: { x: number; y: number; z: number }
  }
}

/**
 * Error notifications for invalid commands or system errors
 */
export interface ErrorNotification extends BaseMessage {
  type: MessageType.ERROR
  error: {
    code: string
    message: string
    details?: any
  }
}

/**
 * System status updates (e.g., connection established, limits reached)
 */
export interface SystemStatusUpdate extends BaseMessage {
  type: MessageType.SYSTEM_STATUS
  status: {
    isConnected: boolean
    limitsReached?: {
      swing?: boolean
      lift?: boolean
      elbow?: boolean
      wrist?: boolean
    }
    calibrationStatus?: 'calibrated' | 'calibrating' | 'uncalibrated'
  }
}

// =============================================================================
// EVENT FLOW SUMMARY
// =============================================================================

/**
 * TYPICAL EVENT FLOW:
 *
 * 1. Frontend connects to backend
 *    Frontend -> Backend: Connection established
 *    Backend -> Frontend: SystemStatusUpdate (connection confirmed)
 *    Backend -> Frontend: CraneStateUpdate (initial state)
 *
 * 2. Manual control mode:
 *    Frontend -> Backend: ManualControlCommand (WASD/height keys)
 *    Backend -> Frontend: CraneStateUpdate (updated positions)
 *
 * 3. Automated cycle mode:
 *    Frontend -> Backend: StartCycleCommand (with A/B points)
 *    Backend -> Frontend: CraneStateUpdate (movement updates at fixed rate)
 *    Backend -> Frontend: CycleCompleteNotification (when done)
 *
 * 4. Emergency scenarios:
 *    Frontend -> Backend: EmergencyStopCommand
 *    Backend -> Frontend: CraneStateUpdate (stopped state)
 *    Backend -> Frontend: SystemStatusUpdate (emergency status)
 */

// =============================================================================
// MESSAGE TYPE EXTENSIONS
// =============================================================================

// Note: New message types are already defined in types.ts MessageType enum

// Union types for easy typing
export type FrontendToBackendMessage =
  | ManualControlCommand
  | StartCycleCommand
  | StopCycleCommand
  | EmergencyStopCommand
  | StateRequestCommand

export type BackendToFrontendMessage =
  | CraneStateUpdate
  | CycleCompleteNotification
  | ErrorNotification
  | SystemStatusUpdate

export type AllWebSocketMessages = FrontendToBackendMessage | BackendToFrontendMessage
