// useAgentVoiceChat - React hook for voice conversations with AI agents

import { useState, useCallback, useRef, useEffect } from "react";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";

import {
  VoiceStatus,
  VoicePersonality,
  GrokServerEvent,
  UseAgentVoiceChatReturn,
  DEFAULT_VOICE,
} from "../types/voice";
import { GrokWebSocket, createGrokWebSocket } from "../voice/GrokWebSocket";
import { AudioManager, createAudioManager } from "../voice/AudioManager";

// ============================================================================
// Types
// ============================================================================

interface UseAgentVoiceChatOptions {
  agentId: string;
  instructions?: string;
  onTranscriptUpdate?: (userTranscript: string, assistantTranscript: string) => void;
  onError?: (error: Error) => void;
  onSessionEnd?: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentVoiceChat({
  agentId,
  instructions,
  onTranscriptUpdate,
  onError,
  onSessionEnd,
}: UseAgentVoiceChatOptions): UseAgentVoiceChatReturn {
  // State
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [voice, setVoiceState] = useState<VoicePersonality>(DEFAULT_VOICE);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const wsRef = useRef<GrokWebSocket | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const isSessionActiveRef = useRef(false);

  // Get API key from environment
  const apiKey = Constants.expoConfig?.extra?.XAI_API_KEY ||
                 process.env.EXPO_PUBLIC_XAI_API_KEY || "";

  // ============================================================================
  // WebSocket Event Handler
  // ============================================================================

  const handleServerEvent = useCallback(
    (event: GrokServerEvent) => {
      switch (event.type) {
        case "session.created":
        case "session.updated":
          console.log("[VoiceChat] Session:", event.session.id);
          break;

        case "input_audio_buffer.speech_started":
          setStatus("listening");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case "input_audio_buffer.speech_stopped":
          setStatus("processing");
          break;

        case "conversation.item.input_audio_transcription.completed":
          setUserTranscript((prev) => {
            const newTranscript = prev
              ? `${prev}\n${event.transcript}`
              : event.transcript;
            onTranscriptUpdate?.(newTranscript, assistantTranscript);
            return newTranscript;
          });
          break;

        case "response.created":
          setStatus("processing");
          break;

        case "response.audio.delta":
        case "response.output_audio.delta":
          console.log("[VoiceChat] Audio delta received, size:", event.delta?.length || 0);
          setStatus("speaking");
          // Queue audio chunk (don't play yet - wait for done event)
          audioManagerRef.current?.queueAudio(event.delta);
          break;

        case "response.audio.done":
        case "response.output_audio.done":
          // Audio stream complete - now play all accumulated chunks
          audioManagerRef.current?.flushAudioQueue();
          break;

        case "response.audio_transcript.delta":
        case "response.output_audio_transcript.delta":
          setAssistantTranscript((prev) => {
            const newTranscript = prev + event.delta;
            onTranscriptUpdate?.(userTranscript, newTranscript);
            return newTranscript;
          });
          break;

        case "response.audio_transcript.done":
        case "response.output_audio_transcript.done":
          setAssistantTranscript((prev) => {
            // Replace with final transcript
            const lines = prev.split("\n");
            lines[lines.length - 1] = event.transcript;
            const newTranscript = lines.join("\n");
            onTranscriptUpdate?.(userTranscript, newTranscript);
            return newTranscript;
          });
          break;

        case "response.done":
          if (event.response.status === "completed") {
            // Response complete, go back to listening
            setStatus("listening");
          } else if (event.response.status === "cancelled") {
            // Interrupted
            setStatus("listening");
          } else if (event.response.status === "failed") {
            setStatus("error");
            const err = new Error("Response generation failed");
            setError(err);
            onError?.(err);
          }
          break;

        case "error":
          console.error("[VoiceChat] Error:", event.error);
          const err = new Error(event.error.message);
          setError(err);
          onError?.(err);
          // Don't necessarily end session on error - some are recoverable
          if (event.error.code === "session_expired") {
            endSession();
          }
          break;

        default:
          // Log unhandled events for debugging
          console.debug("[VoiceChat] Unhandled event:", event.type);
      }
    },
    [assistantTranscript, userTranscript, onTranscriptUpdate, onError]
  );

  // ============================================================================
  // Session Management
  // ============================================================================

  const startSession = useCallback(async (): Promise<void> => {
    if (isSessionActiveRef.current) {
      console.warn("[VoiceChat] Session already active");
      return;
    }

    if (!apiKey) {
      const err = new Error("XAI API key not configured");
      setError(err);
      onError?.(err);
      throw err;
    }

    setStatus("connecting");
    setError(null);
    setUserTranscript("");
    setAssistantTranscript("");

    try {
      // Initialize audio manager
      const audioManager = createAudioManager({
        onAudioLevel: (level) => setInputLevel(level),
        onRecordingData: (data) => {
          // Send audio to WebSocket
          if (wsRef.current?.isConnected() && !isMuted) {
            wsRef.current.sendAudio(data);
          }
        },
        onPlaybackComplete: async () => {
          setOutputLevel(0);
          // Resume listening after playback
          if (isSessionActiveRef.current && audioManagerRef.current) {
            try {
              // Resume recording after playback completes
              await audioManagerRef.current.resumeRecording();
              setStatus("listening");
              console.log("[VoiceChat] Resumed recording after playback");
            } catch (e) {
              console.error("[VoiceChat] Failed to resume recording:", e);
              setStatus("listening");
            }
          }
        },
        onError: (err) => {
          console.error("[VoiceChat] Audio error:", err);
          onError?.(err);
        },
      });

      await audioManager.initialize();
      audioManagerRef.current = audioManager;

      // Create WebSocket connection
      const ws = createGrokWebSocket({
        apiKey,
        voice,
        instructions: instructions || `You are a helpful AI assistant named ${agentId}. Be concise in your responses.`,
        onOpen: () => {
          setIsConnected(true);
          setStatus("listening");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onClose: (code, reason) => {
          console.log("[VoiceChat] WebSocket closed:", code, reason);
          setIsConnected(false);
          if (isSessionActiveRef.current) {
            // Unexpected close
            setStatus("error");
          }
        },
        onError: (err) => {
          console.error("[VoiceChat] WebSocket error:", err);
          setError(err);
          setStatus("error");
          onError?.(err);
        },
        onEvent: handleServerEvent,
      });

      wsRef.current = ws;
      await ws.connect();

      // Start recording
      await audioManager.startRecording();

      isSessionActiveRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("[VoiceChat] Failed to start session:", err);
      const error = err instanceof Error ? err : new Error("Failed to start voice session");
      setError(error);
      setStatus("error");
      onError?.(error);

      // Cleanup on failure
      await cleanupSession();
      throw error;
    }
  }, [apiKey, voice, instructions, agentId, isMuted, handleServerEvent, onError]);

  const endSession = useCallback((): void => {
    if (!isSessionActiveRef.current) {
      return;
    }

    isSessionActiveRef.current = false;
    cleanupSession();
    setStatus("idle");
    onSessionEnd?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onSessionEnd]);

  const cleanupSession = async (): Promise<void> => {
    // Stop and cleanup audio
    if (audioManagerRef.current) {
      await audioManagerRef.current.cleanup();
      audioManagerRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    setIsConnected(false);
    setInputLevel(0);
    setOutputLevel(0);
  };

  // ============================================================================
  // Voice Actions
  // ============================================================================

  const interrupt = useCallback((): void => {
    if (!isSessionActiveRef.current) return;

    // Cancel current response
    wsRef.current?.cancelResponse();

    // Stop playback
    audioManagerRef.current?.interrupt();

    // Clear audio buffer
    wsRef.current?.clearAudioBuffer();

    setStatus("listening");
    setOutputLevel(0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const toggleMute = useCallback((): void => {
    setIsMuted((prev) => {
      const newMuted = !prev;

      if (newMuted) {
        // Clear any pending audio when muting
        wsRef.current?.clearAudioBuffer();
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return newMuted;
    });
  }, []);

  const setVoice = useCallback((newVoice: VoicePersonality): void => {
    setVoiceState(newVoice);

    // Update session if connected
    if (wsRef.current?.isConnected()) {
      wsRef.current.updateSession({ voice: newVoice });
    }
  }, []);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      if (isSessionActiveRef.current) {
        isSessionActiveRef.current = false;
        cleanupSession();
      }
    };
  }, []);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // State
    status,
    isConnected,
    inputLevel,
    outputLevel,
    userTranscript,
    assistantTranscript,
    voice,
    isMuted,
    error,

    // Actions
    setVoice,
    startSession,
    endSession,
    interrupt,
    toggleMute,
  };
}

export type { UseAgentVoiceChatOptions };
