// src/constants.ts
var CRANE_CONSTRAINTS = {
  // Actuator limits
  swing: { min: -180, max: 180 },
  // degrees
  lift: { min: 0, max: 500 },
  // mm
  elbow: { min: -90, max: 90 },
  // degrees
  wrist: { min: -180, max: 180 },
  // degrees
  gripper: { min: 0, max: 100 },
  // mm
  // IK solver settings
  ik: {
    iterations: 10,
    tolerance: 0.01,
    maxReachDistance: 800
    // mm
  },
  // Animation settings
  animation: {
    defaultDuration: 1e3,
    // ms
    ikSolveRate: 60
    // Hz
  }
};
var WS_CONFIG = {
  port: 9001,
  heartbeatInterval: 3e4,
  // ms
  reconnectDelay: 2e3,
  // ms
  maxReconnectAttempts: 5
};
var PHYSICS_CONFIG = {
  gravity: { x: 0, y: -9.81, z: 0 },
  timestep: 1 / 60,
  brickMass: 1,
  // kg
  brickDimensions: { x: 100, y: 50, z: 50 }
  // mm
};

// src/index.ts
var MessageType = /* @__PURE__ */ ((MessageType2) => {
  MessageType2["MOVE_COMMAND"] = "move_command";
  MessageType2["IK_TARGET"] = "ik_target";
  MessageType2["GRIPPER_COMMAND"] = "gripper_command";
  MessageType2["SPAWN_OBJECT"] = "spawn_object";
  MessageType2["RESET_SCENE"] = "reset_scene";
  MessageType2["STATE_UPDATE"] = "state_update";
  MessageType2["PHYSICS_UPDATE"] = "physics_update";
  MessageType2["IK_SOLUTION"] = "ik_solution";
  MessageType2["ERROR"] = "error";
  MessageType2["CONNECTION_ACK"] = "connection_ack";
  return MessageType2;
})(MessageType || {});
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2["INVALID_COMMAND"] = "INVALID_COMMAND";
  ErrorCode2["IK_NO_SOLUTION"] = "IK_NO_SOLUTION";
  ErrorCode2["COLLISION_DETECTED"] = "COLLISION_DETECTED";
  ErrorCode2["CONNECTION_FAILED"] = "CONNECTION_FAILED";
  ErrorCode2["PHYSICS_ERROR"] = "PHYSICS_ERROR";
  return ErrorCode2;
})(ErrorCode || {});
export {
  CRANE_CONSTRAINTS,
  ErrorCode,
  MessageType,
  PHYSICS_CONFIG,
  WS_CONFIG
};
