import ExpoModulesCore
import AmazonChimeSDK
import UIKit

/// Native video view for rendering Chime video tiles
class ChimeVideoView: ExpoView {
    let videoRenderView: DefaultVideoRenderView

    required init(appContext: AppContext? = nil) {
        videoRenderView = DefaultVideoRenderView()
        super.init(appContext: appContext)

        videoRenderView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(videoRenderView)

        NSLayoutConstraint.activate([
            videoRenderView.topAnchor.constraint(equalTo: topAnchor),
            videoRenderView.bottomAnchor.constraint(equalTo: bottomAnchor),
            videoRenderView.leadingAnchor.constraint(equalTo: leadingAnchor),
            videoRenderView.trailingAnchor.constraint(equalTo: trailingAnchor)
        ])

        // Default black background
        backgroundColor = .black
        videoRenderView.backgroundColor = .black
    }

    func setScalingType(_ scalingType: String) {
        switch scalingType {
        case "aspectFill":
            videoRenderView.contentMode = .scaleAspectFill
        default:
            videoRenderView.contentMode = .scaleAspectFit
        }
    }

    func setMirror(_ mirror: Bool) {
        if mirror {
            videoRenderView.transform = CGAffineTransform(scaleX: -1, y: 1)
        } else {
            videoRenderView.transform = .identity
        }
    }
}
