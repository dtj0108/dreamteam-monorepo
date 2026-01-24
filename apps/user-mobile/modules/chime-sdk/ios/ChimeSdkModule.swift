import ExpoModulesCore
import AmazonChimeSDK

public class ChimeSdkModule: Module {
    // Current meeting session
    private var meetingSession: DefaultMeetingSession?
    private var meetingObserver: ChimeMeetingObserver?
    private var videoTileObserver: ChimeVideoTileObserver?
    private var activeSpeakerObserver: ChimeActiveSpeakerObserver?

    // Track video tiles
    private var videoTileViews: [Int: ChimeVideoView] = [:]

    // Track if using front camera
    private var isUsingFrontCamera = true

    // Track local audio mute state
    private var isLocalAudioMuted = false

    public func definition() -> ModuleDefinition {
        Name("ChimeSdk")

        // Events that can be sent to JavaScript
        Events("onMeetingEvent")

        // Start a meeting session
        AsyncFunction("startMeeting") { (meeting: [String: Any], attendee: [String: Any], promise: Promise) in
            self.startMeetingSession(meeting: meeting, attendee: attendee, promise: promise)
        }

        // Stop the meeting session
        AsyncFunction("stopMeeting") { (promise: Promise) in
            self.stopMeetingSession(promise: promise)
        }

        // Mute local audio
        AsyncFunction("muteLocalAudio") { (promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            let result = audioVideo.realtimeLocalMute()
            if result {
                self.isLocalAudioMuted = true
                promise.resolve(nil)
            } else {
                promise.reject("MUTE_FAILED", "Failed to mute local audio")
            }
        }

        // Unmute local audio
        AsyncFunction("unmuteLocalAudio") { (promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            let result = audioVideo.realtimeLocalUnmute()
            if result {
                self.isLocalAudioMuted = false
                promise.resolve(nil)
            } else {
                promise.reject("UNMUTE_FAILED", "Failed to unmute local audio")
            }
        }

        // Check if local audio is muted
        AsyncFunction("isLocalAudioMuted") { (promise: Promise) in
            guard self.meetingSession?.audioVideo != nil else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            promise.resolve(self.isLocalAudioMuted)
        }

        // Start local video
        AsyncFunction("startLocalVideo") { (promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            do {
                try audioVideo.startLocalVideo()
                promise.resolve(nil)
            } catch {
                promise.reject("VIDEO_START_FAILED", error.localizedDescription)
            }
        }

        // Stop local video
        AsyncFunction("stopLocalVideo") { (promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            audioVideo.stopLocalVideo()
            promise.resolve(nil)
        }

        // Switch camera
        AsyncFunction("switchCamera") { (promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            audioVideo.switchCamera()
            self.isUsingFrontCamera = !self.isUsingFrontCamera
            promise.resolve(nil)
        }

        // Bind video view to tile
        AsyncFunction("bindVideoView") { (viewTag: Int, tileId: Int, promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }

            DispatchQueue.main.async {
                guard let view = self.videoTileViews[viewTag] else {
                    promise.reject("VIEW_NOT_FOUND", "Video view not found")
                    return
                }

                audioVideo.bindVideoView(videoView: view.videoRenderView, tileId: tileId)
                promise.resolve(nil)
            }
        }

        // Unbind video view
        AsyncFunction("unbindVideoView") { (tileId: Int, promise: Promise) in
            guard let audioVideo = self.meetingSession?.audioVideo else {
                promise.reject("NO_MEETING", "No active meeting session")
                return
            }
            audioVideo.unbindVideoView(tileId: tileId)
            promise.resolve(nil)
        }

        // Get all video tiles
        AsyncFunction("getVideoTiles") { (promise: Promise) in
            guard let videoTileObserver = self.videoTileObserver else {
                promise.resolve([])
                return
            }

            let tiles = videoTileObserver.videoTiles.map { tileState -> [String: Any] in
                return [
                    "tileId": tileState.tileId,
                    "attendeeId": tileState.attendeeId ?? "",
                    "isLocalTile": tileState.isLocalTile,
                    "isContent": tileState.isContent,
                    "pauseState": tileState.pauseState.rawValue,
                    "videoStreamContentWidth": tileState.videoStreamContentWidth,
                    "videoStreamContentHeight": tileState.videoStreamContentHeight
                ]
            }
            promise.resolve(tiles)
        }

        // Native video view
        View(ChimeVideoView.self) {
            Prop("scalingType") { (view: ChimeVideoView, scalingType: String?) in
                view.setScalingType(scalingType ?? "aspectFit")
            }

            Prop("mirror") { (view: ChimeVideoView, mirror: Bool?) in
                view.setMirror(mirror ?? false)
            }

            Events("onVideoTileBound")

            OnViewDidUpdateProps { view in
                // Store reference for binding
                let viewTag = view.reactTag?.intValue ?? 0
                if viewTag > 0 {
                    self.videoTileViews[viewTag] = view
                }
            }
        }
    }

    // MARK: - Private Methods

    private func startMeetingSession(meeting: [String: Any], attendee: [String: Any], promise: Promise) {
        // Parse meeting configuration
        guard let meetingId = meeting["meetingId"] as? String,
              let mediaPlacement = meeting["mediaPlacement"] as? [String: Any],
              let audioHostUrl = mediaPlacement["audioHostUrl"] as? String,
              let audioFallbackUrl = mediaPlacement["audioFallbackUrl"] as? String,
              let signalingUrl = mediaPlacement["signalingUrl"] as? String,
              let turnControlUrl = mediaPlacement["turnControlUrl"] as? String,
              let mediaRegion = meeting["mediaRegion"] as? String else {
            promise.reject("INVALID_CONFIG", "Invalid meeting configuration")
            return
        }

        // Parse attendee configuration
        guard let attendeeId = attendee["attendeeId"] as? String,
              let externalUserId = attendee["externalUserId"] as? String,
              let joinToken = attendee["joinToken"] as? String else {
            promise.reject("INVALID_CONFIG", "Invalid attendee configuration")
            return
        }

        // Create meeting session configuration
        let meetingResponse = CreateMeetingResponse(
            meeting: Meeting(
                externalMeetingId: meeting["externalMeetingId"] as? String,
                mediaPlacement: MediaPlacement(
                    audioFallbackUrl: audioFallbackUrl,
                    audioHostUrl: audioHostUrl,
                    signalingUrl: signalingUrl,
                    turnControlUrl: turnControlUrl,
                    eventIngestionUrl: mediaPlacement["eventIngestionUrl"] as? String
                ),
                mediaRegion: mediaRegion,
                meetingId: meetingId
            )
        )

        let attendeeResponse = CreateAttendeeResponse(
            attendee: Attendee(
                attendeeId: attendeeId,
                externalUserId: externalUserId,
                joinToken: joinToken
            )
        )

        let configuration = MeetingSessionConfiguration(
            createMeetingResponse: meetingResponse,
            createAttendeeResponse: attendeeResponse
        )

        // Create meeting session
        let logger = ConsoleLogger(name: "ChimeSdk", level: .INFO)
        meetingSession = DefaultMeetingSession(configuration: configuration, logger: logger)

        guard let session = meetingSession else {
            promise.reject("SESSION_CREATE_FAILED", "Failed to create meeting session")
            return
        }

        // Create and add observers
        meetingObserver = ChimeMeetingObserver(module: self)
        videoTileObserver = ChimeVideoTileObserver(module: self)
        activeSpeakerObserver = ChimeActiveSpeakerObserver(module: self)

        session.audioVideo.addAudioVideoObserver(observer: meetingObserver!)
        session.audioVideo.addRealtimeObserver(observer: meetingObserver!)
        session.audioVideo.addVideoTileObserver(observer: videoTileObserver!)
        session.audioVideo.addActiveSpeakerObserver(policy: DefaultActiveSpeakerPolicy(), observer: activeSpeakerObserver!)

        // Start audio video
        do {
            try session.audioVideo.start()
            promise.resolve(nil)
        } catch {
            promise.reject("START_FAILED", error.localizedDescription)
        }
    }

    private func stopMeetingSession(promise: Promise) {
        guard let session = meetingSession else {
            promise.resolve(nil)
            return
        }

        // Remove observers
        if let observer = meetingObserver {
            session.audioVideo.removeAudioVideoObserver(observer: observer)
            session.audioVideo.removeRealtimeObserver(observer: observer)
        }
        if let observer = videoTileObserver {
            session.audioVideo.removeVideoTileObserver(observer: observer)
        }
        if let observer = activeSpeakerObserver {
            session.audioVideo.removeActiveSpeakerObserver(observer: observer)
        }

        // Stop session
        session.audioVideo.stop()

        // Clean up
        meetingSession = nil
        meetingObserver = nil
        videoTileObserver = nil
        activeSpeakerObserver = nil
        videoTileViews.removeAll()
        isLocalAudioMuted = false

        promise.resolve(nil)
    }

    // MARK: - Event Emission

    func sendEvent(_ event: [String: Any]) {
        sendEvent("onMeetingEvent", event)
    }
}
