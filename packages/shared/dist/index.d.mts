declare const CRANE_CONFIG: {
    LIFT: {
        HEIGHT: number;
        MIN: number;
        MAX: number;
    };
    ARM: {
        UPPER_LENGTH: number;
        LOWER_LENGTH: number;
        WRIST_EXT_LENGTH: number;
    };
    BASE: {
        RADIUS: number;
        HEIGHT: number;
        SEGMENTS: number;
    };
    TOWER: {
        WIDTH: number;
        DEPTH: number;
        HEIGHT: number;
        BEAM_THICKNESS: number;
        SEGMENT_HEIGHT: number;
    };
    MATERIALS: {
        BASE: {
            color: number;
            roughness: number;
            metalness: number;
        };
        ARM: {
            color: number;
            roughness: number;
        };
        JOINT: {
            color: number;
            roughness: number;
        };
        GRIPPER: {
            color: number;
            roughness: number;
        };
        TOWER: {
            color: number;
            roughness: number;
            metalness: number;
        };
        LIFT: {
            color: number;
            roughness: number;
            metalness: number;
            emissive: number;
            emissiveIntensity: number;
        };
        CAP: {
            color: number;
            roughness: number;
            metalness: number;
        };
    };
};
declare const SCENE_CONFIG: {
    SIMULATION_BOUNDS: {
        X_MIN: number;
        X_MAX: number;
        Y_MIN: number;
        Y_MAX: number;
        Z_MIN: number;
        Z_MAX: number;
        STEP: number;
    };
    CAMERA: {
        FOV: number;
        NEAR: number;
        FAR: number;
        POSITION: {
            x: number;
            y: number;
            z: number;
        };
        LOOK_AT: {
            x: number;
            y: number;
            z: number;
        };
    };
    LIGHTING: {
        AMBIENT: {
            color: number;
            intensity: number;
        };
        DIRECTIONAL: {
            color: number;
            intensity: number;
            position: {
                x: number;
                y: number;
                z: number;
            };
        };
    };
    ENVIRONMENT: {
        BACKGROUND_COLOR: number;
        GROUND_SIZE: number;
        GROUND_COLOR: number;
        GRID_SIZE: number;
        GRID_COLOR: number;
    };
    TARGET: {
        RADIUS: number;
        COLOR: number;
        SEGMENTS: {
            width: number;
            height: number;
        };
        OPACITY: number;
    };
};
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

interface MaterialConfig {
    color: number;
    roughness: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
}
interface Vector3Config {
    x: number;
    y: number;
    z: number;
}
interface CraneLiftConfig {
    HEIGHT: number;
    MIN: number;
    MAX: number;
}
interface CraneArmConfig {
    UPPER_LENGTH: number;
    LOWER_LENGTH: number;
    WRIST_EXT_LENGTH: number;
}
interface CraneBaseConfig {
    RADIUS: number;
    HEIGHT: number;
    SEGMENTS: number;
}
interface CraneTowerConfig {
    WIDTH: number;
    DEPTH: number;
    HEIGHT: number;
    BEAM_THICKNESS: number;
    SEGMENT_HEIGHT: number;
}
interface CraneMaterialsConfig {
    BASE: MaterialConfig;
    ARM: MaterialConfig;
    JOINT: MaterialConfig;
    GRIPPER: MaterialConfig;
    TOWER: MaterialConfig;
    LIFT: MaterialConfig;
    CAP: MaterialConfig;
}
interface CraneConfig {
    LIFT: CraneLiftConfig;
    ARM: CraneArmConfig;
    BASE: CraneBaseConfig;
    TOWER: CraneTowerConfig;
    MATERIALS: CraneMaterialsConfig;
}
interface SimulationBoundsConfig {
    X_MIN: number;
    X_MAX: number;
    Y_MIN: number;
    Y_MAX: number;
    Z_MIN: number;
    Z_MAX: number;
    STEP: number;
}
interface CameraConfig {
    FOV: number;
    NEAR: number;
    FAR: number;
    POSITION: Vector3Config;
    LOOK_AT: Vector3Config;
}
interface LightingConfig {
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
interface EnvironmentConfig {
    BACKGROUND_COLOR: number;
    GROUND_SIZE: number;
    GROUND_COLOR: number;
    GRID_SIZE: number;
    GRID_COLOR: number;
}
interface TargetConfig {
    RADIUS: number;
    COLOR: number;
    SEGMENTS: {
        width: number;
        height: number;
    };
    OPACITY: number;
}
interface SceneConfig {
    SIMULATION_BOUNDS: SimulationBoundsConfig;
    CAMERA: CameraConfig;
    LIGHTING: LightingConfig;
    ENVIRONMENT: EnvironmentConfig;
    TARGET: TargetConfig;
}
interface ActuatorLimits {
    min: number;
    max: number;
}
interface IKConfig {
    iterations: number;
    tolerance: number;
    maxReachDistance: number;
}
interface AnimationConfig {
    defaultDuration: number;
    ikSolveRate: number;
}
interface CraneConstraints {
    swing: ActuatorLimits;
    lift: ActuatorLimits;
    elbow: ActuatorLimits;
    wrist: ActuatorLimits;
    gripper: ActuatorLimits;
    ik: IKConfig;
    animation: AnimationConfig;
}
interface WSConfig {
    port: number;
    heartbeatInterval: number;
    reconnectDelay: number;
    maxReconnectAttempts: number;
}
interface PhysicsConfig {
    gravity: Vector3Config;
    timestep: number;
    brickMass: number;
    brickDimensions: Vector3Config;
}
interface CraneStats {
    liftHeight: string;
    shoulderAngle: string;
    elbowAngle: string;
}
interface TargetPosition {
    x: number;
    y: number;
    z: number;
}

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

export { type ActuatorLimits, type AnimationConfig, type BaseMessage, type BinaryProtocol, CRANE_CONFIG, CRANE_CONSTRAINTS, type CameraConfig, type CraneActuators, type CraneArmConfig, type CraneBaseConfig, type CraneConfig, type CraneConstraints, type CraneController, type CraneLiftConfig, type CraneMaterialsConfig, type CraneState, type CraneStats, type CraneTowerConfig, type EnvironmentConfig, ErrorCode, type ErrorMessage, type IKChainConfig, type IKConfig, type IKTargetMessage, type LightingConfig, type MaterialConfig, MessageType, type MoveCommandMessage, PHYSICS_CONFIG, type PhysicsConfig, type PhysicsManager, type PhysicsObject, SCENE_CONFIG, type SceneConfig, type SimulationBoundsConfig, type StateUpdateMessage, type TargetConfig, type TargetPosition, type UseCraneReturn, type Vector3Config, type Vector3Like, type WSConfig, WS_CONFIG, type WebSocketService };
