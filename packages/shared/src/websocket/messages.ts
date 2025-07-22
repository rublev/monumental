/**
 * WebSocket message definitions
 */

import type { BaseMessage, MessageType } from './types'
import type { CraneState } from '../crane/types'

// State update message
export interface StateUpdateMessage extends BaseMessage {
  type: MessageType.STATE_UPDATE
  state: CraneState
  objects?: any[]
}
