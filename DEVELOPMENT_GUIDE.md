# Development Guide

## Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Coding Standards](#coding-standards)
4. [Architecture Guidelines](#architecture-guidelines)
5. [Git Workflow](#git-workflow)
6. [Testing Strategy](#testing-strategy)
7. [Performance Guidelines](#performance-guidelines)
8. [Documentation Standards](#documentation-standards)

## Project Overview

This project implements a robotic crane visualization system with inverse kinematics, physics simulation, and real-time WebSocket communication.

### Tech Stack

- **Frontend**: Vue 3, Three.js, Rapier.js, TypeScript
- **Backend**: Node.js, uWebSockets.js, TypeScript
- **Shared**: TypeScript interfaces, pnpm workspaces
- **Build Tools**: Vite, tsup, tsx

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 10.0.0

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd demo

# Run setup script
./scripts/setup-dev.sh

# Start development servers
pnpm dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm dev:frontend` | Start only frontend |
| `pnpm dev:backend` | Start only backend |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm lint` | Run linting |
| `pnpm test` | Run tests |

## Coding Standards

### TypeScript

1. **Strict Mode**: Always use strict TypeScript settings
2. **Explicit Types**: Prefer explicit types over inference for public APIs
3. **Interfaces**: Use interfaces for object shapes, types for unions/primitives

```typescript
// Good
interface CraneState {
  swing: number;
  lift: number;
}

// Bad
const state = {
  swing: 0,
  lift: 0
}
```

### Vue Components

1. **Composition API**: Use `<script setup>` syntax
2. **Props**: Define with TypeScript interfaces
3. **Naming**: PascalCase for components, kebab-case for templates

```vue
<script setup lang="ts">
interface Props {
  position: Vector3Like;
  enabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true
});
</script>
```

### Three.js Guidelines

1. **Memory Management**: Always dispose of geometries, materials, and textures
2. **Performance**: Use instanced meshes for repeated objects
3. **Organization**: Separate scene setup from animation logic

```typescript
onUnmounted(() => {
  // Clean up Three.js resources
  mesh.geometry.dispose();
  (mesh.material as Material).dispose();
  renderer.dispose();
});
```

### WebSocket Protocol

1. **Type Safety**: Use shared message types from `@monumental/shared`
2. **Error Handling**: Always handle connection failures
3. **Reconnection**: Implement exponential backoff

## Architecture Guidelines

### Package Structure

```
packages/
├── shared/          # Shared types and constants
├── frontend/        # Vue application
└── backend/         # WebSocket server
```

### State Management

- **Frontend**: Local component state for UI, WebSocket for crane state
- **Backend**: Authoritative crane state, broadcast to all clients
- **Shared**: Type definitions ensure consistency

### Coordinate System

- Units: Millimeters (mm) for all measurements
- Origin: Base of crane at (0, 0, 0)
- Axes: Y-up (Three.js standard)

## Git Workflow

### Branch Naming

```
feature/description-of-feature
fix/issue-description
docs/what-is-documented
refactor/what-is-refactored
```

### Commit Messages

Follow conventional commits:

```
feat: add gripper control to crane
fix: resolve WebSocket reconnection issue
docs: update IK solver documentation
refactor: simplify physics update loop
test: add unit tests for crane state
perf: optimize mesh updates
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes following coding standards
3. Run `pnpm typecheck` and `pnpm lint`
4. Create PR with description and testing steps
5. Address review comments
6. Squash merge to main

## Testing Strategy

### Unit Tests

- Test pure functions and utilities
- Mock external dependencies
- Aim for 80% coverage of business logic

### Integration Tests

- Test WebSocket communication
- Test physics simulation accuracy
- Test IK solver convergence

### E2E Tests

- Test full user workflows
- Test browser compatibility
- Test performance under load

## Performance Guidelines

### Optimization Targets

| Metric | Target | Current |
|--------|--------|---------|
| Frame Rate | 60 FPS | 60 FPS |
| IK Solve Time | <16ms | ~10ms |
| WebSocket Latency | <50ms | <1ms |
| Initial Load | <3s | TBD |

### Best Practices

1. **Rendering**:
   - Use frustum culling
   - Implement LOD for complex meshes
   - Batch draw calls

2. **Physics**:
   - Use simple colliders
   - Limit active bodies
   - Consider sleeping states

3. **Network**:
   - Implement message batching
   - Use binary protocol for production
   - Add compression

## Documentation Standards

### Code Comments

```typescript
/**
 * Solves inverse kinematics for the crane arm
 * @param target - Target position in world coordinates (mm)
 * @returns Joint angles in degrees, or null if no solution
 */
function solveIK(target: Vector3Like): CraneActuators | null {
  // Implementation
}
```

### Component Documentation

Each Vue component should have:
- Purpose description
- Props documentation
- Events documentation
- Usage example

### API Documentation

- Document all public APIs
- Include request/response examples
- Note rate limits and constraints

## Architecture Decision Records

Key decisions are documented in the `docs/adr/` directory:

- ADR-001: Choose Three.js over Babylon.js
- ADR-002: Select Rapier.js for physics
- ADR-003: Use vanilla Three.js instead of TresJS
- ADR-004: Implement binary WebSocket protocol

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check backend is running on port 9001
   - Verify no firewall blocking

2. **Physics Jittering**
   - Reduce timestep
   - Check for penetrating bodies

3. **IK Not Converging**
   - Verify target is within reach
   - Check joint constraints

### Debug Mode

Enable debug visualizations:

```typescript
// In development
if (import.meta.env.DEV) {
  scene.add(new THREE.AxesHelper(1000));
  world.debugRender();
}
```