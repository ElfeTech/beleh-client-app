import type { AssistantTurnResponse } from './api';
import type { ChatRunPhase, ChatRunStatus } from '../lib/uiMemory/keys';

export type { ChatRunPhase, ChatRunStatus };

export interface RunStatus {
  run_id: string;
  session_id: string;
  client_turn_id: string;
  user_message_id: string;
  assistant_message_id: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  phase: ChatRunPhase | null;
  error_code: string | null;
  error_detail: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface ActiveRunResponse {
  run: RunStatus | null;
}

export interface CancelRunResponse {
  run_id: string;
  status: RunStatus['status'];
  cancelled: boolean;
}

export interface ChatRunStartBody {
  prompt: string;
  dataset_id: string | null;
  client_turn_id: string;
}

export interface ChatRunEventRun {
  run_id: string;
  session_id: string;
  client_turn_id: string;
  user_message_id: string;
  status: string;
  started_at: string;
}

export interface ChatRunEventStatus {
  seq?: number;
  phase: ChatRunPhase;
  label?: string;
}

export interface ChatRunEventToken {
  delta: string;
}

export interface ChatRunEventDone extends AssistantTurnResponse {
  run_id?: string;
}

export interface ChatRunEventError {
  code?: string;
  detail?: string;
  message?: string;
  retryable?: boolean;
  limit_type?: string;
  current_usage?: number;
  limit?: number;
  remaining?: number;
  reset_at?: string | null;
  upgrade_url?: string | null;
}

export type ChatRunStreamHandlers = {
  onRun?: (payload: ChatRunEventRun, seq: number | null) => void;
  onStatus?: (payload: ChatRunEventStatus, seq: number | null) => void;
  onToken?: (delta: string, seq: number | null) => void;
  onDone?: (payload: ChatRunEventDone, seq: number | null) => void;
  onError?: (payload: ChatRunEventError, seq: number | null) => void;
};
