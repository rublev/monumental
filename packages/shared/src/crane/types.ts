/**
 * Crane-specific types and interfaces
 */

// Crane statistics for UI
export interface CraneStats {
  position: {
    x: number;
    y: number;
    z: number;
  };
  isMoving: boolean;
  hasTarget: boolean;
  lastUpdate: number;
  liftHeight: number;
  shoulderYaw: number;
  elbowYaw: number;
}

// Target position for crane operations
export interface TargetPosition {
  x: number;
  y: number;
  z: number;
}

// Comprehensive crane state interface
export interface CraneState {
  // Joint positions
  swing: number; // radians
  lift: number; // mm
  elbow: number; // radians
  wrist: number; // radians
  gripper: number; // mm (0 = closed, 1 = open)

  // Derived values
  endEffectorPosition: { x: number; y: number; z: number };
  payloadPosition: { x: number; y: number; z: number };
  payloadAttached: boolean;
  isMoving: boolean;
  hasTarget: boolean;
  timestamp: number;
  sequence: number;
  isGripperOpen?: boolean; // computed from gripper > 0.5

  // Animation state
  mode:
    | 'IDLE'
    | 'MOVING_TO_A'
    | 'GRIPPING'
    | 'MOVING_TO_B'
    | 'RELEASING'
    | 'RETURNING';
  cycleProgress?: {
    isActive: boolean;
    currentPhase: 'moving_to_a' | 'at_a' | 'moving_to_b' | 'at_b' | 'idle';
    progressPercent: number;
    estimatedTimeRemaining: number;
  };
}

// Cycle configuration for crane operations
export interface CycleConfig {
  pointA: { x: number; y: number; z: number };
  pointB: { x: number; y: number; z: number };
  speed: number;
  pathSteps: number;
}

// Path segment for crane movement planning
export interface PathSegment {
  type: 'line' | 'arc';
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  length: number;
  radius?: number;
  startAngle?: number;
  angleDiff?: number;
}

// Animation state for crane operations
export interface AnimationState {
  mode:
    | 'IDLE'
    | 'MOVING_TO_A'
    | 'GRIPPING'
    | 'MOVING_TO_B'
    | 'RELEASING'
    | 'RETURNING';
  startTime: number;
  duration: number;
  progress: number;
  payloadAttached: boolean;
}

// Manual control configuration
export interface ManualControlConfig {
  enabled: boolean;
  endActuatorX: number; // -1 to 1 for left/right
  endActuatorY: number; // -1 to 1 for forward/backward
  liftDirection: number; // -1 for down, 1 for up, 0 for stop
  gripperAction: 'open' | 'close' | 'stop';
  controlSpeed: number; // Movement speed multiplier
}

// Default crane operation settings
export const CRANE_DEFAULTS = {
  SPEED: 10.0, // units per second
  PATH_STEPS: 200, // path fidelity
  CONTROL_SPEED: 0.1, // manual control speed multiplier
  HOME_POSITION: { x: 8, y: 12, z: 8 } as { x: number; y: number; z: number },
  DEFAULT_POINT_A: { x: -5.0, y: 2.0, z: -2.0 } as {
    x: number;
    y: number;
    z: number;
  }, // pickup point
  DEFAULT_POINT_B: { x: 5.0, y: 3.0, z: 3.0 } as {
    x: number;
    y: number;
    z: number;
  }, // drop-off point
  WEBSOCKET_THROTTLE_MS: 33, // 30fps throttling
};
