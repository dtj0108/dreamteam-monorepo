# Mobile Chime SDK Implementation Guide

## Overview

This guide covers implementing Amazon Chime SDK video calling in a React Native/Expo mobile app. Since Chime has **no official React Native package**, we'll create an Expo Module that bridges to the native iOS (Swift) and Android (Kotlin) SDKs.

**Key Insight**: Your existing backend API routes (`/api/meetings/*`) are fully reusable - mobile calls the same endpoints.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App (Expo)                   │
├─────────────────────────────────────────────────────────────┤
│  MeetingProvider (same interface as web)                    │
│  └── Hooks: useMeeting, useMeetingControls, useMeetingRoster│
├─────────────────────────────────────────────────────────────┤
│  ChimeModule (Expo Module)                                  │
│  └── Exposes native SDK methods as JS functions             │
│  └── Converts SDK callbacks to React Native events          │
├─────────────────────────────────────────────────────────────┤
│  iOS (Swift)              │  Android (Kotlin)               │
│  AmazonChimeSDK ~0.23     │  amazon-chime-sdk 0.25.0        │
│  via CocoaPods            │  via Maven                      │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Existing Next.js Backend (unchanged)              │
│  POST /api/meetings       - Create meeting                  │
│  POST /api/meetings/[id]/join  - Join & get attendee token  │
│  POST /api/meetings/[id]/leave - Leave meeting              │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. Expo Module Structure

```
modules/
└── chime-sdk/
    ├── src/index.ts                     # TypeScript exports & types
    ├── expo-module.config.json          # Module configuration
    ├── ios/
    │   ├── ChimeSdkModule.swift         # iOS implementation
    │   ├── MeetingObserver.swift        # SDK callback handlers
    │   └── ChimeVideoView.swift         # Native video view
    └── android/
        └── src/main/java/expo/modules/chimesdk/
            ├── ChimeSdkModule.kt        # Android implementation
            ├── MeetingObserver.kt       # SDK callback handlers
            └── ChimeVideoView.kt        # Native video view
```

### 2. React Native Components

| File | Purpose |
|------|---------|
| `src/providers/meeting-provider.tsx` | State management (mirror web interface) |
| `src/components/meetings/video-tile.tsx` | Individual participant video |
| `src/components/meetings/video-grid.tsx` | Responsive grid layout |
| `src/components/meetings/meeting-controls.tsx` | Bottom control bar |
| `src/components/meetings/meeting-room.tsx` | Main meeting screen |
| `src/hooks/use-meeting-controls.ts` | Media control hook |
| `src/hooks/use-meeting-roster.ts` | Participant list hook |
| `src/lib/permissions.ts` | Camera/mic permission handling |

---

## Native SDK Setup

### iOS (CocoaPods)

**Podfile** (auto-configured by Expo Module):
```ruby
pod 'AmazonChimeSDK', '~> 0.23'
pod 'AmazonChimeSDKMedia', '~> 0.23'
```

**Info.plist** (via config plugin):
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for video calls</string>
```

**Minimum iOS**: 12.0

### Android (Gradle)

**build.gradle**:
```kotlin
dependencies {
    implementation("software.aws.chimesdk:amazon-chime-sdk:0.25.0")
    implementation("software.aws.chimesdk:amazon-chime-sdk-media:0.24.0")
}
```

**AndroidManifest.xml**:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.BLUETOOTH" />
```

**Minimum Android SDK**: 21 (Android 5.0)

**Important**: Android Chime SDK does NOT support x86 emulators. Use ARM devices/emulators.

---

## JavaScript API (Expo Module)

```typescript
// modules/chime-sdk/src/index.ts

interface ChimeSdkModule {
  // Meeting lifecycle
  startMeeting(meeting: ChimeMeetingConfig, attendee: ChimeAttendeeConfig): Promise<void>;
  stopMeeting(): Promise<void>;

  // Audio controls
  muteLocalAudio(): Promise<void>;
  unmuteLocalAudio(): Promise<void>;

  // Video controls
  startLocalVideo(): Promise<void>;
  stopLocalVideo(): Promise<void>;
  switchCamera(): Promise<void>;  // Mobile-specific

  // Device management
  listAudioDevices(): Promise<AudioDevice[]>;
  chooseAudioDevice(deviceId: string): Promise<void>;
}

// Events emitted from native SDK
type ChimeEvent =
  | { type: 'meetingStarted' }
  | { type: 'meetingEnded'; reason: string }
  | { type: 'attendeeJoined'; attendeeId: string; externalUserId: string }
  | { type: 'attendeeLeft'; attendeeId: string }
  | { type: 'audioMuteChanged'; attendeeId: string; muted: boolean }
  | { type: 'videoTileAdded'; tileId: number; attendeeId: string; isLocal: boolean }
  | { type: 'videoTileRemoved'; tileId: number }
  | { type: 'activeSpeakerChanged'; attendeeIds: string[] };
```

