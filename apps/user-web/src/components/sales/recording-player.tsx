"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { PlayIcon, PauseIcon, Volume2Icon, Loader2Icon } from "lucide-react"

interface RecordingPlayerProps {
  recordingId: string
  duration: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function RecordingPlayer({ recordingId, duration }: RecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  const fetchAudioUrl = React.useCallback(async () => {
    if (audioUrl) return // Already fetched

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/communications/recordings/${recordingId}`)
      if (res.ok) {
        const data = await res.json()
        setAudioUrl(data.playback_url)
      } else {
        setError("Failed to load recording")
      }
    } catch (err) {
      console.error("Error fetching recording:", err)
      setError("Failed to load recording")
    } finally {
      setIsLoading(false)
    }
  }, [recordingId, audioUrl])

  const togglePlayback = async () => {
    if (!audioRef.current) return

    // Fetch URL on first play
    if (!audioUrl) {
      await fetchAudioUrl()
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      await audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  // Start playing once URL is loaded
  React.useEffect(() => {
    if (audioUrl && audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(console.error)
    }
  }, [audioUrl])

  return (
    <div className="flex items-center gap-2 p-2 bg-black/10 rounded-lg min-w-[200px]">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={togglePlayback}
        disabled={isLoading || !!error}
      >
        {isLoading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : isPlaying ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : (
          <input
            type="range"
            value={currentTime}
            max={duration || 1}
            step={1}
            onChange={(e) => handleSliderChange([parseInt(e.target.value)])}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        )}
      </div>

      <span className="text-xs shrink-0 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <Volume2Icon className="size-4 shrink-0 opacity-50" />

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime)
            }
          }}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
          }}
          onError={() => {
            setError("Playback error")
            setIsPlaying(false)
          }}
        />
      )}
    </div>
  )
}
