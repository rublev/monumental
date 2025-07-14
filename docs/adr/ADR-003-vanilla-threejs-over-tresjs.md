# ADR-003: Use Vanilla Three.js Instead of TresJS

## Status

Accepted

## Context

TresJS provides Vue integration for Three.js, offering a declarative approach. We need to decide between using TresJS or vanilla Three.js with Vue.

## Decision

We will use vanilla Three.js instead of TresJS.

## Rationale

1. **IK Integration**: CCDIKSolver requires direct access to Three.js objects, which is more complex with TresJS
2. **Performance Control**: Direct control over render loop and optimizations
3. **Debugging**: Easier to debug with standard Three.js tools and examples
4. **Flexibility**: Full access to Three.js API without abstraction limitations
5. **Learning Resources**: All Three.js documentation and examples apply directly

## Consequences

### Positive

- Full control over Three.js scene and rendering
- Direct integration with CCDIKSolver
- Better performance optimization opportunities
- Access to all Three.js examples and patterns
- Easier physics engine integration

### Negative

- More imperative code in Vue components
- Manual lifecycle management
- Need to handle Three.js cleanup manually
- Less Vue-idiomatic approach

## Implementation Pattern

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';

const containerRef = ref<HTMLDivElement>();
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

onMounted(() => {
  // Initialize Three.js
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  // ...setup
});

onUnmounted(() => {
  // Cleanup
  renderer.dispose();
});
</script>
```

## References

- [Vue + Three.js Integration Patterns](https://vuejs.org/examples/#webgl)
- [TresJS Limitations](https://github.com/Tresjs/tres/issues)
