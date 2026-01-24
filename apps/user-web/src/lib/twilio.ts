import twilio from 'twilio'
import { validateRequest } from 'twilio/lib/webhooks/webhooks'
import { jwt } from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!
const apiKeySid = process.env.TWILIO_API_KEY_SID
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

// Create Twilio client
const client = twilio(accountSid, authToken)

// Export TwiML response classes
export const VoiceResponse = twilio.twiml.VoiceResponse
export const MessagingResponse = twilio.twiml.MessagingResponse

/**
 * Send OTP verification code to a phone number
 */
export async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms',
      })

    return { success: verification.status === 'pending' }
  } catch (error) {
    console.error('Failed to send verification code:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send code' 
    }
  }
}

/**
 * Verify OTP code for a phone number
 */
export async function verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      })

    return { success: verificationCheck.status === 'approved' }
  } catch (error) {
    console.error('Failed to verify code:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify code'
    }
  }
}

// ============================================
// SMS Functions
// ============================================

export interface SendSMSOptions {
  to: string
  body: string
  from?: string
  mediaUrls?: string[]
  statusCallback?: string
}

export interface SMSResult {
  success: boolean
  sid?: string
  status?: string
  error?: string
}

/**
 * Send an SMS message
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSResult> {
  try {
    const message = await client.messages.create({
      to: options.to,
      from: options.from || twilioPhoneNumber,
      body: options.body,
      mediaUrl: options.mediaUrls,
      statusCallback: options.statusCallback ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
    })

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    }
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    }
  }
}

// ============================================
// Voice Call Functions
// ============================================

export interface MakeCallOptions {
  to: string
  from?: string
  record?: boolean
  timeout?: number
  twimlUrl?: string
}

export interface CallResult {
  success: boolean
  sid?: string
  status?: string
  error?: string
}

/**
 * Initiate an outbound call
 */
export async function makeCall(options: MakeCallOptions): Promise<CallResult> {
  try {
    const call = await client.calls.create({
      to: options.to,
      from: options.from || twilioPhoneNumber,
      url: options.twimlUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/outbound`,
      record: options.record ?? true,
      recordingStatusCallback:
        `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`,
      recordingStatusCallbackEvent: ['completed'],
      timeout: options.timeout ?? 30,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    })

    return {
      success: true,
      sid: call.sid,
      status: call.status,
    }
  } catch (error) {
    console.error('Failed to make call:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to make call',
    }
  }
}

/**
 * Get recording details from Twilio
 */
export async function getRecording(recordingSid: string) {
  try {
    const recording = await client.recordings(recordingSid).fetch()
    return {
      success: true,
      recording: {
        sid: recording.sid,
        duration: parseInt(recording.duration),
        url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
        status: recording.status,
      },
    }
  } catch (error) {
    console.error('Failed to get recording:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recording',
    }
  }
}

/**
 * Download recording audio from Twilio
 */
export async function downloadRecording(recordingSid: string): Promise<Buffer | null> {
  try {
    const recording = await client.recordings(recordingSid).fetch()
    const mediaUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
    })

    if (!response.ok) throw new Error('Failed to download recording')

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Failed to download recording:', error)
    return null
  }
}

// ============================================
// Webhook Validation
// ============================================

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioWebhook(
  requestUrl: string,
  params: Record<string, string>,
  twilioSignature: string
): boolean {
  return validateRequest(authToken, twilioSignature, requestUrl, params)
}

// ============================================
// Phone Number Utilities
// ============================================

/**
 * Format phone number to E.164 format
 */
export function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  if (digits.length === 10) {
    return `+1${digits}`
  }

  return `+${digits}`
}

/**
 * Validate E.164 phone number format
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

/**
 * Get the configured Twilio phone number
 */
export function getTwilioPhoneNumber(): string {
  return twilioPhoneNumber
}

// ============================================
// Phone Number Management
// ============================================

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string
  region: string
  postalCode: string
  isoCountry: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

export interface SearchNumbersOptions {
  country: string
  areaCode?: string
  type?: 'local' | 'tollFree' | 'mobile'
  smsEnabled?: boolean
  voiceEnabled?: boolean
  mmsEnabled?: boolean
  limit?: number
}

export interface PurchaseResult {
  success: boolean
  sid?: string
  phoneNumber?: string
  friendlyName?: string
  error?: string
}

export interface OwnedNumber {
  sid: string
  phoneNumber: string
  friendlyName: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
  dateCreated: string
}

/**
 * Search for available phone numbers to purchase
 */
export async function searchAvailableNumbers(
  options: SearchNumbersOptions
): Promise<{ success: boolean; numbers?: AvailableNumber[]; error?: string }> {
  try {
    const { country, areaCode, type = 'local', smsEnabled, voiceEnabled, mmsEnabled, limit = 20 } = options

    // Build search params
    const searchParams: Record<string, unknown> = { limit }
    if (areaCode) searchParams.areaCode = areaCode
    if (smsEnabled !== undefined) searchParams.smsEnabled = smsEnabled
    if (voiceEnabled !== undefined) searchParams.voiceEnabled = voiceEnabled
    if (mmsEnabled !== undefined) searchParams.mmsEnabled = mmsEnabled

    // Get the appropriate resource based on type
    let numbers
    switch (type) {
      case 'tollFree':
        numbers = await client.availablePhoneNumbers(country).tollFree.list(searchParams)
        break
      case 'mobile':
        numbers = await client.availablePhoneNumbers(country).mobile.list(searchParams)
        break
      case 'local':
      default:
        numbers = await client.availablePhoneNumbers(country).local.list(searchParams)
        break
    }

    return {
      success: true,
      numbers: numbers.map((n) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality || '',
        region: n.region || '',
        postalCode: n.postalCode || '',
        isoCountry: n.isoCountry,
        capabilities: {
          voice: n.capabilities.voice,
          sms: n.capabilities.sms,
          mms: n.capabilities.mms,
        },
      })),
    }
  } catch (error) {
    console.error('Failed to search available numbers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search numbers',
    }
  }
}

/**
 * Purchase/provision a phone number
 */
export async function purchasePhoneNumber(phoneNumber: string): Promise<PurchaseResult> {
  try {
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber,
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms`,
      smsMethod: 'POST',
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
      statusCallbackMethod: 'POST',
    })

    return {
      success: true,
      sid: purchasedNumber.sid,
      phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName,
    }
  } catch (error) {
    console.error('Failed to purchase phone number:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purchase number',
    }
  }
}

