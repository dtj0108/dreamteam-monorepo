"use client"

import { useEffect, useRef } from "react"
import { useMeeting } from "@/providers/meeting-provider"

/**
 * Hook for binding a video element to a Chime video tile.
 * Returns a ref that should be attached to a <video> element.
 *
 * @param tileId - The Chime video tile ID to bind
 * @returns A ref to attach to a video element
 */
export function useVideoTile(tileId: number | null) {
  const { audioVideo } = useMeeting()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!audioVideo || !videoRef.current || tileId === null) {
      return
    }

    // Bind the video element to the tile
    audioVideo.bindVideoElement(tileId, videoRef.current)

    // Unbind when component unmounts or tile changes
    return () => {
      if (audioVideo && tileId !== null) {
        audioVideo.unbindVideoElement(tileId)
      }
    }
  }, [audioVideo, tileId])

  return videoRef
}

/**
 * Hook for getting information about a specific video tile.
 */
export function useVideoTileState(tileId: number | null) {
  const { videoTiles } = useMeeting()

  if (tileId === null) {
    return null
  }

  return videoTiles.get(tileId) ?? null
}

/**
 * Hook for getting all active video tiles.
 */
export function useAllVideoTiles() {
  const { videoTiles } = useMeeting()

  const tiles = Array.from(videoTiles.values())

  // Separate local and remote tiles
  const localTile = tiles.find((tile) => tile.localTile)
  const remoteTiles = tiles.filter((tile) => !tile.localTile && !tile.isContent)
  const contentTile = tiles.find((tile) => tile.isContent)

  return {
    allTiles: tiles,
    localTile,
    remoteTiles,
    contentTile,
    tileCount: tiles.length,
    hasContentShare: !!contentTile,
  }
}
