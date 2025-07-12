# ADR-001: Choose Three.js over Babylon.js

## Status

Accepted

## Context

We need to select a 3D graphics library for the crane visualization system. The main candidates are Three.js and Babylon.js.

## Decision

We will use Three.js for the 3D visualization.

## Rationale

1. **CCDIKSolver Availability**: Three.js has a mature CCDIKSolver implementation in its examples
2. **Community Size**: Larger community means better support and more resources
3. **Learning Curve**: Three.js has a gentler learning curve for developers familiar with WebGL concepts
4. **Bundle Size**: Three.js allows more granular imports, resulting in smaller bundles
5. **Integration**: Better integration with Vue ecosystem

## Consequences

### Positive

- Access to CCDIKSolver for inverse kinematics
- Extensive examples and documentation
- Active community support
- Flexible and modular architecture

### Negative

- Less built-in features compared to Babylon.js
- Need to implement some features manually
- Lower-level API requires more boilerplate

## References

- [Three.js CCDIKSolver](https://threejs.org/examples/#webgl_animation_skinning_ik)
- [Three.js vs Babylon.js Comparison](https://stackoverflow.com/questions/46904821/babylon-js-vs-three-js)