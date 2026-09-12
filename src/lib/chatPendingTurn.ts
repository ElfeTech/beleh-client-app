/**
 * @deprecated Use `./chatRunMemory` instead.
 * Legacy sessionStorage helpers are no longer used; GenerativeChat uses durable chat runs.
 */
export type { PersistedChatRun as ChatPendingTurn } from './uiMemory/keys';
export {
  clearChatRun as clearChatPendingTurn,
  getChatRun as getChatPendingTurn,
  setChatRun as setChatPendingTurn,
} from './chatRunMemory';
