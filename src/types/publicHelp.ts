export interface PublicHelpSessionResponse {
  session_id: string;
}

export interface PublicHelpTokenData {
  delta: string;
}

export interface PublicHelpDoneData {
  session_id: string;
  message_id: string;
  user_message_id: string;
  content: string;
}

export type PublicHelpStreamHandlers = {
  onToken: (delta: string) => void;
  onDone: (payload: PublicHelpDoneData) => void;
  onError?: (message: string) => void;
};
