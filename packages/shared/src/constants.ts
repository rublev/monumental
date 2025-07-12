// Physical constraints and constants for the crane
export const CRANE_CONSTRAINTS = {
  // Actuator limits
  swing: { min: -180, max: 180 },     // degrees
  lift: { min: 0, max: 500 },         // mm
  elbow: { min: -90, max: 90 },       // degrees
  wrist: { min: -180, max: 180 },     // degrees
  gripper: { min: 0, max: 100 },      // mm
  
  // IK solver settings
  ik: {
    iterations: 10,
    tolerance: 0.01,
    maxReachDistance: 800              // mm
  },
  
  // Animation settings
  animation: {
    defaultDuration: 1000,             // ms
    ikSolveRate: 60                    // Hz
  }
};

// WebSocket configuration
export const WS_CONFIG = {
  port: 9001,
  heartbeatInterval: 30000,            // ms
  reconnectDelay: 2000,                // ms
  maxReconnectAttempts: 5
};

// Physics configuration
export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: -9.81, z: 0 },
  timestep: 1/60,
  brickMass: 1.0,                      // kg
  brickDimensions: { x: 100, y: 50, z: 50 }  // mm
};