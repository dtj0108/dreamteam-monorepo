// Voice Chat Types - for Grok Voice Agent API integration

// ============================================================================
// Voice Status & Personalities
// ============================================================================

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export type VoicePersonality = "ara" | "rex" | "sal" | "eve" | "leo";

export interface VoicePersonalityInfo {
  id: VoicePersonality;
  name: string;
  type: "female" | "male" | "neutral";
  tone: string;
  description: string;
}

export const VOICE_PERSONALITIES: VoicePersonalityInfo[] = [
  {
    id: "eve",
    name: "Eve",
    type: "female",
    tone: "Energetic, upbeat",
    description: "Vibrant and enthusiastic voice with high energy",
  },
  {
    id: "ara",
    name: "Ara",
    type: "female",
    tone: "Warm, friendly",
    description: "Approachable and comforting voice with warmth",
  },
  {
    id: "rex",
    name: "Rex",
    type: "male",
    tone: "Professional, clear",
    description: "Clear and articulate voice for business contexts",
  },
  {
    id: "sal",
    name: "Sal",
    type: "neutral",
    tone: "Smooth, balanced",
    description: "Balanced and versatile voice for any context",
  },
  {
    id: "leo",
    name: "Leo",
    type: "male",
    tone: "Authoritative",
    description: "Confident and commanding voice with presence",
  },
];

export const DEFAULT_VOICE: VoicePersonality = "eve";

// ============================================================================
// Audio Configuration
// ============================================================================

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  encoding: "pcm16" | "mulaw";
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
  encoding: "pcm16",
};

// ============================================================================
// WebSocket Client Event Types (sent to server)
// ============================================================================

export interface SessionConfigEvent {
  type: "session.update";
  session: {
    voice?: VoicePersonality;
    modalities?: ("text" | "audio")[];
    input_audio_format?: "pcm16" | "mulaw";
    output_audio_format?: "pcm16" | "mulaw";
    instructions?: string;
    temperature?: number;
    turn_detection?: {
      type: "server_vad";
      threshold?: number;
      prefix_padding_ms?: number;
      silence_duration_ms?: number;
    } | null;
  };
}

export interface InputAudioBufferAppendEvent {
  type: "input_audio_buffer.append";
  audio: string; // base64 encoded PCM audio
}

export interface InputAudioBufferCommitEvent {
  type: "input_audio_buffer.commit";
}

export interface InputAudioBufferClearEvent {
  type: "input_audio_buffer.clear";
}

export interface ResponseCreateEvent {
  type: "response.create";
  response?: {
    modalities?: ("text" | "audio")[];
    instructions?: string;
  };
}

export interface ResponseCancelEvent {
  type: "response.cancel";
}

export interface ConversationItemCreateEvent {
  type: "conversation.item.create";
  item: {
    type: "message";
    role: "user" | "assistant";
    content: {
      type: "input_text" | "text";
      text: string;
    }[];
  };
}

export type GrokClientEvent =
  | SessionConfigEvent
  | InputAudioBufferAppendEvent
  | InputAudioBufferCommitEvent
  | InputAudioBufferClearEvent
  | ResponseCreateEvent
  | ResponseCancelEvent
  | ConversationItemCreateEvent;

// ============================================================================
// WebSocket Server Event Types (received from server)
// ============================================================================

export interface SessionCreatedEvent {
  type: "session.created";
  session: {
    id: string;
    voice: VoicePersonality;
    modalities: ("text" | "audio")[];
  };
}

export interface SessionUpdatedEvent {
  type: "session.updated";
  session: {
    id: string;
    voice: VoicePersonality;
    modalities: ("text" | "audio")[];
  };
}

export interface ConversationCreatedEvent {
  type: "conversation.created";
  conversation: {
    id: string;
  };
}

export interface InputAudioBufferCommittedEvent {
  type: "input_audio_buffer.committed";
  item_id: string;
}

export interface InputAudioBufferClearedEvent {
  type: "input_audio_buffer.cleared";
}

export interface InputAudioBufferSpeechStartedEvent {
  type: "input_audio_buffer.speech_started";
  audio_start_ms: number;
  item_id: string;
}

