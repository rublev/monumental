/**
 * Crane-specific types and interfaces
 */

// Crane statistics for UI
export interface CraneStats {
  position: {
    x: number;
    y: number;
    z: number;
  };
  isMoving: boolean;
  hasTarget: boolean;
  lastUpdate: number;
  liftHeight: number;
  shoulderYaw: number;
  elbowYaw: number;
}

// Target position for crane operations
export interface TargetPosition {
  x: number;
  y: number;
  z: number;
}
