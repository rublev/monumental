/**
 * Configuration constants and settings
 */

// Scene configuration
export const SCENE_CONFIG = {
  clearColor: 0x111827,
  fog: {
    color: 0x111827,
    near: 1,
    far: 100,
  },
  SIMULATION_BOUNDS: {
    X_MIN: -13,
    X_MAX: 13,
    Y_MIN: 0,
    Y_MAX: 10,
    Z_MIN: -13,
    Z_MAX: 13,
    STEP: 0.1,
  },
  CAMERA: {
    FOV: 60,
    NEAR: 0.1,
    FAR: 1000,
    POSITION: { x: 20, y: 15, z: 20 },
    LOOK_AT: { x: 0, y: 5, z: 0 },
  },
  camera: {
    position: { x: 20, y: 15, z: 20 },
    fov: 60,
    near: 0.1,
    far: 1000,
  },
  LIGHTING: {
    AMBIENT: {
      color: 0xffffff,
      intensity: 0.7,
    },
    DIRECTIONAL: {
      color: 0xffffff,
      intensity: 1.5,
      position: { x: 10, y: 20, z: 5 },
    },
  },
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 0.7,
    },
    directional: {
      color: 0xffffff,
      intensity: 1.5,
      position: { x: 10, y: 20, z: 5 },
    },
  },
  ENVIRONMENT: {
    BACKGROUND_COLOR: 0x111827,
    GROUND_SIZE: 50,
    GROUND_COLOR: 0x1f2937,
    GRID_SIZE: 50,
    GRID_COLOR: 0x444444,
  },
  TARGET: {
    RADIUS: 0.5,
    COLOR: 0xef4444,
    OPACITY: 1,
    SEGMENTS: {
      width: 16,
      height: 8,
    },
  },
}

// Crane configuration
export const CRANE_CONFIG = {
  BASE: {
    RADIUS: 4.0,
    HEIGHT: 1,
    SEGMENTS: 32,
    radius: 4.0,
    height: 1,
    color: 0xcccccc,
  },
  base: {
    radius: 4.0,
    height: 1,
    color: 0xcccccc,
  },
  TOWER: {
    WIDTH: 3,
    HEIGHT: 15,
    DEPTH: 3,
    BEAM_THICKNESS: 0.3,
    SEGMENT_HEIGHT: 3,
    width: 3,
    height: 15,
    depth: 3,
    color: 0xffa500,
  },
  column: {
    width: 3,
    height: 15,
    depth: 3,
    color: 0xffa500,
  },
  LIFT: {
    HEIGHT: 8,
    MIN: 2,
    MAX: 14,
    width: 0.6,
    height: 0.4,
    depth: 0.6,
    color: 0xffcc00,
  },
  lift: {
    width: 0.6,
    height: 0.4,
    depth: 0.6,
    color: 0xffcc00,
  },
  ARM: {
    UPPER_LENGTH: 6,
    LOWER_LENGTH: 5,
    WRIST_EXT_LENGTH: 3,
    length: 3,
    width: 0.2,
    height: 0.2,
    color: 0xfacc15,
  },
  arm: {
    length: 3,
    width: 0.2,
    height: 0.2,
    color: 0xfacc15,
  },
  MATERIALS: {
    BASE: 0xcccccc,
    TOWER: 0xffa500,
    LIFT: 0xffcc00,
    ARM: 0xfacc15,
    GRIPPER: 0x374151,
    JOINT: 0x4f46e5,
    CAP: 0x777777,
    base: 0xcccccc,
    tower: 0xffa500,
    lift: 0xffcc00,
    arm: 0xfacc15,
    gripper: 0x374151,
    target: 0xef4444,
    brick: 0xcc4400,
  },
}

// WebSocket configuration
export const WS_CONFIG = {
  url: 'ws://localhost:8080/ws',
  port: 8080,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  reconnectInterval: 1000,
  reconnectAttempts: 5,
  connectionTimeout: 10000,
}

// Physics configuration
export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: -9.81, z: 0 },
  timestep: 1 / 60,
  brickMass: 1.0,
  brickDimensions: {
    width: 100,
    height: 50,
    depth: 50,
    x: 100,
    y: 50,
    z: 50,
  },
}
