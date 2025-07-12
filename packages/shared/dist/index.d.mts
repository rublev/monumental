declare const CRANE_CONSTRAINTS: {
    swing: {
        min: number;
        max: number;
    };
    lift: {
        min: number;
        max: number;
    };
    elbow: {
        min: number;
        max: number;
    };
    wrist: {
        min: number;
        max: number;
    };
    gripper: {
        min: number;
        max: number;
    };
    ik: {
        iterations: number;
        tolerance: number;
        maxReachDistance: number;
    };
    animation: {
        defaultDuration: number;
        ikSolveRate: number;
    };
};
declare const WS_CONFIG: {
    port: number;
    heartbeatInterval: number;
    reconnectDelay: number;
    maxReconnectAttempts: number;
};
declare const PHYSICS_CONFIG: {
    gravity: {
        x: number;
        y: number;
        z: number;
    };
    timestep: number;
    brickMass: number;
    brickDimensions: {
        x: number;
        y: number;
        z: number;
    };
};

interface Vector3Like {
    x: number;
    y: number;
    z: number;
}
interface CraneActuators {
    swing: number;
    lift: number;
    elbow: number;
    wrist: number;
    gripper: number;
}
interface CraneState extends CraneActuators {
    timestamp: number;
    endEffectorPosition: Vector3Like;
    isGripperOpen: boolean;
    targetReached: boolean;
}
interface PhysicsObject {
    id: string;
    type: 'brick' | 'obstacle';
    position: Vector3Like;
    rotation: Vector3Like;
    dimensions: Vector3Like;
    mass: number;
    isGripped: boolean;
}
interface IKChainConfig {
    target: number;
    effector: number;
    links: Array<{
        index: number;
        rotationMin?: Vector3Like;
        rotationMax?: Vector3Like;
    }>;
    iterations?: number;
    tolerance?: number;
}
declare enum MessageType {
    MOVE_COMMAND = "move_command",
    IK_TARGET = "ik_target",
    GRIPPER_COMMAND = "gripper_command",
    SPAWN_OBJECT = "spawn_object",
    RESET_SCENE = "reset_scene",
    STATE_UPDATE = "state_update",
    PHYSICS_UPDATE = "physics_update",
    IK_SOLUTION = "ik_solution",
    ERROR = "error",
    CONNECTION_ACK = "connection_ack"
}
interface BaseMessage {
    type: MessageType;
    timestamp: number;
    clientId?: string;
}
interface MoveCommandMessage extends BaseMessage {
    type: MessageType.MOVE_COMMAND;
    actuators: Partial<CraneActuators>;
    duration?: number;
}
interface IKTargetMessage extends BaseMessage {
    type: MessageType.IK_TARGET;
    target: Vector3Like;
    constraints?: {
        maintainOrientation?: boolean;
        collisionAvoidance?: boolean;
    };
}
interface StateUpdateMessage extends BaseMessage {
    type: MessageType.STATE_UPDATE;
    state: CraneState;
    objects: PhysicsObject[];
}
declare enum ErrorCode {
    INVALID_COMMAND = "INVALID_COMMAND",
    IK_NO_SOLUTION = "IK_NO_SOLUTION",
    COLLISION_DETECTED = "COLLISION_DETECTED",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    PHYSICS_ERROR = "PHYSICS_ERROR"
}
interface ErrorMessage extends BaseMessage {
    type: MessageType.ERROR;
    code: ErrorCode;
    message: string;
    details?: unknown;
}
interface WebSocketService {
    connect(url: string): Promise<void>;
    disconnect(): void;
    send(message: BaseMessage): void;
    on<T extends BaseMessage>(type: MessageType, handler: (msg: T) => void): void;
    off(type: MessageType, handler: Function): void;
    isConnected(): boolean;
}
interface CraneController {
    moveToPosition(actuators: Partial<CraneActuators>): Promise<void>;
    moveToTarget(position: Vector3Like): Promise<void>;
    setGripper(open: boolean): Promise<void>;
    getCurrentState(): CraneState;
    subscribeToUpdates(callback: (state: CraneState) => void): () => void;
}
interface PhysicsManager {
    spawnBrick(position: Vector3Like): string;
    removeObject(id: string): void;
    getObjects(): PhysicsObject[];
    checkCollisions(position: Vector3Like): boolean;
}
interface BinaryProtocol {
    encode(message: BaseMessage): ArrayBuffer;
    decode(buffer: ArrayBuffer): BaseMessage;
}
interface UseCraneReturn {
    state: Readonly<CraneState>;
    connected: Readonly<boolean>;
    moveToPosition: (actuators: Partial<CraneActuators>) => Promise<void>;
    moveToTarget: (position: Vector3Like) => Promise<void>;
    toggleGripper: () => Promise<void>;
    connect: () => Promise<void>;
    disconnect: () => void;
}

export { type BaseMessage, type BinaryProtocol, CRANE_CONSTRAINTS, type CraneActuators, type CraneController, type CraneState, ErrorCode, type ErrorMessage, type IKChainConfig, type IKTargetMessage, MessageType, type MoveCommandMessage, PHYSICS_CONFIG, type PhysicsManager, type PhysicsObject, type StateUpdateMessage, type UseCraneReturn, type Vector3Like, WS_CONFIG, type WebSocketService };
