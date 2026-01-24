package expo.modules.chimesdk

import com.amazonaws.services.chime.sdk.meetings.audiovideo.AudioVideoObserver
import com.amazonaws.services.chime.sdk.meetings.audiovideo.video.VideoTileObserver
import com.amazonaws.services.chime.sdk.meetings.audiovideo.video.VideoTileState
import com.amazonaws.services.chime.sdk.meetings.realtime.RealtimeObserver
import com.amazonaws.services.chime.sdk.meetings.session.MeetingSessionStatus
import com.amazonaws.services.chime.sdk.meetings.session.MeetingSessionStatusCode
import com.amazonaws.services.chime.sdk.meetings.audiovideo.AttendeeInfo
import com.amazonaws.services.chime.sdk.meetings.audiovideo.SignalUpdate
import com.amazonaws.services.chime.sdk.meetings.audiovideo.VolumeUpdate
import com.amazonaws.services.chime.sdk.meetings.audiovideo.video.VideoPauseState
import com.amazonaws.services.chime.sdk.meetings.audiovideo.audio.activespeakerdetector.ActiveSpeakerObserver
import com.amazonaws.services.chime.sdk.meetings.audiovideo.audio.activespeakerpolicy.DefaultActiveSpeakerPolicy

/**
 * Observer for audio/video session events
 */
class ChimeMeetingObserver(private val module: ChimeSdkModule) : AudioVideoObserver, RealtimeObserver {

    // AudioVideoObserver

    override fun onAudioSessionStartedConnecting(reconnecting: Boolean) {
        if (!reconnecting) {
            module.sendEvent(mapOf(
                "type" to "meetingStarted"
            ))
        }
    }

    override fun onAudioSessionStarted(reconnecting: Boolean) {
        // Session connected
    }

    override fun onAudioSessionDropped() {
        // Audio session dropped - will attempt to reconnect
    }

    override fun onAudioSessionStopped(sessionStatus: MeetingSessionStatus) {
        when (sessionStatus.statusCode) {
            MeetingSessionStatusCode.OK -> {
                module.sendEvent(mapOf(
                    "type" to "meetingEnded"
                ))
            }
            else -> {
                module.sendEvent(mapOf(
                    "type" to "meetingFailed",
                    "error" to sessionStatus.statusCode.name
                ))
            }
        }
    }

    override fun onAudioSessionCancelledReconnect() {
        module.sendEvent(mapOf(
            "type" to "meetingFailed",
            "error" to "Reconnection cancelled"
        ))
    }

    override fun onConnectionRecovered() {
        // Connection recovered after temporary loss
    }

    override fun onConnectionBecamePoor() {
        // Connection quality degraded
    }

    override fun onVideoSessionStartedConnecting() {
        // Video session connecting
    }

    override fun onVideoSessionStarted(sessionStatus: MeetingSessionStatus) {
        // Video session started
    }

    override fun onVideoSessionStopped(sessionStatus: MeetingSessionStatus) {
        // Video session stopped
    }

    // RealtimeObserver

    override fun onVolumeChanged(volumeUpdates: Array<VolumeUpdate>) {
        // Volume updates - can be used for audio level indicators
    }

    override fun onSignalStrengthChanged(signalUpdates: Array<SignalUpdate>) {
        // Signal strength updates
    }

    override fun onAttendeesJoined(attendeeInfo: Array<AttendeeInfo>) {
        for (info in attendeeInfo) {
            module.sendEvent(mapOf(
                "type" to "attendeeJoined",
                "attendeeId" to info.attendeeId,
                "externalUserId" to info.externalUserId
            ))
        }
    }

    override fun onAttendeesLeft(attendeeInfo: Array<AttendeeInfo>) {
        for (info in attendeeInfo) {
            module.sendEvent(mapOf(
                "type" to "attendeeLeft",
                "attendeeId" to info.attendeeId
            ))
        }
    }

    override fun onAttendeesDropped(attendeeInfo: Array<AttendeeInfo>) {
        for (info in attendeeInfo) {
            module.sendEvent(mapOf(
                "type" to "attendeeLeft",
                "attendeeId" to info.attendeeId
            ))
        }
    }

    override fun onAttendeesMuted(attendeeInfo: Array<AttendeeInfo>) {
        for (info in attendeeInfo) {
            module.sendEvent(mapOf(
                "type" to "attendeeMuteChanged",
                "attendeeId" to info.attendeeId,
                "isMuted" to true
            ))
        }
    }

    override fun onAttendeesUnmuted(attendeeInfo: Array<AttendeeInfo>) {
        for (info in attendeeInfo) {
            module.sendEvent(mapOf(
                "type" to "attendeeMuteChanged",
                "attendeeId" to info.attendeeId,
                "isMuted" to false
            ))
        }
    }
}

/**
 * Observer for video tile events
 */
class ChimeVideoTileObserver(private val module: ChimeSdkModule) : VideoTileObserver {
    val videoTiles = mutableListOf<VideoTileState>()

    override fun onVideoTileAdded(tileState: VideoTileState) {
        videoTiles.add(tileState)

        module.sendEvent(mapOf(
            "type" to "videoTileAdded",
            "tileState" to mapOf(
                "tileId" to tileState.tileId,
                "attendeeId" to (tileState.attendeeId ?: ""),
                "isLocalTile" to tileState.isLocalTile,
                "isContent" to tileState.isContent,
                "pauseState" to tileState.pauseState.ordinal,
                "videoStreamContentWidth" to tileState.videoStreamContentWidth,
                "videoStreamContentHeight" to tileState.videoStreamContentHeight
            )
        ))
    }

    override fun onVideoTileRemoved(tileState: VideoTileState) {
        videoTiles.removeAll { it.tileId == tileState.tileId }

        module.sendEvent(mapOf(
            "type" to "videoTileRemoved",
            "tileId" to tileState.tileId
        ))
    }

    override fun onVideoTilePaused(tileState: VideoTileState) {
        val index = videoTiles.indexOfFirst { it.tileId == tileState.tileId }
        if (index >= 0) {
            videoTiles[index] = tileState
        }

        module.sendEvent(mapOf(
            "type" to "videoTilePaused",
            "tileId" to tileState.tileId
        ))
    }

    override fun onVideoTileResumed(tileState: VideoTileState) {
        val index = videoTiles.indexOfFirst { it.tileId == tileState.tileId }
        if (index >= 0) {
            videoTiles[index] = tileState
        }

        module.sendEvent(mapOf(
            "type" to "videoTileResumed",
            "tileId" to tileState.tileId
        ))
    }

    override fun onVideoTileSizeChanged(tileState: VideoTileState) {
        val index = videoTiles.indexOfFirst { it.tileId == tileState.tileId }
        if (index >= 0) {
            videoTiles[index] = tileState
        }
    }
}

/**
 * Observer for active speaker detection
 */
class ChimeActiveSpeakerObserver(private val module: ChimeSdkModule) : ActiveSpeakerObserver {

    override val observerId: String = "ChimeActiveSpeakerObserver"

    override fun onActiveSpeakerDetected(attendeeInfo: Array<AttendeeInfo>) {
        val attendeeIds = attendeeInfo.map { it.attendeeId }
        module.sendEvent(mapOf(
            "type" to "activeSpeakerChanged",
            "attendeeIds" to attendeeIds
        ))
    }

    override fun onActiveSpeakerScoreChanged(scores: Map<AttendeeInfo, Double>) {
        // Score updates for speaker detection
    }
}
