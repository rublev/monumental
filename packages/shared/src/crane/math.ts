/**
 * Shared crane mathematics and kinematics utilities
 * Used by both frontend and backend to avoid code duplication
 */

import { CRANE_CONFIG } from '../config'
import { CRANE_DEFAULTS } from './types'
import type { PathSegment } from './types'

// Generic 3D point interface that works with both THREE.Vector3 and plain objects
export interface Point3D {
  x: number
  y: number
  z: number
}

// Generic 2D point interface
export interface Point2D {
  x: number
  z: number
}

/**
 * Calculate 3D distance between two points
 */
export function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

/**
 * Linear interpolation between two 3D points
 */
export function lerp3D(a: Point3D, b: Point3D, t: number): Point3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

/**
 * Linear interpolation between two numbers
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Ease-in-out cubic function for smooth animations
 */
export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/**
 * Check if a target position is reachable by the crane arm
 */
export function isReachable(targetPosition: Point3D): boolean {
  const horizontalDist = Math.sqrt(targetPosition.x ** 2 + targetPosition.z ** 2)
  const maxReach = CRANE_CONFIG.ARM.UPPER_LENGTH + CRANE_CONFIG.ARM.LOWER_LENGTH
  return horizontalDist <= maxReach
}

/**
 * Find the maximum reachable point along a path
 */
export function findMaxReachablePoint(path: Point3D[]): Point3D {
  const maxReach = CRANE_CONFIG.ARM.UPPER_LENGTH + CRANE_CONFIG.ARM.LOWER_LENGTH

  // Find the last reachable point in the path
  for (let i = path.length - 1; i >= 0; i--) {
    const point = path[i]
    const horizontalDist = Math.sqrt(point.x ** 2 + point.z ** 2)
    if (horizontalDist <= maxReach) {
      return { ...point }
    }
  }

  // If no point is reachable, return the first point (shouldn't happen in normal usage)
  return path[0] ? { ...path[0] } : { x: 0, y: 0, z: 0 }
}

/**
 * Calculate path with obstacle avoidance
 */
export function calculatePath(startPoint: Point3D, endPoint: Point3D): Point3D[] {
  const pathPoints: Point3D[] = []
  const minRadius = CRANE_CONFIG.OBSTACLE.RADIUS

  const pA_2d: Point2D = { x: startPoint.x, z: startPoint.z }
  const pB_2d: Point2D = { x: endPoint.x, z: endPoint.z }
  const lineVec_2d: Point2D = { x: pB_2d.x - pA_2d.x, z: pB_2d.z - pA_2d.z }

  const a = lineVec_2d.x * lineVec_2d.x + lineVec_2d.z * lineVec_2d.z
  const b = 2 * (pA_2d.x * lineVec_2d.x + pA_2d.z * lineVec_2d.z)
  const c = pA_2d.x * pA_2d.x + pA_2d.z * pA_2d.z - minRadius * minRadius

  const discriminant = b * b - 4 * a * c

  let intersections_t: number[] = []
  if (discriminant >= 0) {
    const sqrtDiscriminant = Math.sqrt(discriminant)
    const t1 = (-b - sqrtDiscriminant) / (2 * a)
    const t2 = (-b + sqrtDiscriminant) / (2 * a)
    if (t1 > 0.001 && t1 < 0.999) intersections_t.push(t1)
    if (t2 > 0.001 && t2 < 0.999) intersections_t.push(t2)
  }
  intersections_t.sort()

  const pathSegments: PathSegment[] = []
  if (intersections_t.length < 2) {
    pathSegments.push({
      type: 'line',
      start: startPoint,
      end: endPoint,
      length: distance3D(startPoint, endPoint),
    })
  } else {
    const t1 = intersections_t[0]
    const t2 = intersections_t[1]

    const I1 = lerp3D(startPoint, endPoint, t1)
    const I2 = lerp3D(startPoint, endPoint, t2)

    pathSegments.push({
      type: 'line',
      start: startPoint,
      end: I1,
      length: distance3D(startPoint, I1),
    })

    const I1_2d: Point2D = { x: I1.x, z: I1.z }
    const I2_2d: Point2D = { x: I2.x, z: I2.z }
    const startAngle = Math.atan2(I1_2d.z, I1_2d.x)
    let endAngle = Math.atan2(I2_2d.z, I2_2d.x)

    let angleDiff = endAngle - startAngle
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

    pathSegments.push({
      type: 'arc',
      start: I1,
      end: I2,
      radius: minRadius,
      startAngle,
      angleDiff,
      length: Math.abs(angleDiff) * minRadius,
    })

    pathSegments.push({
      type: 'line',
      start: I2,
      end: endPoint,
      length: distance3D(I2, endPoint),
    })
  }

  const totalLength = pathSegments.reduce((sum, seg) => sum + seg.length, 0)

  if (totalLength > 0) {
    const numSteps = CRANE_DEFAULTS.PATH_STEPS
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps
      let distAlongPath = t * totalLength
      let distRemaining = distAlongPath

      for (const segment of pathSegments) {
        if (distRemaining <= segment.length + 0.001) {
          const p_t = segment.length === 0 ? 0 : distRemaining / segment.length

          if (segment.type === 'line') {
            pathPoints.push(lerp3D(segment.start, segment.end, p_t))
          } else {
            // arc - fix precision issues at segment boundaries
            if (p_t >= 1.0) {
              // At the end of the arc, use the exact end point to prevent drift
              pathPoints.push({ ...segment.end })
            } else {
              const currentAngle = segment.startAngle! + segment.angleDiff! * p_t
              const x = segment.radius! * Math.cos(currentAngle)
              const z = segment.radius! * Math.sin(currentAngle)
              const y = lerp(segment.start.y, segment.end.y, p_t)
              pathPoints.push({ x, y, z })
            }
          }
          break
        }
        distRemaining -= segment.length
      }
    }
  } else {
    pathPoints.push({ ...startPoint })
  }

  return pathPoints
}

/**
 * Solve inverse kinematics for crane joint angles
 * Returns the joint angles needed to reach the target position
 */
export interface IKSolution {
  swing: number // radians
  lift: number // position
  elbow: number // radians
  wrist: number // radians
}

export function solveIK(targetPosition: Point3D): IKSolution {
  // Calculate swing angle
  const swingAngle = Math.atan2(targetPosition.x, targetPosition.z) - Math.PI / 2

  // Set lift position (compensate for wrist extension)
  const wristExtLength = CRANE_CONFIG.ARM.WRIST_EXT_LENGTH
  const lift = targetPosition.y + wristExtLength + 1.0

  // Calculate horizontal distance
  const horizontalDist = Math.sqrt(targetPosition.x ** 2 + targetPosition.z ** 2)
  const dist = horizontalDist
  const distSq = dist * dist

  const l1 = CRANE_CONFIG.ARM.UPPER_LENGTH
  const l2 = CRANE_CONFIG.ARM.LOWER_LENGTH

  let elbow = 0
  let wrist = 0

  if (dist <= l1 + l2) {
    // Calculate elbow and wrist angles
    const elbowAngle = -Math.acos((distSq - l1 * l1 - l2 * l2) / (2 * l1 * l2))
    const shoulderAngle =
      Math.atan2(0, horizontalDist) + Math.acos((distSq + l1 * l1 - l2 * l2) / (2 * dist * l1))

    if (!isNaN(shoulderAngle) && !isNaN(elbowAngle)) {
      elbow = elbowAngle
      wrist = -shoulderAngle - elbowAngle
    }
  }

  return {
    swing: swingAngle,
    lift,
    elbow,
    wrist,
  }
}
