/**
 * WebSocket message definitions
 */

import type { BaseMessage, MessageType } from './types';

// Crane state message
export interface CraneState {
  swing: number;
  lift: number;
  elbow: number;
  wrist: number;
  gripper: number;
  timestamp: number;
  sequence: number;
  isMoving: boolean;
  hasTarget: boolean;
  endEffectorPosition?: { x: number; y: number; z: number };
  payloadPosition?: { x: number; y: number; z: number };
  payloadAttached?: boolean;
  objects?: any[];
  isGripperOpen?: boolean;
}

// State update message
export interface StateUpdateMessage extends BaseMessage {
  type: MessageType.STATE_UPDATE;
  state: CraneState;
  objects?: any[];
}
