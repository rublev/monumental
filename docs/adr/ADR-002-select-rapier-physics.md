# ADR-002: Select Rapier.js for Physics

## Status

Accepted

## Context

We need a physics engine for simulating brick objects and collision detection in the crane system. Main candidates are Rapier.js, Ammo.js, and Cannon.js.

## Decision

We will use Rapier.js for physics simulation.

## Rationale

1. **Performance**: Rapier is written in Rust and compiled to WebAssembly, offering superior performance
2. **API Design**: Clean, modern API that's easier to use than Ammo.js
3. **Active Development**: Regularly maintained with frequent updates
4. **Deterministic**: Cross-platform deterministic simulation
5. **Memory Safety**: Rust's memory safety guarantees reduce bugs

## Consequences

### Positive

- Excellent performance (2-10x faster than alternatives)
- Clean, TypeScript-friendly API
- Deterministic physics simulation
- Good documentation
- Built-in debug rendering

### Negative

- WebAssembly initialization required
- Smaller community compared to older engines
- Less examples available
- No built-in Three.js integration (must sync manually)

## Implementation Notes

```typescript
// Initialize Rapier
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

// Sync with Three.js
physicsBody.translation(); // Get position
mesh.position.copy(position); // Update mesh
```

## References

- [Rapier.js Documentation](https://rapier.rs/docs/)
- [Physics Engine Benchmark](https://github.com/pmndrs/physics-benchmark)
