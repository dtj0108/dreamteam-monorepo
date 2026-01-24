// GrokWebSocket - WebSocket client for Grok Voice Agent API

import {
  GrokClientEvent,
  GrokServerEvent,
  VoicePersonality,
  DEFAULT_VOICE,
} from "../types/voice";

// ============================================================================
// Types
// ============================================================================

export interface GrokWebSocketOptions {
  apiKey: string;
  model?: string;
  voice?: VoicePersonality;
  instructions?: string;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: GrokServerEvent) => void;
}

export type GrokWebSocketState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// ============================================================================
// GrokWebSocket Class
// ============================================================================

export class GrokWebSocket {
  private ws: WebSocket | null = null;
  private options: GrokWebSocketOptions;
  private state: GrokWebSocketState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private sessionId: string | null = null;
  private conversationId: string | null = null;

  // API endpoint
  private readonly API_URL = "wss://api.x.ai/v1/realtime";

  constructor(options: GrokWebSocketOptions) {
    this.options = {
      model: "grok-2-public",
      voice: DEFAULT_VOICE,
      ...options,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === "connecting" || this.state === "connected") {
        resolve();
        return;
      }

      this.state = "connecting";

      try {
        // Build URL with query params
        const url = `${this.API_URL}?model=${this.options.model}`;

        // Create WebSocket with Bearer token authentication
        // React Native's WebSocket doesn't support custom headers, so we use
        // the subprotocol parameter to pass the auth token (following OpenAI's pattern)
        this.ws = new WebSocket(url, [
          "realtime",
          `openai-insecure-api-key.${this.options.apiKey}`,
          "openai-beta.realtime-v1",
        ]);

        this.ws.onopen = () => {
          this.state = "connected";
          this.reconnectAttempts = 0;

          // Send auth message immediately after connection
          // Some WebSocket APIs require this pattern
          this.sendAuthAndSessionConfig();

          this.options.onOpen?.();
          resolve();
        };

        this.ws.onclose = (event) => {
          const wasConnected = this.state === "connected";
          this.state = "disconnected";
          this.ws = null;
          this.sessionId = null;

          this.options.onClose?.(event.code, event.reason);

          // Auto-reconnect if we were connected before
          if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error("WebSocket error");
          this.state = "error";
          this.options.onError?.(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.state = "error";
        const err = error instanceof Error ? error : new Error("Connection failed");
        this.options.onError?.(err);
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.state = "disconnected";
    this.sessionId = null;
    this.conversationId = null;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as GrokServerEvent;

      // Track session and conversation IDs
      if (event.type === "session.created") {
        this.sessionId = event.session.id;
      } else if (event.type === "conversation.created") {
        this.conversationId = event.conversation.id;
      }

      // Forward to handler
      this.options.onEvent?.(event);
    } catch (error) {
      console.error("[GrokWebSocket] Failed to parse message:", error);
    }
  }

  // ============================================================================
  // Send Methods
  // ============================================================================

  private send(event: GrokClientEvent): void {
    if (!this.ws || this.state !== "connected") {
      console.warn("[GrokWebSocket] Cannot send: not connected");
      return;
    }

    try {
      this.ws.send(JSON.stringify(event));
    } catch (error) {
      console.error("[GrokWebSocket] Failed to send:", error);
      this.options.onError?.(
        error instanceof Error ? error : new Error("Send failed")
      );
    }
  }

  private sendAuthAndSessionConfig(): void {
    // Configure session with voice and audio settings
    this.send({
      type: "session.update",
      session: {
        voice: this.options.voice,
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        instructions: this.options.instructions,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update session configuration (e.g., change voice)
   */
  updateSession(config: {
    voice?: VoicePersonality;
    instructions?: string;
  }): void {
    this.send({
      type: "session.update",
      session: config,
    });
  }

  /**
   * Send audio data (base64 encoded PCM)
   */
  sendAudio(audioData: string): void {
    this.send({
      type: "input_audio_buffer.append",
      audio: audioData,
    });
  }

  /**
   * Commit the audio buffer (signal end of speech)
   */
  commitAudioBuffer(): void {
    this.send({
      type: "input_audio_buffer.commit",
    });
  }

  /**
   * Clear the audio buffer
   */
  clearAudioBuffer(): void {
    this.send({
      type: "input_audio_buffer.clear",
    });
  }

  /**
   * Interrupt current response (stop AI from speaking)
   */
  cancelResponse(): void {
    this.send({
      type: "response.cancel",
    });
  }

  /**
   * Manually trigger a response (useful after sending text)
   */
  createResponse(): void {
    this.send({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
      },
    });
  }

  /**
   * Send a text message (instead of audio)
   */
  sendTextMessage(text: string): void {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    });
    // Trigger response after sending text
    this.createResponse();
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getState(): GrokWebSocketState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === "connected";
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getConversationId(): string | null {
    return this.conversationId;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGrokWebSocket(
  options: GrokWebSocketOptions
): GrokWebSocket {
  return new GrokWebSocket(options);
}
