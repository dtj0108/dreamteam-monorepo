package expo.modules.chimesdk

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.amazonaws.services.chime.sdk.meetings.session.*
import com.amazonaws.services.chime.sdk.meetings.audiovideo.AudioVideoFacade
import com.amazonaws.services.chime.sdk.meetings.utils.logger.ConsoleLogger
import com.amazonaws.services.chime.sdk.meetings.utils.logger.LogLevel

class ChimeSdkModule : Module() {
    // Current meeting session
    private var meetingSession: DefaultMeetingSession? = null
    private var meetingObserver: ChimeMeetingObserver? = null
    private var videoTileObserver: ChimeVideoTileObserver? = null
    private var activeSpeakerObserver: ChimeActiveSpeakerObserver? = null

    // Track video tiles views
    private val videoTileViews = mutableMapOf<Int, ChimeVideoView>()

    // Track camera state
    private var isUsingFrontCamera = true

    private val logger = ConsoleLogger(LogLevel.INFO)

    override fun definition() = ModuleDefinition {
        Name("ChimeSdk")

        // Events that can be sent to JavaScript
        Events("onMeetingEvent")

        // Start a meeting session
        AsyncFunction("startMeeting") { meeting: Map<String, Any?>, attendee: Map<String, Any?>, promise: Promise ->
            startMeetingSession(meeting, attendee, promise)
        }

        // Stop the meeting session
        AsyncFunction("stopMeeting") { promise: Promise ->
            stopMeetingSession(promise)
        }

        // Mute local audio
        AsyncFunction("muteLocalAudio") { promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            val result = audioVideo.realtimeLocalMute()
            if (result) {
                promise.resolve(null)
            } else {
                promise.reject("MUTE_FAILED", "Failed to mute local audio", null)
            }
        }

        // Unmute local audio
        AsyncFunction("unmuteLocalAudio") { promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            val result = audioVideo.realtimeLocalUnmute()
            if (result) {
                promise.resolve(null)
            } else {
                promise.reject("UNMUTE_FAILED", "Failed to unmute local audio", null)
            }
        }

        // Check if local audio is muted
        AsyncFunction("isLocalAudioMuted") { promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            promise.resolve(audioVideo.realtimeIsLocalMuted)
        }

        // Start local video
        AsyncFunction("startLocalVideo") { promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            try {
                audioVideo.startLocalVideo()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("VIDEO_START_FAILED", e.message, null)
            }
        }

        // Stop local video
        AsyncFunction("stopLocalVideo") { promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            audioVideo.stopLocalVideo()
            promise.resolve(null)
        }

        // Switch camera
        AsyncFunction("switchCamera") { promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            audioVideo.switchCamera()
            isUsingFrontCamera = !isUsingFrontCamera
            promise.resolve(null)
        }

        // Bind video view to tile
        AsyncFunction("bindVideoView") { viewTag: Int, tileId: Int, promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }

            val view = videoTileViews[viewTag]
            if (view == null) {
                promise.reject("VIEW_NOT_FOUND", "Video view not found", null)
                return@AsyncFunction
            }

            audioVideo.bindVideoView(view.videoRenderView, tileId)
            promise.resolve(null)
        }

        // Unbind video view
        AsyncFunction("unbindVideoView") { tileId: Int, promise: Promise ->
            val audioVideo = meetingSession?.audioVideo
            if (audioVideo == null) {
                promise.reject("NO_MEETING", "No active meeting session", null)
                return@AsyncFunction
            }
            audioVideo.unbindVideoView(tileId)
            promise.resolve(null)
        }

        // Get all video tiles
        AsyncFunction("getVideoTiles") { promise: Promise ->
            val observer = videoTileObserver
            if (observer == null) {
                promise.resolve(emptyList<Map<String, Any>>())
                return@AsyncFunction
            }

            val tiles = observer.videoTiles.map { tileState ->
                mapOf(
                    "tileId" to tileState.tileId,
                    "attendeeId" to (tileState.attendeeId ?: ""),
                    "isLocalTile" to tileState.isLocalTile,
                    "isContent" to tileState.isContent,
                    "pauseState" to tileState.pauseState.ordinal,
                    "videoStreamContentWidth" to tileState.videoStreamContentWidth,
                    "videoStreamContentHeight" to tileState.videoStreamContentHeight
                )
            }
            promise.resolve(tiles)
        }

