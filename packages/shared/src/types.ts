// Material configuration interface
export interface MaterialConfig {
  color: number;
  roughness: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
}

// Vector3 configuration interface
export interface Vector3Config {
  x: number;
  y: number;
  z: number;
}

// Crane configuration types
export interface CraneLiftConfig {
  HEIGHT: number;
  MIN: number;
  MAX: number;
}

export interface CraneArmConfig {
  UPPER_LENGTH: number;
  LOWER_LENGTH: number;
  WRIST_EXT_LENGTH: number;
}

export interface CraneBaseConfig {
  RADIUS: number;
  HEIGHT: number;
  SEGMENTS: number;
}

export interface CraneTowerConfig {
  WIDTH: number;
  DEPTH: number;
  HEIGHT: number;
  BEAM_THICKNESS: number;
  SEGMENT_HEIGHT: number;
}

export interface CraneMaterialsConfig {
  BASE: MaterialConfig;
  ARM: MaterialConfig;
  JOINT: MaterialConfig;
  GRIPPER: MaterialConfig;
  TOWER: MaterialConfig;
  LIFT: MaterialConfig;
  CAP: MaterialConfig;
}

export interface CraneConfig {
  LIFT: CraneLiftConfig;
  ARM: CraneArmConfig;
  BASE: CraneBaseConfig;
  TOWER: CraneTowerConfig;
  MATERIALS: CraneMaterialsConfig;
}

// Scene configuration types
export interface SimulationBoundsConfig {
  X_MIN: number;
  X_MAX: number;
  Y_MIN: number;
  Y_MAX: number;
  Z_MIN: number;
  Z_MAX: number;
  STEP: number;
}

export interface CameraConfig {
  FOV: number;
  NEAR: number;
  FAR: number;
  POSITION: Vector3Config;
  LOOK_AT: Vector3Config;
}

export interface LightingConfig {
  AMBIENT: {
    color: number;
    intensity: number;
  };
  DIRECTIONAL: {
    color: number;
    intensity: number;
    position: Vector3Config;
  };
}

export interface EnvironmentConfig {
  BACKGROUND_COLOR: number;
  GROUND_SIZE: number;
  GROUND_COLOR: number;
  GRID_SIZE: number;
  GRID_COLOR: number;
}

export interface TargetConfig {
  RADIUS: number;
  COLOR: number;
  SEGMENTS: {
    width: number;
    height: number;
  };
  OPACITY: number;
}

export interface SceneConfig {
  SIMULATION_BOUNDS: SimulationBoundsConfig;
  CAMERA: CameraConfig;
  LIGHTING: LightingConfig;
  ENVIRONMENT: EnvironmentConfig;
  TARGET: TargetConfig;
}

// Crane constraints types
export interface ActuatorLimits {
  min: number;
  max: number;
}

export interface IKConfig {
  iterations: number;
  tolerance: number;
  maxReachDistance: number;
}

export interface AnimationConfig {
  defaultDuration: number;
  ikSolveRate: number;
}

export interface CraneConstraints {
  swing: ActuatorLimits;
  lift: ActuatorLimits;
  elbow: ActuatorLimits;
  wrist: ActuatorLimits;
  gripper: ActuatorLimits;
  ik: IKConfig;
  animation: AnimationConfig;
}

// WebSocket configuration types
export interface WSConfig {
  port: number;
  heartbeatInterval: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

// Physics configuration types
export interface PhysicsConfig {
  gravity: Vector3Config;
  timestep: number;
  brickMass: number;
  brickDimensions: Vector3Config;
}

// Crane stats interface
export interface CraneStats {
  liftHeight: string;
  shoulderAngle: string;
  elbowAngle: string;
}

// Target position interface
export interface TargetPosition {
  x: number;
  y: number;
  z: number;
}
