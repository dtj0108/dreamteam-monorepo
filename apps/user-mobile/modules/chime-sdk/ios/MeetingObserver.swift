import AmazonChimeSDK

/// Observer for audio/video session events
class ChimeMeetingObserver: AudioVideoObserver, RealtimeObserver {
    private weak var module: ChimeSdkModule?

    init(module: ChimeSdkModule) {
        self.module = module
    }

    // MARK: - AudioVideoObserver

    func audioSessionDidStartConnecting(reconnecting: Bool) {
        if !reconnecting {
            module?.sendEvent([
                "type": "meetingStarted"
            ])
        }
    }

    func audioSessionDidStart(reconnecting: Bool) {
        // Session connected
    }

    func audioSessionDidDrop() {
        // Audio session dropped - will attempt to reconnect
    }

    func audioSessionDidStopWithStatus(sessionStatus: MeetingSessionStatus) {
        let statusCode = sessionStatus.statusCode

        switch statusCode {
        case .ok:
            module?.sendEvent([
                "type": "meetingEnded"
            ])
        default:
            module?.sendEvent([
                "type": "meetingFailed",
                "error": statusCode.description
            ])
        }
    }

    func audioSessionDidCancelReconnect() {
        module?.sendEvent([
            "type": "meetingFailed",
            "error": "Reconnection cancelled"
        ])
    }

    func connectionDidRecover() {
        // Connection recovered after temporary loss
    }

    func connectionDidBecomePoor() {
        // Connection quality degraded
    }

    func remoteVideoSourcesDidBecomeAvailable(sources: [RemoteVideoSource]) {
        // Remote video sources available
    }

    func remoteVideoSourcesDidBecomeUnavailable(sources: [RemoteVideoSource]) {
        // Remote video sources unavailable
    }

    func cameraSendAvailabilityDidChange(available: Bool) {
        // Camera send availability changed
    }

    func videoSessionDidStartConnecting() {
        // Video session connecting
    }

    func videoSessionDidStartWithStatus(sessionStatus: MeetingSessionStatus) {
        // Video session started
    }

    func videoSessionDidStopWithStatus(sessionStatus: MeetingSessionStatus) {
        // Video session stopped
    }

    // MARK: - RealtimeObserver

    func volumeDidChange(volumeUpdates: [VolumeUpdate]) {
        // Volume updates - can be used for audio level indicators
    }

    func signalStrengthDidChange(signalUpdates: [SignalUpdate]) {
        // Signal strength updates
    }

    func attendeesDidJoin(attendeeInfo: [AttendeeInfo]) {
        for info in attendeeInfo {
            module?.sendEvent([
                "type": "attendeeJoined",
                "attendeeId": info.attendeeId,
                "externalUserId": info.externalUserId
            ])
        }
    }

    func attendeesDidLeave(attendeeInfo: [AttendeeInfo]) {
        for info in attendeeInfo {
            module?.sendEvent([
                "type": "attendeeLeft",
                "attendeeId": info.attendeeId
            ])
        }
    }

    func attendeesDidDrop(attendeeInfo: [AttendeeInfo]) {
        for info in attendeeInfo {
            module?.sendEvent([
                "type": "attendeeLeft",
                "attendeeId": info.attendeeId
            ])
        }
    }

    func attendeesDidMute(attendeeInfo: [AttendeeInfo]) {
        for info in attendeeInfo {
            module?.sendEvent([
                "type": "attendeeMuteChanged",
                "attendeeId": info.attendeeId,
                "isMuted": true
            ])
        }
    }

    func attendeesDidUnmute(attendeeInfo: [AttendeeInfo]) {
        for info in attendeeInfo {
            module?.sendEvent([
                "type": "attendeeMuteChanged",
                "attendeeId": info.attendeeId,
                "isMuted": false
            ])
        }
    }
}

/// Observer for video tile events
class ChimeVideoTileObserver: VideoTileObserver {
    private weak var module: ChimeSdkModule?
    var videoTiles: [VideoTileState] = []

    init(module: ChimeSdkModule) {
        self.module = module
    }

    func videoTileDidAdd(tileState: VideoTileState) {
        videoTiles.append(tileState)

        module?.sendEvent([
            "type": "videoTileAdded",
            "tileState": [
                "tileId": tileState.tileId,
                "attendeeId": tileState.attendeeId ?? "",
                "isLocalTile": tileState.isLocalTile,
                "isContent": tileState.isContent,
                "pauseState": tileState.pauseState.rawValue,
                "videoStreamContentWidth": tileState.videoStreamContentWidth,
                "videoStreamContentHeight": tileState.videoStreamContentHeight
            ]
        ])
    }

    func videoTileDidRemove(tileState: VideoTileState) {
        videoTiles.removeAll { $0.tileId == tileState.tileId }

        module?.sendEvent([
            "type": "videoTileRemoved",
            "tileId": tileState.tileId
        ])
    }

    func videoTileDidPause(tileState: VideoTileState) {
        if let index = videoTiles.firstIndex(where: { $0.tileId == tileState.tileId }) {
            videoTiles[index] = tileState
        }

        module?.sendEvent([
            "type": "videoTilePaused",
            "tileId": tileState.tileId
        ])
    }

    func videoTileDidResume(tileState: VideoTileState) {
        if let index = videoTiles.firstIndex(where: { $0.tileId == tileState.tileId }) {
            videoTiles[index] = tileState
        }

        module?.sendEvent([
            "type": "videoTileResumed",
            "tileId": tileState.tileId
        ])
    }

    func videoTileSizeDidChange(tileState: VideoTileState) {
        if let index = videoTiles.firstIndex(where: { $0.tileId == tileState.tileId }) {
            videoTiles[index] = tileState
        }
    }
}

/// Observer for active speaker detection
class ChimeActiveSpeakerObserver: ActiveSpeakerObserver {
    private weak var module: ChimeSdkModule?

    var observerId: String {
        return "ChimeActiveSpeakerObserver"
    }

    init(module: ChimeSdkModule) {
        self.module = module
    }

    func activeSpeakerDidDetect(attendeeInfo: [AttendeeInfo]) {
        let attendeeIds = attendeeInfo.map { $0.attendeeId }
        module?.sendEvent([
            "type": "activeSpeakerChanged",
            "attendeeIds": attendeeIds
        ])
    }

    func activeSpeakerScoreDidChange(scores: [AttendeeInfo: Double]) {
        // Score updates for speaker detection
    }
}
