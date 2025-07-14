# Performance Monitoring Guide

## Key Metrics

### Frame Rate

- **Target**: 60 FPS
- **Minimum**: 30 FPS
- **Measurement**: `stats.js` or Chrome DevTools

### Latency

- **WebSocket RTT**: < 50ms
- **IK Solve Time**: < 16ms
- **Physics Step**: < 8ms

### Memory Usage

- **Baseline**: < 100MB
- **With Physics**: < 200MB
- **Monitor for leaks**: Chrome Memory Profiler

## Monitoring Tools

### Development

```typescript
// Add stats.js for FPS monitoring
import Stats from 'stats.js';

const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();

  // ... render code

  stats.end();
  requestAnimationFrame(animate);
}
```

### Production

```typescript
// Performance Observer API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Log to monitoring service
    analytics.track('performance', {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    });
  }
});

observer.observe({ entryTypes: ['measure'] });
```

## Performance Budgets

| Metric              | Budget  | Alert Threshold |
| ------------------- | ------- | --------------- |
| Initial Load        | < 3s    | > 5s            |
| Time to Interactive | < 5s    | > 8s            |
| Bundle Size         | < 500KB | > 750KB         |
| Memory Usage        | < 200MB | > 300MB         |
| CPU Usage           | < 50%   | > 80%           |

## Optimization Techniques

### Rendering

1. **Frustum Culling**

```typescript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

2. **Level of Detail (LOD)**

```typescript
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(mediumDetailMesh, 50);
lod.addLevel(lowDetailMesh, 100);
```

3. **Instanced Rendering**

```typescript
const mesh = new THREE.InstancedMesh(geometry, material, count);
```

### Physics

1. **Sleep inactive bodies**
2. **Use simple colliders**
3. **Reduce solver iterations**
4. **Spatial partitioning**

### Network

1. **Message batching**
2. **Binary protocol**
3. **Compression**
4. **Delta updates**

## Profiling Workflow

1. **Identify Bottleneck**
   - Use Chrome DevTools Performance tab
   - Look for long tasks (> 50ms)

2. **Measure Baseline**
   - Record performance profile
   - Note key metrics

3. **Optimize**
   - Apply targeted optimization
   - Avoid premature optimization

4. **Verify Improvement**
   - Re-profile
   - Compare metrics
   - Check for regressions

## Automated Performance Testing

```json
// lighthouse.config.js
{
  "extends": "lighthouse:default",
  "settings": {
    "onlyCategories": ["performance"],
    "throttling": {
      "cpuSlowdownMultiplier": 4
    }
  },
  "audits": [
    "metrics/first-contentful-paint",
    "metrics/speed-index",
    "metrics/interactive"
  ]
}
```

## Performance Checklist

- [ ] Profile before and after changes
- [ ] Test on low-end devices
- [ ] Monitor memory usage over time
- [ ] Check network payload sizes
- [ ] Verify 60 FPS maintained
- [ ] Test with multiple physics objects
- [ ] Measure WebSocket latency
- [ ] Check bundle size impact
