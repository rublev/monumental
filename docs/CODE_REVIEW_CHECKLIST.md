# Code Review Checklist

## General

- [ ] Code follows project coding standards
- [ ] No commented-out code
- [ ] No debug console.log statements
- [ ] Proper error handling implemented
- [ ] Code is self-documenting or has appropriate comments

## TypeScript

- [ ] No `any` types (unless justified)
- [ ] Interfaces defined for complex objects
- [ ] Type imports use `import type` syntax
- [ ] Return types explicitly defined for public functions
- [ ] Shared types imported from `@monumental/shared`

## Vue Components

- [ ] Uses `<script setup>` syntax
- [ ] Props have TypeScript interfaces
- [ ] Events are properly typed with `defineEmits`
- [ ] Computed properties used for derived state
- [ ] No memory leaks in lifecycle hooks

## Three.js

- [ ] Geometries, materials, and textures disposed in cleanup
- [ ] Render loop properly managed
- [ ] Scene objects removed when component unmounts
- [ ] Efficient use of geometries (instancing for repeated objects)
- [ ] Proper lighting setup

## WebSocket

- [ ] Connection error handling implemented
- [ ] Reconnection logic with exponential backoff
- [ ] Message validation before processing
- [ ] Proper cleanup on disconnect
- [ ] Uses shared message types

## Performance

- [ ] No unnecessary re-renders
- [ ] Large lists use virtualization if needed
- [ ] Assets are optimized (textures, models)
- [ ] Computationally expensive operations are memoized
- [ ] Physics bodies are properly managed

## Testing

- [ ] Unit tests added for new functions
- [ ] Integration tests for new features
- [ ] Edge cases handled
- [ ] Error scenarios tested
- [ ] Performance benchmarks for critical paths

## Documentation

- [ ] README updated if needed
- [ ] API documentation for public functions
- [ ] Complex algorithms have explanatory comments
- [ ] Breaking changes documented
- [ ] Examples provided for new features

## Security

- [ ] Input validation implemented
- [ ] No hardcoded secrets or API keys
- [ ] WebSocket messages sanitized
- [ ] Rate limiting considered
- [ ] CORS properly configured

## Accessibility

- [ ] Keyboard navigation supported where applicable
- [ ] ARIA labels for interactive elements
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader friendly
- [ ] Focus indicators visible
