# ADR-004: Implement Binary WebSocket Protocol

## Status

Proposed

## Context

WebSocket communication can use either text (JSON) or binary protocols. For real-time crane control with frequent state updates, we need to optimize bandwidth and parsing performance.

## Decision

We will implement a binary protocol for production while maintaining JSON for development/debugging.

## Rationale

1. **Bandwidth**: Binary protocol reduces message size by 60-80%
2. **Performance**: Faster parsing than JSON.parse()
3. **Type Safety**: Structured binary format prevents malformed data
4. **Precision**: Better floating-point precision control
5. **Compatibility**: Can maintain JSON fallback for debugging

## Protocol Design

```typescript
// Message Structure (Binary)
// [MessageType:u8][Timestamp:f64][Payload:varies]

// State Update Payload
// [Swing:f32][Lift:f32][Elbow:f32][Wrist:f32][Gripper:f32]
// [EndEffectorX:f32][EndEffectorY:f32][EndEffectorZ:f32]
// [Flags:u8]

// Total: 1 + 8 + 32 = 41 bytes vs ~200 bytes JSON
```

## Implementation

```typescript
class BinaryProtocol {
  encode(msg: StateUpdateMessage): ArrayBuffer {
    const buffer = new ArrayBuffer(41);
    const view = new DataView(buffer);

    view.setUint8(0, MessageType.STATE_UPDATE);
    view.setFloat64(1, msg.timestamp);
    view.setFloat32(9, msg.state.swing);
    // ... etc

    return buffer;
  }

  decode(buffer: ArrayBuffer): BaseMessage {
    const view = new DataView(buffer);
    const type = view.getUint8(0);
    // ... decode based on type
  }
}
```

## Consequences

### Positive

- 60-80% bandwidth reduction
- Improved parsing performance
- Better scalability for multiple clients
- Reduced server CPU usage

### Negative

- More complex implementation
- Harder to debug without tools
- Need to maintain protocol versioning
- Platform-specific endianness considerations

## Migration Strategy

1. Implement binary protocol alongside JSON
2. Add protocol negotiation in handshake
3. Use feature flag to enable binary mode
4. Monitor performance improvements
5. Deprecate JSON for production

## References

- [WebSocket Binary Protocol Design](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType)
- [Protocol Buffers vs Custom Binary](https://developers.google.com/protocol-buffers)