/**
 * List all owned phone numbers from Twilio account
 */
export async function listOwnedNumbers(): Promise<{ success: boolean; numbers?: OwnedNumber[]; error?: string }> {
  try {
    const numbers = await client.incomingPhoneNumbers.list({ limit: 100 })

    return {
      success: true,
      numbers: numbers.map((n) => ({
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        capabilities: {
          voice: n.capabilities.voice,
          sms: n.capabilities.sms,
          mms: n.capabilities.mms,
        },
        dateCreated: n.dateCreated.toISOString(),
      })),
    }
  } catch (error) {
    console.error('Failed to list owned numbers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list numbers',
    }
  }
}

/**
 * Release/delete a phone number
 */
export async function releasePhoneNumber(sid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await client.incomingPhoneNumbers(sid).remove()
    return { success: true }
  } catch (error) {
    console.error('Failed to release phone number:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to release number',
    }
  }
}

/**
 * Update a phone number's configuration
 */
export async function updatePhoneNumber(
  sid: string,
  options: { friendlyName?: string; smsUrl?: string; voiceUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await client.incomingPhoneNumbers(sid).update(options)
    return { success: true }
  } catch (error) {
    console.error('Failed to update phone number:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update number',
    }
  }
}

// ============================================
// Call Control Functions
// ============================================

export interface CallStatusResult {
  success: boolean
  status?: string
  duration?: number
  error?: string
}

/**
 * Get current call status from Twilio
 */
export async function getCallStatus(callSid: string): Promise<CallStatusResult> {
  try {
    const call = await client.calls(callSid).fetch()
    return {
      success: true,
      status: call.status,
      duration: call.duration ? parseInt(call.duration) : undefined,
    }
  } catch (error) {
    console.error('Failed to get call status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get call status',
    }
  }
}

/**
 * End an active call
 */
export async function endCall(callSid: string): Promise<CallResult> {
  try {
    const call = await client.calls(callSid).update({ status: 'completed' })
    return {
      success: true,
      sid: call.sid,
      status: call.status,
    }
  } catch (error) {
    console.error('Failed to end call:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end call',
    }
  }
}

/**
 * Send DTMF tones during an active call
 */
export async function sendDTMF(callSid: string, digits: string): Promise<CallResult> {
  try {
    // Create a TwiML that plays the DTMF tones
    const twiml = new VoiceResponse()
    twiml.play({ digits })

    // Update the call with the TwiML
    const call = await client.calls(callSid).update({
      twiml: twiml.toString(),
    })

    return {
      success: true,
      sid: call.sid,
      status: call.status,
    }
  } catch (error) {
    console.error('Failed to send DTMF:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send DTMF tones',
    }
  }
}

