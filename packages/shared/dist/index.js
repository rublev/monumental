"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CRANE_CONFIG: () => CRANE_CONFIG,
  CRANE_CONSTRAINTS: () => CRANE_CONSTRAINTS,
  ErrorCode: () => ErrorCode,
  MessageType: () => MessageType,
  PHYSICS_CONFIG: () => PHYSICS_CONFIG,
  SCENE_CONFIG: () => SCENE_CONFIG,
  WS_CONFIG: () => WS_CONFIG
});
module.exports = __toCommonJS(index_exports);

// src/constants.ts
var CRANE_CONFIG = {
  LIFT: {
    HEIGHT: 8,
    MIN: 2,
    MAX: 14
  },
  ARM: {
    UPPER_LENGTH: 6,
    LOWER_LENGTH: 5,
    WRIST_EXT_LENGTH: 3
  },
  BASE: {
    RADIUS: 4,
    HEIGHT: 1,
    SEGMENTS: 32
  },
  TOWER: {
    WIDTH: 3,
    DEPTH: 3,
    HEIGHT: 15,
    BEAM_THICKNESS: 0.3,
    SEGMENT_HEIGHT: 3
  },
  MATERIALS: {
    BASE: { color: 13421772, roughness: 0.7, metalness: 0.3 },
    ARM: { color: 16436245, roughness: 0.4 },
    JOINT: { color: 5195493, roughness: 0.5 },
    GRIPPER: { color: 3621201, roughness: 0.6 },
    TOWER: { color: 16753920, roughness: 0.7, metalness: 0.3 },
    LIFT: {
      color: 16763904,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 16763904,
      emissiveIntensity: 0.1
    },
    CAP: { color: 7829367, roughness: 0.6, metalness: 0.4 }
  }
};
var SCENE_CONFIG = {
  SIMULATION_BOUNDS: {
    X_MIN: -13,
    X_MAX: 13,
    Y_MIN: 0,
    Y_MAX: 10,
    Z_MIN: -13,
    Z_MAX: 13,
    STEP: 0.1
  },
  CAMERA: {
    FOV: 60,
    NEAR: 0.1,
    FAR: 1e3,
    POSITION: { x: 20, y: 15, z: 20 },
    LOOK_AT: { x: 0, y: 5, z: 0 }
  },
  LIGHTING: {
    AMBIENT: { color: 16777215, intensity: 0.7 },
    DIRECTIONAL: {
      color: 16777215,
      intensity: 1.5,
      position: { x: 10, y: 20, z: 5 }
    }
  },
  ENVIRONMENT: {
    BACKGROUND_COLOR: 1120295,
    GROUND_SIZE: 50,
    GROUND_COLOR: 2042167,
    GRID_SIZE: 50,
    GRID_COLOR: 4473924
  },
  TARGET: {
    RADIUS: 0.5,
    COLOR: 15680580,
    SEGMENTS: { width: 16, height: 8 },
    OPACITY: 0.7
  }
};
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRANE_CONFIG,
  CRANE_CONSTRAINTS,
  ErrorCode,
  MessageType,
  PHYSICS_CONFIG,
  SCENE_CONFIG,
  WS_CONFIG
});
