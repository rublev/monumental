// Core domain interfaces
export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface CraneActuators {
  swing: number;      // Base rotation in degrees
  lift: number;       // Lift mechanism height in mm
  elbow: number;      // Elbow joint angle in degrees
  wrist: number;      // Wrist joint angle in degrees
  gripper: number;    // Gripper opening in mm
}

export interface CraneState extends CraneActuators {
  timestamp: number;
  endEffectorPosition: Vector3Like;
  isGripperOpen: boolean;
  targetReached: boolean;
}

export interface PhysicsObject {
  id: string;
  type: 'brick' | 'obstacle';
  position: Vector3Like;
  rotation: Vector3Like;
  dimensions: Vector3Like;
  mass: number;
  isGripped: boolean;
}

export interface IKChainConfig {
  target: number;     // Target bone index
  effector: number;   // End effector bone index
  links: Array<{
    index: number;
    rotationMin?: Vector3Like;
    rotationMax?: Vector3Like;
  }>;
  iterations?: number;
  tolerance?: number;
}

// WebSocket protocol interfaces
export enum MessageType {
  // Client -> Server
  MOVE_COMMAND = 'move_command',
  IK_TARGET = 'ik_target',
  GRIPPER_COMMAND = 'gripper_command',
  SPAWN_OBJECT = 'spawn_object',
  RESET_SCENE = 'reset_scene',
  
  // Server -> Client
  STATE_UPDATE = 'state_update',
  PHYSICS_UPDATE = 'physics_update',
  IK_SOLUTION = 'ik_solution',
  ERROR = 'error',
  CONNECTION_ACK = 'connection_ack'
}

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  clientId?: string;
}

export interface MoveCommandMessage extends BaseMessage {
  type: MessageType.MOVE_COMMAND;
  actuators: Partial<CraneActuators>;
  duration?: number;  // Animation duration in ms
}

export interface IKTargetMessage extends BaseMessage {
  type: MessageType.IK_TARGET;
  target: Vector3Like;
  constraints?: {
    maintainOrientation?: boolean;
    collisionAvoidance?: boolean;
  };
}

export interface StateUpdateMessage extends BaseMessage {
  type: MessageType.STATE_UPDATE;
  state: CraneState;
  objects: PhysicsObject[];
}

// Utility types
export enum ErrorCode {
  INVALID_COMMAND = 'INVALID_COMMAND',
  IK_NO_SOLUTION = 'IK_NO_SOLUTION',
  COLLISION_DETECTED = 'COLLISION_DETECTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PHYSICS_ERROR = 'PHYSICS_ERROR'
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// Frontend service interfaces
export interface WebSocketService {
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(message: BaseMessage): void;
  on<T extends BaseMessage>(type: MessageType, handler: (msg: T) => void): void;
  off(type: MessageType, handler: Function): void;
  isConnected(): boolean;
}

export interface CraneController {
  moveToPosition(actuators: Partial<CraneActuators>): Promise<void>;
  moveToTarget(position: Vector3Like): Promise<void>;
  setGripper(open: boolean): Promise<void>;
  getCurrentState(): CraneState;
  subscribeToUpdates(callback: (state: CraneState) => void): () => void;
}

export interface PhysicsManager {
  spawnBrick(position: Vector3Like): string;
  removeObject(id: string): void;
  getObjects(): PhysicsObject[];
  checkCollisions(position: Vector3Like): boolean;
}

// Binary protocol optimization types
export interface BinaryProtocol {
  encode(message: BaseMessage): ArrayBuffer;
  decode(buffer: ArrayBuffer): BaseMessage;
}

// Vue composable types
export interface UseCraneReturn {
  state: Readonly<CraneState>;
  connected: Readonly<boolean>;
  moveToPosition: (actuators: Partial<CraneActuators>) => Promise<void>;
  moveToTarget: (position: Vector3Like) => Promise<void>;
  toggleGripper: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// Export constants and types
export * from './constants';
export * from './types';