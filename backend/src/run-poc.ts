#!/usr/bin/env tsx

// Simple runner for proof of concept servers
const poc = process.argv[2]

if (!poc) {
  console.error('Usage: tsx run-poc.ts <poc-name>')
  console.error('Available POCs:')
  console.error('  - websocket-echo')
  process.exit(1)
}

switch (poc) {
  case 'websocket-echo':
    import('./poc/websocket-echo')
    break
  default:
    console.error(`Unknown POC: ${poc}`)
    process.exit(1)
}