"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react"
import { useMeetingDevices } from "@/hooks/use-meeting-devices"
import { cn } from "@/lib/utils"

interface PreJoinScreenProps {
  meetingTitle?: string
  onJoin: () => void
  isJoining?: boolean
}

export function PreJoinScreen({
  meetingTitle,
  onJoin,
  isJoining = false,
}: PreJoinScreenProps) {
  const {
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
    localStream,
    isLoadingPreview,
    previewError,
    startPreview,
    stopPreview,
    hasAudioInput,
    hasVideoInput,
  } = useMeetingDevices()

  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Start preview on mount
  useEffect(() => {
    startPreview()
    return () => stopPreview()
  }, [startPreview, stopPreview])

  // Bind stream to video element
  useEffect(() => {
    if (videoRef.current && localStream && !isVideoOff) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream, isVideoOff])

  // Toggle local preview audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioMuted
      })
    }
    setIsAudioMuted(!isAudioMuted)
  }

  // Toggle local preview video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff
      })
    }
    setIsVideoOff(!isVideoOff)
    if (videoRef.current) {
      if (isVideoOff) {
        videoRef.current.srcObject = localStream
      } else {
        videoRef.current.srcObject = null
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">
            {meetingTitle || "Join Meeting"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isLoadingPreview ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">
                  {previewError}
                  <br />
                  <span className="text-xs">
                    Please allow camera/microphone access in your browser settings.
                  </span>
                </p>
              </div>
            ) : isVideoOff ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <VideoOff className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}

            {/* Preview controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant={isAudioMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleAudio}
              >
                {isAudioMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleVideo}
              >
                {isVideoOff ? (
                  <VideoOff className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Device selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Microphone selection */}
            <div className="space-y-2">
              <Label>Microphone</Label>
              <Select
                value={selectedAudioInput || ""}
                onValueChange={selectAudioInput}
                disabled={!hasAudioInput}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioInputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speaker selection */}
            <div className="space-y-2">
              <Label>Speaker</Label>
              <Select
                value={selectedAudioOutput || ""}
                onValueChange={selectAudioOutput}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera selection */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Camera</Label>
              <Select
                value={selectedVideoInput || ""}
                onValueChange={(deviceId) => {
                  selectVideoInput(deviceId)
                  // Restart preview with new camera
                  stopPreview()
                  startPreview(deviceId)
                }}
                disabled={!hasVideoInput}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoInputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Join button */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              stopPreview() // Stop preview before joining
              onJoin()
            }}
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Meeting"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
