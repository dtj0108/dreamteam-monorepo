"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react"
import { Device, Call } from "@twilio/voice-sdk"

// Call status types matching Twilio's status values
export type CallStatus =
  | "pending"
  | "initiated"
  | "ringing"
  | "in-progress"
  | "on-hold"
  | "completed"
  | "busy"
  | "no-answer"
  | "canceled"
  | "failed"

export type DeviceState = "idle" | "initializing" | "ready" | "error"

export interface ActiveCall {
  id: string // communication.id from database
  twilioSid: string
  status: CallStatus
  direction: "inbound" | "outbound"
  phoneNumber: string // Remote party number
  contactName?: string
  leadId?: string
  contactId?: string
  startTime: Date
  answeredAt?: Date
  isMuted: boolean
  isOnHold: boolean
  fromNumber: string // Our Twilio number
  conferenceSid?: string
}

export interface IncomingCall {
  id: string // communication.id
  twilioSid: string
  from: string
  to: string
  contactName?: string
  leadId?: string
  contactId?: string
}

export interface InitiateCallParams {
  phoneNumber: string
  contactName?: string
  leadId?: string
  contactId?: string
  fromNumber: string
}

interface CallContextType {
  // State
  activeCall: ActiveCall | null
  incomingCall: IncomingCall | null
  isWidgetExpanded: boolean
  deviceState: DeviceState
  deviceError: string | null

  // Actions
  initiateCall: (params: InitiateCallParams) => Promise<void>
  setActiveCall: (call: ActiveCall | null) => void
  answerIncomingCall: () => Promise<void>
  declineIncomingCall: () => Promise<void>
  endCall: () => Promise<void>
  toggleMute: () => Promise<void>
  toggleHold: () => Promise<void>
  sendDTMF: (digit: string) => Promise<void>
  toggleWidgetExpanded: () => void
}

const CallContext = createContext<CallContextType | null>(null)

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error("useCall must be used within CallProvider")
  }
  return context
}