export interface InputAudioBufferSpeechStoppedEvent {
  type: "input_audio_buffer.speech_stopped";
  audio_end_ms: number;
  item_id: string;
}

export interface ConversationItemCreatedEvent {
  type: "conversation.item.created";
  item: {
    id: string;
    type: "message";
    role: "user" | "assistant";
    status: "in_progress" | "completed";
  };
}

export interface ConversationItemInputAudioTranscriptionCompletedEvent {
  type: "conversation.item.input_audio_transcription.completed";
  item_id: string;
  content_index: number;
  transcript: string;
}

export interface ResponseCreatedEvent {
  type: "response.created";
  response: {
    id: string;
    status: "in_progress" | "completed" | "cancelled" | "failed";
  };
}

export interface ResponseOutputItemAddedEvent {
  type: "response.output_item.added";
  response_id: string;
  output_index: number;
  item: {
    id: string;
    type: "message";
    role: "assistant";
  };
}

export interface ResponseContentPartAddedEvent {
  type: "response.content_part.added";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: {
    type: "audio" | "text";
  };
}

export interface ResponseAudioDeltaEvent {
  type: "response.audio.delta";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 encoded audio chunk
}

export interface ResponseAudioDoneEvent {
  type: "response.audio.done";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
}

export interface ResponseAudioTranscriptDeltaEvent {
  type: "response.audio_transcript.delta";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponseAudioTranscriptDoneEvent {
  type: "response.audio_transcript.done";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string;
}

export interface ResponseTextDeltaEvent {
  type: "response.text.delta";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponseTextDoneEvent {
  type: "response.text.done";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  text: string;
}

export interface ResponseDoneEvent {
  type: "response.done";
  response: {
    id: string;
    status: "completed" | "cancelled" | "failed";
    usage?: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      input_token_details?: {
        audio_tokens?: number;
        text_tokens?: number;
      };
      output_token_details?: {
        audio_tokens?: number;
        text_tokens?: number;
      };
    };
  };
}

export interface RateLimitsUpdatedEvent {
  type: "rate_limits.updated";
  rate_limits: {
    name: string;
    limit: number;
    remaining: number;
    reset_seconds: number;
  }[];
}

export interface ErrorEvent {
  type: "error";
  error: {
    type: string;
    code: string;
    message: string;
    param?: string;
  };
}

export type GrokServerEvent =
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | ConversationCreatedEvent
  | InputAudioBufferCommittedEvent
  | InputAudioBufferClearedEvent
  | InputAudioBufferSpeechStartedEvent
  | InputAudioBufferSpeechStoppedEvent
  | ConversationItemCreatedEvent
  | ConversationItemInputAudioTranscriptionCompletedEvent
  | ResponseCreatedEvent
  | ResponseOutputItemAddedEvent
  | ResponseContentPartAddedEvent
  | ResponseAudioDeltaEvent
  | ResponseAudioDoneEvent
  | ResponseAudioTranscriptDeltaEvent
  | ResponseAudioTranscriptDoneEvent
  | ResponseTextDeltaEvent
  | ResponseTextDoneEvent
  | ResponseDoneEvent
  | RateLimitsUpdatedEvent
  | ErrorEvent;

// ============================================================================
// Voice Chat Hook Types
// ============================================================================

export interface VoiceChatState {
  status: VoiceStatus;
  isConnected: boolean;
  inputLevel: number;
  outputLevel: number;
  userTranscript: string;
  assistantTranscript: string;
  voice: VoicePersonality;
  isMuted: boolean;
  error: Error | null;
}

export interface VoiceChatActions {
  setVoice: (voice: VoicePersonality) => void;
  startSession: () => Promise<void>;
  endSession: () => void;
  interrupt: () => void;
  toggleMute: () => void;
}

export type UseAgentVoiceChatReturn = VoiceChatState & VoiceChatActions;

// ============================================================================
// Audio Manager Types
// ============================================================================

export interface AudioManagerOptions {
  onAudioLevel?: (level: number) => void;
  onRecordingData?: (data: string) => void; // base64 PCM
  onPlaybackComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface AudioManagerState {
  isRecording: boolean;
  isPlaying: boolean;
  recordingLevel: number;
  playbackLevel: number;
}
