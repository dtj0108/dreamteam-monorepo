/**
 * Amazon Chime SDK Service Library
 *
 * Server-side utilities for creating and managing video meetings.
 * This follows the same pattern as twilio.ts for consistency.
 *
 * Required environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (defaults to us-east-1)
 * - CHIME_MEDIA_REGION (defaults to us-east-1)
 */

import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
  DeleteAttendeeCommand,
  type Meeting,
  type Attendee,
  type MediaPlacement,
} from "@aws-sdk/client-chime-sdk-meetings"

// ============================================
// Configuration
// ============================================

const awsRegion = process.env.AWS_REGION || "us-east-1"
const mediaRegion = process.env.CHIME_MEDIA_REGION || "us-east-1"

// Lazy-initialize the Chime client to avoid errors when env vars are missing
let chimeClient: ChimeSDKMeetingsClient | null = null

function getChimeClient(): ChimeSDKMeetingsClient {
  if (!chimeClient) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
      )
    }

    chimeClient = new ChimeSDKMeetingsClient({
      region: awsRegion,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }
  return chimeClient
}

// ============================================
// Types
// ============================================

export interface CreateMeetingOptions {
  externalMeetingId: string
  mediaRegion?: string
  tags?: Record<string, string>
}

export interface CreateMeetingResult {
  success: boolean
  meeting?: {
    meetingId: string
    externalMeetingId: string
    mediaRegion: string
    mediaPlacement: MediaPlacement
  }
  error?: string
}

export interface CreateAttendeeOptions {
  meetingId: string
  externalUserId: string
}

export interface CreateAttendeeResult {
  success: boolean
  attendee?: {
    attendeeId: string
    externalUserId: string
    joinToken: string
  }
  error?: string
}

export interface GetMeetingResult {
  success: boolean
  meeting?: Meeting
  error?: string
}

export interface ListAttendeesResult {
  success: boolean
  attendees?: Attendee[]
  error?: string
}

export interface EndMeetingResult {
  success: boolean
  error?: string
}

export interface RemoveAttendeeResult {
  success: boolean
  error?: string
}

// ============================================
// Meeting Functions
// ============================================

/**
 * Create a new Chime meeting
 */
export async function createChimeMeeting(
  options: CreateMeetingOptions
): Promise<CreateMeetingResult> {
  try {
    const client = getChimeClient()

    const command = new CreateMeetingCommand({
      ClientRequestToken: options.externalMeetingId,
      ExternalMeetingId: options.externalMeetingId,
      MediaRegion: options.mediaRegion || mediaRegion,
      Tags: options.tags
        ? Object.entries(options.tags).map(([key, value]) => ({ Key: key, Value: value }))
        : undefined,
    })

    const response = await client.send(command)

    if (!response.Meeting) {
      return { success: false, error: "No meeting returned from Chime" }
    }

    return {
      success: true,
      meeting: {
        meetingId: response.Meeting.MeetingId!,
        externalMeetingId: response.Meeting.ExternalMeetingId!,
        mediaRegion: response.Meeting.MediaRegion!,
        mediaPlacement: response.Meeting.MediaPlacement!,
      },
    }
  } catch (error) {
    console.error("Failed to create Chime meeting:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create meeting",
    }
  }
}

/**
 * Get an existing Chime meeting by ID
 */
export async function getChimeMeeting(meetingId: string): Promise<GetMeetingResult> {
  try {
    const client = getChimeClient()

    const command = new GetMeetingCommand({
      MeetingId: meetingId,
    })

    const response = await client.send(command)

    return {
      success: true,
      meeting: response.Meeting,
    }
  } catch (error) {
    console.error("Failed to get Chime meeting:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get meeting",
    }
  }
}

/**
 * End a Chime meeting (kicks all participants)
 */
export async function endChimeMeeting(meetingId: string): Promise<EndMeetingResult> {
  try {
    const client = getChimeClient()

    const command = new DeleteMeetingCommand({
      MeetingId: meetingId,
    })

    await client.send(command)

    return { success: true }
  } catch (error) {
    console.error("Failed to end Chime meeting:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to end meeting",
    }
  }
}

// ============================================
// Attendee Functions
// ============================================

/**
 * Create an attendee for a meeting (returns join token)
 */
export async function createChimeAttendee(
  options: CreateAttendeeOptions
): Promise<CreateAttendeeResult> {
  try {
    const client = getChimeClient()

    const command = new CreateAttendeeCommand({
      MeetingId: options.meetingId,
      ExternalUserId: options.externalUserId,
    })

    const response = await client.send(command)

    if (!response.Attendee) {
      return { success: false, error: "No attendee returned from Chime" }
    }

    return {
      success: true,
      attendee: {
        attendeeId: response.Attendee.AttendeeId!,
        externalUserId: response.Attendee.ExternalUserId!,
        joinToken: response.Attendee.JoinToken!,
      },
    }
  } catch (error) {
    console.error("Failed to create Chime attendee:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create attendee",
    }
  }
}

/**
 * List all attendees in a meeting
 */
export async function listChimeAttendees(meetingId: string): Promise<ListAttendeesResult> {
  try {
    const client = getChimeClient()

    const command = new ListAttendeesCommand({
      MeetingId: meetingId,
    })

    const response = await client.send(command)

    return {
      success: true,
      attendees: response.Attendees || [],
    }
  } catch (error) {
    console.error("Failed to list Chime attendees:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list attendees",
    }
  }
}

/**
 * Remove an attendee from a meeting
 */
export async function removeChimeAttendee(
  meetingId: string,
  attendeeId: string
): Promise<RemoveAttendeeResult> {
  try {
    const client = getChimeClient()

    const command = new DeleteAttendeeCommand({
      MeetingId: meetingId,
      AttendeeId: attendeeId,
    })

    await client.send(command)

    return { success: true }
  } catch (error) {
    console.error("Failed to remove Chime attendee:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove attendee",
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Chime SDK is properly configured
 */
export function isChimeConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
}

/**
 * Get the configured media region
 */
export function getMediaRegion(): string {
  return mediaRegion
}

/**
 * Supported media regions for Amazon Chime SDK
 * Users are typically routed to the nearest region automatically,
 * but this can be used for explicit region selection
 */
export const CHIME_MEDIA_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
] as const