        // Native video view
        View(ChimeVideoView::class) {
            Prop("scalingType") { view: ChimeVideoView, scalingType: String? ->
                view.setScalingType(scalingType ?: "aspectFit")
            }

            Prop("mirror") { view: ChimeVideoView, mirror: Boolean? ->
                view.setMirror(mirror ?: false)
            }

            Events("onVideoTileBound")

            OnViewDidUpdateProps { view: ChimeVideoView ->
                // Store reference for binding
                val viewTag = view.id
                if (viewTag > 0) {
                    videoTileViews[viewTag] = view
                }
            }
        }
    }

    private fun startMeetingSession(meeting: Map<String, Any?>, attendee: Map<String, Any?>, promise: Promise) {
        try {
            // Parse meeting configuration
            val meetingId = meeting["meetingId"] as? String
            val mediaPlacement = meeting["mediaPlacement"] as? Map<String, Any?>
            val mediaRegion = meeting["mediaRegion"] as? String

            if (meetingId == null || mediaPlacement == null || mediaRegion == null) {
                promise.reject("INVALID_CONFIG", "Invalid meeting configuration", null)
                return
            }

            val audioHostUrl = mediaPlacement["audioHostUrl"] as? String
            val audioFallbackUrl = mediaPlacement["audioFallbackUrl"] as? String
            val signalingUrl = mediaPlacement["signalingUrl"] as? String
            val turnControlUrl = mediaPlacement["turnControlUrl"] as? String

            if (audioHostUrl == null || audioFallbackUrl == null || signalingUrl == null || turnControlUrl == null) {
                promise.reject("INVALID_CONFIG", "Invalid media placement configuration", null)
                return
            }

            // Parse attendee configuration
            val attendeeId = attendee["attendeeId"] as? String
            val externalUserId = attendee["externalUserId"] as? String
            val joinToken = attendee["joinToken"] as? String

            if (attendeeId == null || externalUserId == null || joinToken == null) {
                promise.reject("INVALID_CONFIG", "Invalid attendee configuration", null)
                return
            }

            // Create meeting response
            val meetingResponse = CreateMeetingResponse(
                Meeting(
                    meeting["externalMeetingId"] as? String,
                    MediaPlacement(
                        audioFallbackUrl,
                        audioHostUrl,
                        mediaPlacement["eventIngestionUrl"] as? String,
                        signalingUrl,
                        turnControlUrl
                    ),
                    mediaRegion,
                    meetingId
                )
            )

            val attendeeResponse = CreateAttendeeResponse(
                Attendee(attendeeId, externalUserId, joinToken)
            )

            val configuration = MeetingSessionConfiguration(
                meetingResponse,
                attendeeResponse
            )

            // Get context from app
            val context = appContext.reactContext ?: run {
                promise.reject("NO_CONTEXT", "No React context available", null)
                return
            }

            // Create meeting session
            meetingSession = DefaultMeetingSession(
                configuration,
                logger,
                context.applicationContext
            )

            val session = meetingSession
            if (session == null) {
                promise.reject("SESSION_CREATE_FAILED", "Failed to create meeting session", null)
                return
            }

            // Create and add observers
            meetingObserver = ChimeMeetingObserver(this)
            videoTileObserver = ChimeVideoTileObserver(this)
            activeSpeakerObserver = ChimeActiveSpeakerObserver(this)

            session.audioVideo.addAudioVideoObserver(meetingObserver!!)
            session.audioVideo.addRealtimeObserver(meetingObserver!!)
            session.audioVideo.addVideoTileObserver(videoTileObserver!!)
            session.audioVideo.addActiveSpeakerObserver(DefaultActiveSpeakerPolicy(), activeSpeakerObserver!!)

            // Start audio video
            session.audioVideo.start()
            promise.resolve(null)

        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message, null)
        }
    }

    private fun stopMeetingSession(promise: Promise) {
        val session = meetingSession
        if (session == null) {
            promise.resolve(null)
            return
        }

        // Remove observers
        meetingObserver?.let { session.audioVideo.removeAudioVideoObserver(it) }
        meetingObserver?.let { session.audioVideo.removeRealtimeObserver(it) }
        videoTileObserver?.let { session.audioVideo.removeVideoTileObserver(it) }
        activeSpeakerObserver?.let { session.audioVideo.removeActiveSpeakerObserver(it) }

        // Stop session
        session.audioVideo.stop()

        // Clean up
        meetingSession = null
        meetingObserver = null
        videoTileObserver = null
        activeSpeakerObserver = null
        videoTileViews.clear()

        promise.resolve(null)
    }

    // Send event to JavaScript
    fun sendEvent(event: Map<String, Any?>) {
        this@ChimeSdkModule.sendEvent("onMeetingEvent", event)
    }
}
