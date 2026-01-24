package expo.modules.chimesdk

import android.content.Context
import android.graphics.Color
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import com.amazonaws.services.chime.sdk.meetings.audiovideo.video.DefaultVideoRenderView
import com.amazonaws.services.chime.sdk.meetings.audiovideo.video.VideoScalingType

/**
 * Native video view for rendering Chime video tiles
 */
class ChimeVideoView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    val videoRenderView: DefaultVideoRenderView

    init {
        videoRenderView = DefaultVideoRenderView(context)
        videoRenderView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )

        addView(videoRenderView)

        // Default black background
        setBackgroundColor(Color.BLACK)
    }

    fun setScalingType(scalingType: String) {
        when (scalingType) {
            "aspectFill" -> videoRenderView.scalingType = VideoScalingType.AspectFill
            else -> videoRenderView.scalingType = VideoScalingType.AspectFit
        }
    }

    fun setMirror(mirror: Boolean) {
        videoRenderView.mirror = mirror
    }
}
