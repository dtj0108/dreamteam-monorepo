/**
 * Communications test fixtures
 */

export const testWorkspaceId = 'workspace-123'
export const testUserId = 'test-user-id'

// ============================================
// Call fixtures
// ============================================
export const mockCall = {
  id: 'call-123',
  user_id: testWorkspaceId,
  type: 'call',
  direction: 'outbound',
  from_number: '+15551234567',
  to_number: '+15559876543',
  lead_id: null,
  contact_id: 'contact-123',
  twilio_sid: 'CA1234567890abcdef',
  twilio_status: 'in-progress',
  duration_seconds: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockCallCompleted = {
  ...mockCall,
  id: 'call-456',
  twilio_status: 'completed',
  duration_seconds: 120,
}

export const mockCallList = [
  mockCall,
  mockCallCompleted,
  {
    id: 'call-789',
    user_id: testWorkspaceId,
    type: 'call',
    direction: 'inbound',
    from_number: '+15559876543',
    to_number: '+15551234567',
    lead_id: 'lead-123',
    contact_id: null,
    twilio_sid: 'CA0987654321fedcba',
    twilio_status: 'completed',
    duration_seconds: 60,
    created_at: '2024-01-14T15:00:00Z',
    updated_at: '2024-01-14T15:01:00Z',
  },
]

export const mockCallRecording = {
  id: 'recording-123',
  communication_id: 'call-123',
  twilio_recording_sid: 'RE1234567890abcdef',
  twilio_recording_url: 'https://api.twilio.com/recordings/RE1234567890abcdef.mp3',
  storage_path: null,
  duration_seconds: 120,
  file_size_bytes: 240000,
  created_at: '2024-01-15T10:02:00Z',
}

// ============================================
// SMS fixtures
// ============================================
export const mockSms = {
  id: 'sms-123',
  user_id: testWorkspaceId,
  type: 'sms',
  direction: 'outbound',
  from_number: '+15551234567',
  to_number: '+15559876543',
  body: 'Hello, this is a test message!',
  lead_id: null,
  contact_id: 'contact-123',
  twilio_sid: 'SM1234567890abcdef',
  twilio_status: 'delivered',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:05Z',
}

export const mockSmsList = [
  mockSms,
  {
    id: 'sms-456',
    user_id: testWorkspaceId,
    type: 'sms',
    direction: 'inbound',
    from_number: '+15559876543',
    to_number: '+15551234567',
    body: 'Thanks for the message!',
    lead_id: null,
    contact_id: 'contact-123',
    twilio_sid: 'SM0987654321fedcba',
    twilio_status: 'received',
    created_at: '2024-01-15T10:01:00Z',
    updated_at: '2024-01-15T10:01:00Z',
  },
]

export const mockConversationThread = {
  id: 'thread-123',
  user_id: testWorkspaceId,
  phone_number: '+15559876543',
  lead_id: null,
  contact_id: 'contact-123',
  is_archived: false,
  unread_count: 2,
  last_message_at: '2024-01-15T10:01:00Z',
  created_at: '2024-01-10T09:00:00Z',
}

export const mockConversationThreadList = [
  mockConversationThread,
  {
    id: 'thread-456',
    user_id: testWorkspaceId,
    phone_number: '+15558765432',
    lead_id: 'lead-123',
    contact_id: null,
    is_archived: false,
    unread_count: 0,
    last_message_at: '2024-01-14T16:30:00Z',
    created_at: '2024-01-05T11:00:00Z',
  },
]

// ============================================
// Phone Number fixtures
// ============================================
export const mockPhoneNumber = {
  id: 'phone-123',
  user_id: testWorkspaceId,
  phone_number: '+15551234567',
  twilio_sid: 'PN1234567890abcdef',
  friendly_name: 'Main Line',
  capabilities: { sms: true, voice: true, mms: true },
  is_primary: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockPhoneNumberSecondary = {
  id: 'phone-456',
  user_id: testWorkspaceId,
  phone_number: '+15559876543',
  twilio_sid: 'PN0987654321fedcba',
  friendly_name: 'Secondary Line',
  capabilities: { sms: true, voice: true, mms: false },
  is_primary: false,
  created_at: '2024-01-05T00:00:00Z',
  updated_at: '2024-01-05T00:00:00Z',
}

export const mockPhoneNumberList = [
  mockPhoneNumber,
  mockPhoneNumberSecondary,
]