---

## Key Differences from Web

| Aspect | Web | React Native |
|--------|-----|--------------|
| SDK | `amazon-chime-sdk-js` | Native iOS/Android SDKs |
| Video Elements | HTML `<video>` | Native `ChimeVideoView` |
| Audio Output | Hidden `<audio>` | Native audio routing |
| Screen Sharing | `getDisplayMedia()` | **Not supported on mobile** |
| Camera Switch | Not needed | `switchCamera()` for front/back |

### Mobile-Only Features to Add
- Camera switch (front/back)
- Audio route selection (earpiece/speaker/Bluetooth)
- Background audio handling
- Proximity sensor support

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create Expo development build project
- [ ] Scaffold Expo Module structure
- [ ] Implement iOS native module (startMeeting, stopMeeting, audio controls)
- [ ] Implement Android native module (same)
- [ ] Test joining meeting with audio only

### Phase 2: Video (Week 2-3)
- [ ] Implement native video view (iOS ChimeVideoView)
- [ ] Implement native video view (Android ChimeVideoView)
- [ ] Create React Native VideoTile component
- [ ] Create VideoGrid responsive layout
- [ ] Test video with multiple participants

### Phase 3: Controls & State (Week 3-4)
- [ ] Implement MeetingProvider with full state
- [ ] Create MeetingControls component
- [ ] Add camera switch functionality
- [ ] Handle permissions properly (iOS + Android)
- [ ] Create MeetingRoom screen

### Phase 4: Integration (Week 4-5)
- [ ] Connect to existing auth system
- [ ] Call existing backend APIs
- [ ] Handle network disconnection
- [ ] Handle app backgrounding/foregrounding
- [ ] Handle incoming phone calls

### Phase 5: Testing (Week 5-6)
- [ ] Unit tests for provider/hooks
- [ ] Integration tests with mocked native module
- [ ] Manual testing on physical devices
- [ ] Cross-platform testing (iOS + Android)
- [ ] Test with web participants in same meeting

---

## Reference Files (Existing Codebase)

| File | Use For |
|------|---------|
| `src/providers/meeting-provider.tsx` | Provider interface to mirror |
| `src/lib/chime.ts` | Backend Chime utilities |
| `src/app/api/meetings/[id]/join/route.ts` | API contract for joining |
| `src/components/meetings/video-tile.tsx` | UI pattern reference |
| `src/hooks/use-video-tile.ts` | Hook pattern reference |

---

## Verification Checklist

1. **Join from mobile**: While web participant is in call, join from mobile app
2. **Audio**: Verify mute/unmute works, audio is clear
3. **Video**: Verify local/remote video displays correctly
4. **Camera switch**: Toggle front/back camera
5. **Participants**: Roster updates in real-time on join/leave
6. **Leave meeting**: Clean exit, proper cleanup
7. **Network recovery**: Handle WiFi→cellular transitions
8. **Background**: Audio continues when app backgrounded

---

## Alternative: Consider Daily.co or Twilio

If native module development is too complex, both **Daily.co** and **Twilio Video** have official React Native SDKs with Expo support:

- [Daily.co RN SDK](https://www.npmjs.com/package/@daily-co/react-native-daily-js) - Excellent Expo docs
- [Twilio Video RN SDK](https://www.npmjs.com/package/@twilio/video-react-native-sdk) - Already have `@twilio/voice-sdk` in project

Trade-off: Would require migrating backend from Chime to a different provider.

---

## Resources

- [AWS React Native Demo (reference implementation)](https://github.com/aws-samples/amazon-chime-react-native-demo)
- [Amazon Chime SDK iOS](https://github.com/aws/amazon-chime-sdk-ios)
- [Amazon Chime SDK Android](https://github.com/aws/amazon-chime-sdk-android)
- [Expo Modules API](https://docs.expo.dev/modules/overview/)
- [Expo Native Module Tutorial](https://docs.expo.dev/modules/native-module-tutorial/)
