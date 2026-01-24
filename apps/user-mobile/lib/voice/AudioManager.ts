// AudioManager - Handles audio recording and playback for voice chat

import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from "expo-av";
import { File, Paths } from "expo-file-system";

import { AudioManagerOptions, AudioManagerState, DEFAULT_AUDIO_CONFIG } from "../types/voice";

// ============================================================================
// Constants
// ============================================================================

const RECORDING_OPTIONS = {
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 384000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 384000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

// Chunk interval for streaming audio (ms)
const CHUNK_INTERVAL_MS = 250;

// ============================================================================
// AudioManager Class
// ============================================================================

export class AudioManager {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private options: AudioManagerOptions;
  private state: AudioManagerState = {
    isRecording: false,
    isPlaying: false,
    recordingLevel: 0,
    playbackLevel: 0,
  };

  // For streaming recording
  private recordingUri: string | null = null;
  private lastReadPosition = 0;
  private chunkInterval: ReturnType<typeof setInterval> | null = null;

  // For streaming playback
  private audioQueue: string[] = [];
  private isProcessingQueue = false;
  private tempPlaybackFile: File | null = null;

  constructor(options: AudioManagerOptions = {}) {
    this.options = options;
  }

  // ============================================================================
  // Audio Session Setup
  // ============================================================================

  async initialize(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("[AudioManager] Failed to initialize:", error);
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      return granted;
    } catch (error) {
      console.error("[AudioManager] Permission request failed:", error);
      return false;
    }
  }

  // ============================================================================
  // Recording
  // ============================================================================

  async startRecording(): Promise<void> {
    if (this.state.isRecording) {
      console.warn("[AudioManager] Already recording");
      return;
    }

    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error("Microphone permission denied");
      }

      // Stop any playing audio
      await this.stopPlayback();

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Create and prepare recording
      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS,
        this.onRecordingStatusUpdate
      );

      this.recording = recording;
      this.recordingUri = recording.getURI();
      this.lastReadPosition = 0;
      this.state.isRecording = true;

      // Start chunk streaming interval
      this.chunkInterval = setInterval(
        () => this.streamAudioChunk(),
        CHUNK_INTERVAL_MS
      );
    } catch (error) {
      console.error("[AudioManager] Failed to start recording:", error);
      this.state.isRecording = false;
      this.options.onError?.(
        error instanceof Error ? error : new Error("Recording failed")
      );
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.state.isRecording || !this.recording) {
      return;
    }

    try {
      // Stop chunk streaming
      if (this.chunkInterval) {
        clearInterval(this.chunkInterval);
        this.chunkInterval = null;
      }

      // Send any remaining audio
      await this.streamAudioChunk();

      // Stop and unload recording
      await this.recording.stopAndUnloadAsync();

      // Clean up recording file
      if (this.recordingUri) {
        try {
          const recordingFile = new File(this.recordingUri);
          if (recordingFile.exists) {
            await recordingFile.delete();
          }
        } catch {
          // Ignore cleanup errors
        }
      }

      this.recording = null;
      this.recordingUri = null;
      this.lastReadPosition = 0;
      this.state.isRecording = false;
      this.state.recordingLevel = 0;
    } catch (error) {
      console.error("[AudioManager] Failed to stop recording:", error);
      this.state.isRecording = false;
      throw error;
    }
  }

  async resumeRecording(): Promise<void> {
    if (!this.recording) {
      console.log("[AudioManager] No recording to resume, starting fresh");
      // If recording was fully stopped, start a new one
      await this.startRecording();
      return;
    }

    try {
      // Set audio mode back to recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Get current recording status
      const status = await this.recording.getStatusAsync();

      if (!status.isRecording) {
        // Resume the paused recording
        await this.recording.startAsync();
        this.state.isRecording = true;

        // Restart chunk streaming
        if (!this.chunkInterval) {
          this.chunkInterval = setInterval(
            () => this.streamAudioChunk(),
            CHUNK_INTERVAL_MS
          );
        }

        console.log("[AudioManager] Recording resumed");
      } else {
        console.log("[AudioManager] Recording was already active");
        this.state.isRecording = true;
      }
    } catch (error) {
      console.error("[AudioManager] Failed to resume recording:", error);
      // If resume fails, try to start a fresh recording
      this.recording = null;
      this.recordingUri = null;
      await this.startRecording();
    }
  }

  private onRecordingStatusUpdate = (status: Audio.RecordingStatus): void => {
    if (status.isRecording && status.metering !== undefined) {
      // Convert dB to 0-1 range (dB typically ranges from -160 to 0)
      const normalizedLevel = Math.max(0, (status.metering + 60) / 60);
      this.state.recordingLevel = normalizedLevel;
      this.options.onAudioLevel?.(normalizedLevel);
    }
  };

  private async streamAudioChunk(): Promise<void> {
    if (!this.recording || !this.recordingUri) {
      return;
    }

    try {
      // Get current recording status to check duration/size
      const status = await this.recording.getStatusAsync();
      if (!status.isRecording) {
        return;
      }

      // Use the File class to read the recording
      const recordingFile = new File(this.recordingUri);

      if (!recordingFile.exists) {
        return;
      }

      // Read file size to get current recording length
      const fileSize = recordingFile.size || 0;
      
      // Skip if no new data since last read (accounting for WAV header)
      const WAV_HEADER_SIZE = 44;
      if (fileSize <= this.lastReadPosition || fileSize <= WAV_HEADER_SIZE) {
        return;
      }

      // Read the entire file as bytes, then extract only new data
      const base64Data = await recordingFile.base64();
      
      if (base64Data && base64Data.length > 0) {
        // Decode base64 to get raw bytes
        const allBytes = this.base64ToUint8Array(base64Data);
        
        // Calculate start position (skip header on first read, skip already-sent data on subsequent)
        const startPos = this.lastReadPosition > 0 ? this.lastReadPosition : WAV_HEADER_SIZE;
        
        if (allBytes.length > startPos) {
          // Extract only the new audio data
          const newData = allBytes.slice(startPos);
          
          
          // Convert new data back to base64 and send
          const newBase64 = this.uint8ArrayToBase64(newData);
          this.options.onRecordingData?.(newBase64);
          
          // Update position to current file size
          this.lastReadPosition = allBytes.length;
        }
      }
    } catch (error) {
      // Ignore read errors during active recording
      console.debug("[AudioManager] Chunk read error:", error);
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ============================================================================
  // Playback
  // ============================================================================

  async queueAudio(base64Audio: string): Promise<void> {
    console.log("[AudioManager] Queuing audio chunk, size:", base64Audio.length);
    // Just accumulate chunks - don't play until flushAudioQueue is called
    this.audioQueue.push(base64Audio);
  }

  async flushAudioQueue(): Promise<void> {
    console.log("[AudioManager] Flushing audio queue, chunks:", this.audioQueue.length);
    this.processAudioQueue();
  }

  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Collect all queued chunks
      const chunks = this.audioQueue.splice(0, this.audioQueue.length);
      const combinedAudio = chunks.join("");

      console.log("[AudioManager] Processing queue, chunks:", chunks.length, "total size:", combinedAudio.length);

      if (combinedAudio.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      // Pause recording before switching audio mode (iOS audio mode conflict fix)
      if (this.recording && this.state.isRecording) {
        try {
          // Stop the chunk streaming interval
          if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
          }
          // Pause the recording
          await this.recording.pauseAsync();
          console.log("[AudioManager] Paused recording for playback");
        } catch (e) {
          console.warn("[AudioManager] Failed to pause recording:", e);
        }
      }

      // Create temp file for playback using new File API
      const fileName = `voice_playback_${Date.now()}.wav`;
      const tempFile = new File(Paths.cache, fileName);

      // Create WAV header for the PCM data
      const wavHeader = this.createWavHeader(
        Math.floor((combinedAudio.length * 3) / 4)
      );

      // Decode base64 and combine with header
      const headerBytes = this.base64ToUint8Array(wavHeader);
      const audioBytes = this.base64ToUint8Array(combinedAudio);
      const fullAudio = new Uint8Array(headerBytes.length + audioBytes.length);
      fullAudio.set(headerBytes, 0);
      fullAudio.set(audioBytes, headerBytes.length);

      // Write to file
      await tempFile.write(fullAudio);
      console.log("[AudioManager] Wrote temp file:", tempFile.uri);

      this.tempPlaybackFile = tempFile;

      // Set audio mode for playback (now safe because recording is paused)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log("[AudioManager] Set audio mode for playback");

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile.uri },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate
      );
      console.log("[AudioManager] Sound created, starting playback");

      // Unload previous sound if exists
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      this.sound = sound;
      this.state.isPlaying = true;
    } catch (error) {
      console.error("[AudioManager] Playback error:", error);
      this.options.onError?.(
        error instanceof Error ? error : new Error("Playback failed")
      );
    } finally {
      this.isProcessingQueue = false;

      // Process any chunks that arrived while we were playing
      if (this.audioQueue.length > 0) {
        setTimeout(() => this.processAudioQueue(), 0);
      }
    }
  }

  private onPlaybackStatusUpdate = async (status: AVPlaybackStatus): Promise<void> => {
    if (!status.isLoaded) {
      return;
    }

    if (status.didJustFinish) {
      this.state.isPlaying = false;
      this.state.playbackLevel = 0;
      this.options.onPlaybackComplete?.();

      // Clean up temp file
      if (this.tempPlaybackFile && this.tempPlaybackFile.exists) {
        try {
          await this.tempPlaybackFile.delete();
        } catch {
          // Ignore cleanup errors
        }
        this.tempPlaybackFile = null;
      }
    }
  };

  async stopPlayback(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {
        // Ignore stop errors
      }
      this.sound = null;
    }

    this.audioQueue = [];
    this.isProcessingQueue = false;
    this.state.isPlaying = false;
    this.state.playbackLevel = 0;

    // Clean up temp file
    if (this.tempPlaybackFile && this.tempPlaybackFile.exists) {
      try {
        await this.tempPlaybackFile.delete();
      } catch {
        // Ignore cleanup errors
      }
      this.tempPlaybackFile = null;
    }
  }

  // ============================================================================
  // Interrupt (for barge-in)
  // ============================================================================

  async interrupt(): Promise<void> {
    // Stop playback immediately
    await this.stopPlayback();

    // Clear any queued audio
    this.audioQueue = [];
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  async cleanup(): Promise<void> {
    await this.stopRecording();
    await this.stopPlayback();
  }

  // ============================================================================
  // State Getters
  // ============================================================================

  getState(): AudioManagerState {
    return { ...this.state };
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private createWavHeader(dataLength: number): string {
    // Create a simple WAV header for 24kHz, 16-bit, mono PCM
    const sampleRate = DEFAULT_AUDIO_CONFIG.sampleRate;
    const numChannels = DEFAULT_AUDIO_CONFIG.channels;
    const bitsPerSample = DEFAULT_AUDIO_CONFIG.bitsPerSample;

    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const chunkSize = 36 + dataLength;

    // Create header buffer (44 bytes)
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // "RIFF" chunk descriptor
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, chunkSize, true);
    this.writeString(view, 8, "WAVE");

    // "fmt " sub-chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, 1, true); // AudioFormat: PCM = 1
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    // Convert to base64
    const uint8Array = new Uint8Array(header);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAudioManager(
  options?: AudioManagerOptions
): AudioManager {
  return new AudioManager(options);
}