// ============================================
// Conference Call Functions (for mute/hold)
// ============================================

export interface ConferenceResult {
  success: boolean
  conferenceSid?: string
  participantSid?: string
  error?: string
}

/**
 * Get participants in a conference
 */
export async function getConferenceParticipants(conferenceSid: string) {
  try {
    const participants = await client.conferences(conferenceSid).participants.list()
    return {
      success: true,
      participants: participants.map(p => ({
        callSid: p.callSid,
        participantSid: p.callSid, // In Twilio, participant SID is the call SID
        muted: p.muted,
        hold: p.hold,
      })),
    }
  } catch (error) {
    console.error('Failed to get conference participants:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get participants',
    }
  }
}

/**
 * Mute/unmute a participant in a conference
 */
export async function muteParticipant(
  conferenceSid: string,
  participantCallSid: string,
  muted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await client.conferences(conferenceSid)
      .participants(participantCallSid)
      .update({ muted })
    return { success: true }
  } catch (error) {
    console.error('Failed to mute participant:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mute participant',
    }
  }
}

/**
 * Put a participant on hold in a conference
 */
export async function holdParticipant(
  conferenceSid: string,
  participantCallSid: string,
  hold: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await client.conferences(conferenceSid)
      .participants(participantCallSid)
      .update({
        hold,
        holdUrl: hold ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/hold-music` : undefined,
      })
    return { success: true }
  } catch (error) {
    console.error('Failed to hold participant:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to hold participant',
    }
  }
}

// ============================================
// Voice Client Access Token
// ============================================

export interface AccessTokenResult {
  success: boolean
  token?: string
  error?: string
}

/**
 * Generate an access token for Twilio Voice SDK (browser calling)
 */
export function generateVoiceAccessToken(identity: string): AccessTokenResult {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'twilio.ts:generateVoiceAccessToken:entry',message:'Token generation started',data:{identity,hasApiKeySid:!!apiKeySid,hasApiKeySecret:!!apiKeySecret,hasTwimlAppSid:!!twimlAppSid,accountSidPrefix:accountSid?.substring(0,6),apiKeySidPrefix:apiKeySid?.substring(0,6),twimlAppSidPrefix:twimlAppSid?.substring(0,6),accountSidLen:accountSid?.length,apiKeySidLen:apiKeySid?.length,apiKeySecretLen:apiKeySecret?.length,twimlAppSidLen:twimlAppSid?.length,apiKeySecretFirst4:apiKeySecret?.substring(0,4),apiKeySecretLast4:apiKeySecret?.substring(apiKeySecret.length-4),hasWhitespace:{accountSid:accountSid!==accountSid?.trim(),apiKeySid:apiKeySid!==apiKeySid?.trim(),apiKeySecret:apiKeySecret!==apiKeySecret?.trim(),twimlAppSid:twimlAppSid!==twimlAppSid?.trim()}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H6'})}).catch(()=>{});
  // #endregion

  if (!apiKeySid || !apiKeySecret || !twimlAppSid) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'twilio.ts:generateVoiceAccessToken:missing-creds',message:'Missing credentials',data:{apiKeySid:apiKeySid||'MISSING',apiKeySecret:apiKeySecret?'SET':'MISSING',twimlAppSid:twimlAppSid||'MISSING'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return {
      success: false,
      error: 'Twilio Voice SDK not configured. Missing API Key or TwiML App SID.',
    }
  }

  try {
    const { AccessToken } = jwt
    const { VoiceGrant } = AccessToken

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'twilio.ts:generateVoiceAccessToken:creating-token',message:'Creating AccessToken',data:{accountSid:accountSid?.substring(0,6),apiKeySid:apiKeySid?.substring(0,6),twimlAppSid:twimlAppSid?.substring(0,6),identity},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
    // #endregion

    // Create access token
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { identity, ttl: 3600 } // 1 hour TTL
    )

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, // Allow incoming calls
    })

    // Add the grant to the token
    token.addGrant(voiceGrant)

    const jwtToken = token.toJwt()
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'twilio.ts:generateVoiceAccessToken:success',message:'Token generated successfully',data:{tokenLength:jwtToken.length,tokenPrefix:jwtToken.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
    // #endregion

    return {
      success: true,
      token: jwtToken,
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'twilio.ts:generateVoiceAccessToken:error',message:'Token generation failed',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    console.error('Failed to generate access token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate access token',
    }
  }
}

