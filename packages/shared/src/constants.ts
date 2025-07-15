// Crane configuration constants for Three.js visualization
export const CRANE_CONFIG = {
  LIFT: {
    HEIGHT: 8,
    MIN: 2,
    MAX: 14,
  },
  ARM: {
    UPPER_LENGTH: 6,
    LOWER_LENGTH: 5,
    WRIST_EXT_LENGTH: 3,
  },
  BASE: {
    RADIUS: 4.0,
    HEIGHT: 1,
    SEGMENTS: 32,
  },
  TOWER: {
    WIDTH: 3,
    DEPTH: 3,
    HEIGHT: 15,
    BEAM_THICKNESS: 0.3,
    SEGMENT_HEIGHT: 3,
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
      emissiveIntensity: 0.1,
    },
    CAP: { color: 0x777777, roughness: 0.6, metalness: 0.4 },
  },
};

// Three.js scene configuration for simulation
export const SCENE_CONFIG = {
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
  LIGHTING: {
    AMBIENT: { color: 0xffffff, intensity: 0.7 },
    DIRECTIONAL: {
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
    SEGMENTS: { width: 16, height: 8 },
    OPACITY: 1,
  },
};

// Physical constraints and constants for the crane
export const CRANE_CONSTRAINTS = {
  // Actuator limits
  swing: { min: -180, max: 180 }, // degrees
  lift: { min: 0, max: 500 }, // mm
  elbow: { min: -90, max: 90 }, // degrees
  wrist: { min: -180, max: 180 }, // degrees
  gripper: { min: 0, max: 100 }, // mm

  // IK solver settings
  ik: {
    iterations: 10,
    tolerance: 0.01,
    maxReachDistance: 800, // mm
  },

  // Animation settings
  animation: {
    defaultDuration: 1000, // ms
    ikSolveRate: 60, // Hz
  },
};

// WebSocket configuration
export const WS_CONFIG = {
  port: 8080,
  heartbeatInterval: 30000, // ms
  reconnectDelay: 2000, // ms
  maxReconnectAttempts: 5,
};

// Physics configuration
export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: -9.81, z: 0 },
  timestep: 1 / 60,
  brickMass: 1.0, // kg
  brickDimensions: { x: 100, y: 50, z: 50 }, // mm
};