// Statuses that indicate the call has ended
const ENDED_STATUSES: CallStatus[] = [
  "completed",
  "busy",
  "no-answer",
  "canceled",
  "failed",
]

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [isWidgetExpanded, setIsWidgetExpanded] = useState(false)
  const [deviceState, setDeviceState] = useState<DeviceState>("idle")
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const deviceRef = useRef<Device | null>(null)
  const twilioCallRef = useRef<Call | null>(null)
  const pendingCallParamsRef = useRef<InitiateCallParams | null>(null)

  // Fetch a new access token
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/twilio/token")
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to fetch token")
      }
      const data = await res.json()
      return data.token
    } catch (err) {
      console.error("Failed to fetch Twilio token:", err)
      setDeviceError(err instanceof Error ? err.message : "Failed to fetch token")
      return null
    }
  }, [])

  // Initialize the Twilio Device
  const initializeDevice = useCallback(async () => {
    setDeviceState("initializing")
    setDeviceError(null)

    const token = await fetchToken()
    if (!token) {
      setDeviceState("error")
      return
    }

    try {
      // Clean up existing device
      if (deviceRef.current) {
        deviceRef.current.destroy()
      }

      const newDevice = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      })

      newDevice.on("registered", () => {
        console.log("Twilio Device registered")
        setDeviceState("ready")
        setDeviceError(null)
      })

      newDevice.on("error", (deviceError) => {
        console.error("Twilio Device error:", deviceError)
        setDeviceError(deviceError.message || "Device error")
        setDeviceState("error")
      })

      newDevice.on("tokenWillExpire", async () => {
        console.log("Twilio token will expire, refreshing...")
        const newToken = await fetchToken()
        if (newToken && deviceRef.current) {
          deviceRef.current.updateToken(newToken)
        }
      })

      newDevice.on("incoming", (call) => {
        console.log("Incoming call from:", call.parameters.From)
        // Handle incoming calls via Twilio Device
        twilioCallRef.current = call
        setIncomingCall({
          id: "", // Will be set when we create the communication record
          twilioSid: call.parameters.CallSid || "",
          from: call.parameters.From || "",
          to: call.parameters.To || "",
        })
      })

      await newDevice.register()
      deviceRef.current = newDevice
    } catch (err) {
      console.error("Failed to initialize Twilio Device:", err)
      setDeviceError(err instanceof Error ? err.message : "Failed to initialize device")
      setDeviceState("error")
    }
  }, [fetchToken])

  // Initialize device on mount
  useEffect(() => {
    initializeDevice()

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy()
        deviceRef.current = null
      }
    }
  }, [initializeDevice])

  // Initiate an outbound call using Device.connect()
  const initiateCall = useCallback(
    async (params: InitiateCallParams) => {
      if (!deviceRef.current || deviceState !== "ready") {
        setDeviceError("Device not ready. Please wait or refresh the page.")
        return
      }

      pendingCallParamsRef.current = params

      try {
        const call = await deviceRef.current.connect({
          params: {
            To: params.phoneNumber,
            From: params.fromNumber,
          },
        })

        twilioCallRef.current = call

        // Create the active call state
        setActiveCall({
          id: "", // Will be updated when we create the communication record
          twilioSid: "", // Will be set from call events
          status: "initiated",
          direction: "outbound",
          phoneNumber: params.phoneNumber,
          contactName: params.contactName,
          leadId: params.leadId,
          contactId: params.contactId,
          startTime: new Date(),
          isMuted: false,
          isOnHold: false,
          fromNumber: params.fromNumber,
        })
        setIsWidgetExpanded(true)

        // Set up call event handlers
        call.on("accept", () => {
          console.log("Outbound call connected")
          setActiveCall((prev) =>
            prev
              ? {
                  ...prev,
                  status: "in-progress",
                  answeredAt: new Date(),
                }
              : null
          )
        })

        call.on("ringing", () => {
          console.log("Call is ringing")
          setActiveCall((prev) =>
            prev ? { ...prev, status: "ringing" } : null
          )
        })

        call.on("disconnect", () => {
          console.log("Call disconnected")
          twilioCallRef.current = null
          pendingCallParamsRef.current = null
          setActiveCall(null)
        })

        call.on("cancel", () => {
          console.log("Call canceled")
          twilioCallRef.current = null
          pendingCallParamsRef.current = null
          setActiveCall(null)
        })

        call.on("error", (callError) => {
          console.error("Call error:", callError)
          setDeviceError(callError.message || "Call error")
          twilioCallRef.current = null
          pendingCallParamsRef.current = null
          setActiveCall(null)
        })
      } catch (err) {
        console.error("Failed to connect call:", err)
        setDeviceError(err instanceof Error ? err.message : "Failed to connect")
        pendingCallParamsRef.current = null
      }
    },
    [deviceState]
  )

  const answerIncomingCall = useCallback(async () => {
    if (!incomingCall || !twilioCallRef.current) return

    try {
      // Accept the call via Twilio Device
      twilioCallRef.current.accept()

      // Convert incoming call to active call
      setActiveCall({
        id: incomingCall.id,
        twilioSid: incomingCall.twilioSid,
        status: "in-progress",
        direction: "inbound",
        phoneNumber: incomingCall.from,
        contactName: incomingCall.contactName,
        leadId: incomingCall.leadId,
        contactId: incomingCall.contactId,
        startTime: new Date(),
        answeredAt: new Date(),
        isMuted: false,
        isOnHold: false,
        fromNumber: incomingCall.to,
      })
      setIncomingCall(null)
      setIsWidgetExpanded(true)

      // Set up call event handlers for incoming call
      twilioCallRef.current.on("disconnect", () => {
        console.log("Incoming call disconnected")
        twilioCallRef.current = null
        setActiveCall(null)
      })
    } catch (error) {
      console.error("Failed to answer call:", error)
    }
  }, [incomingCall])

  const declineIncomingCall = useCallback(async () => {
    if (!incomingCall) return

    try {
      // Reject the call via Twilio Device
      if (twilioCallRef.current) {
        twilioCallRef.current.reject()
        twilioCallRef.current = null
      }
      setIncomingCall(null)
    } catch (error) {
      console.error("Failed to decline call:", error)
    }
  }, [incomingCall])

  const endCall = useCallback(async () => {
    if (!activeCall) return

    try {
      // Disconnect via Twilio Device
      if (twilioCallRef.current) {
        twilioCallRef.current.disconnect()
        twilioCallRef.current = null
      }
      setActiveCall(null)
    } catch (error) {
      console.error("Failed to end call:", error)
    }
  }, [activeCall])

  const toggleMute = useCallback(async () => {
    if (!activeCall || !twilioCallRef.current) return

    try {
      const newMutedState = !activeCall.isMuted
      twilioCallRef.current.mute(newMutedState)
      setActiveCall((prev) =>
        prev ? { ...prev, isMuted: newMutedState } : null
      )
    } catch (error) {
      console.error("Failed to toggle mute:", error)
    }
  }, [activeCall])

  const toggleHold = useCallback(async () => {
    if (!activeCall) return

    // Note: Hold is not directly supported by Twilio Voice SDK client-side
    // This would require server-side conference manipulation
    console.warn("Hold functionality requires server-side conference setup")
    setActiveCall((prev) =>
      prev
        ? {
            ...prev,
            isOnHold: !prev.isOnHold,
            status: !prev.isOnHold ? "on-hold" : "in-progress",
          }
        : null
    )
  }, [activeCall])

  const sendDTMFDigit = useCallback(
    async (digit: string) => {
      if (!activeCall || !twilioCallRef.current) return

      try {
        twilioCallRef.current.sendDigits(digit)
      } catch (error) {
        console.error("Failed to send DTMF:", error)
      }
    },
    [activeCall]
  )

  const toggleWidgetExpanded = useCallback(() => {
    setIsWidgetExpanded((prev) => !prev)
  }, [])

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        isWidgetExpanded,
        deviceState,
        deviceError,
        initiateCall,
        setActiveCall,
        answerIncomingCall,
        declineIncomingCall,
        endCall,
        toggleMute,
        toggleHold,
        sendDTMF: sendDTMFDigit,
        toggleWidgetExpanded,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}
