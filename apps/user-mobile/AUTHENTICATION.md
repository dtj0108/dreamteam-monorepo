# Authentication Flow

This document explains the complete authentication system used in FinanceBro.

## Overview

FinanceBro uses a **hybrid authentication system**:

- **Supabase Auth** for email/password authentication and session management
- **Twilio Verify** for mandatory SMS-based two-factor authentication (2FA)
- **Cookie-based sessions** (HTTP-only, secure) managed by `@supabase/ssr`

Every login and signup requires completing 2FA before accessing the application.

---

## Authentication Flow Diagrams

### Signup Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              SIGNUP FLOW                                  │
└──────────────────────────────────────────────────────────────────────────┘

  User                        Frontend                       Backend
   │                             │                              │
   │  1. Enter signup info       │                              │
   │  (name, email, phone, pw)   │                              │
   │ ──────────────────────────> │                              │
   │                             │                              │
   │                             │  2. POST /api/auth/signup    │
   │                             │ ───────────────────────────> │
   │                             │                              │
   │                             │                              │ 3. Create Supabase user
   │                             │                              │ 4. Create profile (pending_2fa=true)
   │                             │                              │ 5. Check team invites
   │                             │                              │ 6. Create/join workspace
   │                             │                              │ 7. Send OTP via Twilio
   │                             │                              │
   │                             │  8. Return { userId, phone } │
   │                             │ <─────────────────────────── │
   │                             │                              │
   │  9. Redirect to /verify     │                              │
   │ <────────────────────────── │                              │
   │                             │                              │
   │  10. Receive SMS with code  │                              │
   │ <─────────────────────────────────────────────────────────────────────
   │                             │                              │
   │  11. Enter OTP code         │                              │
   │ ──────────────────────────> │                              │
   │                             │                              │
   │                             │  12. POST /api/auth/verify-otp
   │                             │ ───────────────────────────> │
   │                             │                              │
   │                             │                              │ 13. Validate with Twilio
   │                             │                              │ 14. Set pending_2fa=false
   │                             │                              │ 15. Set phone_verified=true
   │                             │                              │
   │                             │  16. Return { success, user }│
   │                             │ <─────────────────────────── │
   │                             │                              │
   │  17. Redirect to dashboard  │                              │
   │ <────────────────────────── │                              │
   │                             │                              │
```

### Login Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                               LOGIN FLOW                                  │
└──────────────────────────────────────────────────────────────────────────┘

  User                        Frontend                       Backend
   │                             │                              │
   │  1. Enter email & password  │                              │
   │ ──────────────────────────> │                              │
   │                             │                              │
   │                             │  2. POST /api/auth/login     │
   │                             │ ───────────────────────────> │
   │                             │                              │
   │                             │                              │ 3. Validate with Supabase Auth
   │                             │                              │ 4. Set pending_2fa=true
   │                             │                              │ 5. Send OTP via Twilio
   │                             │                              │
   │                             │  6. Return { userId, phone } │
   │                             │ <─────────────────────────── │
   │                             │                              │
   │  7. Redirect to /verify     │                              │
   │ <────────────────────────── │                              │
   │                             │                              │
   │  8. Receive SMS with code   │                              │
   │ <─────────────────────────────────────────────────────────────────────
   │                             │                              │
   │  9. Enter OTP code          │                              │
   │ ──────────────────────────> │                              │
   │                             │                              │
   │                             │  10. POST /api/auth/verify-otp
   │                             │ ───────────────────────────> │
   │                             │                              │
   │                             │                              │ 11. Validate with Twilio
   │                             │                              │ 12. Set pending_2fa=false
   │                             │                              │
   │                             │  13. Return { success, user }│
   │                             │ <─────────────────────────── │
   │                             │                              │
   │  14. Redirect to dashboard  │                              │
   │ <────────────────────────── │                              │
   │                             │                              │
```

---

## API Endpoints

### POST /api/auth/signup

Creates a new user account and initiates 2FA.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePassword123",
  "companyName": "Acme Inc"
}
```

**Validation:**
- `name`: Required, non-empty
- `email`: Required, valid email format
- `phone`: Required, E.164 format (`^\+[1-9]\d{1,14}$`)
- `password`: Required, minimum 8 characters
- `companyName`: Optional

**Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent to your phone",
  "userId": "uuid",
  "phone": "+1234567890",
  "joinedTeam": false,
  "teamName": "John's Workspace",
  "workspaceId": "uuid"
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | "Name is required" |
| 400 | "Invalid email format" |
| 400 | "Invalid phone number format. Use E.164 format" |
| 400 | "Password must be at least 8 characters" |
| 409 | "An account with this email already exists" |
| 500 | "Failed to create account" |

---

### POST /api/auth/login

Authenticates with email/password and initiates 2FA.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent to your phone",
  "userId": "uuid",
  "phone": "+1234567890",
  "name": "John Doe"
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 401 | "Invalid email or password" |
| 500 | "User profile not found" |
| 500 | "Failed to send verification code" |

---

### POST /api/auth/send-otp

Sends a verification code to a phone number.

**Request:**
```json
{
  "phone": "+1234567890"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | "Phone number is required" |
| 400 | "Invalid phone number format. Use E.164 format" |
| 500 | "Failed to send verification code" |

---

### POST /api/auth/verify-otp

Verifies the OTP code and completes authentication.

**Request:**
```json
{
  "phone": "+1234567890",
  "code": "123456",
  "isSignup": false,
  "userId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | "Phone number and code are required" |
| 400 | "Phone number does not match" |
| 401 | "Invalid verification code" |
| 404 | "No account found with this phone number" |

---

### GET /api/auth/me

Returns the current authenticated user's profile.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "companyName": "Acme Inc",
    "industryType": "saas",
    "workspaceId": "uuid",
    "workspaceName": "Acme Workspace",
    "workspaceRole": "owner",
    "allowedProducts": ["finance", "sales", "team", "projects", "knowledge"],
    "pending2FA": false,
    "phoneVerified": true
  }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 401 | "Not authenticated" |

---

### POST /api/auth/logout

Ends the current session.

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Session Management

### Cookie-Based Sessions

Sessions are managed via HTTP-only cookies set by Supabase. The `@supabase/ssr` package handles:

- Reading cookies from requests
- Refreshing expired tokens automatically
- Setting updated cookies in responses

### Supabase Client Setup

**Browser Client** (`packages/database/src/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
```

**Server Client** (`packages/database/src/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Admin Client** (bypasses RLS):
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

### Token Lifecycle

| Token | Duration | Storage | Refresh |
|-------|----------|---------|---------|
| Access Token | 1 hour | Cookie | Automatic |
| Refresh Token | 7 days | Cookie | On access token expiry |

---

## Two-Factor Authentication (2FA)

### Twilio Verify Integration

OTPs are sent via Twilio Verify SMS service.

**Sending OTP** (`apps/finance/src/lib/twilio.ts`):
```typescript
import twilio from 'twilio'

const client = twilio(accountSid, authToken)

export async function sendVerificationCode(phoneNumber: string) {
  const verification = await client.verify.v2
    .services(verifyServiceSid)
    .verifications.create({
      to: phoneNumber,
      channel: 'sms',
    })

  return { success: verification.status === 'pending' }
}
```

**Verifying OTP**:
```typescript
export async function verifyCode(phoneNumber: string, code: string) {
  const verificationCheck = await client.verify.v2
    .services(verifyServiceSid)
    .verificationChecks.create({
      to: phoneNumber,
      code: code,
    })

  return { success: verificationCheck.status === 'approved' }
}
```

### 2FA State Tracking

Two boolean flags in the `profiles` table track 2FA status:

| Flag | Description |
|------|-------------|
| `pending_2fa` | `true` after password auth, `false` after OTP verification |
| `phone_verified` | `true` once user has verified their phone at least once |

---

## Database Schema

### profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT UNIQUE,
  company_name TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  pending_2fa BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'owner',
  default_workspace_id UUID REFERENCES workspaces(id),
  industry_type TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workspaces Table

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workspace_members Table

```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',  -- owner, admin, member
  allowed_products TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, profile_id)
);
```

### Row-Level Security (RLS)

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can view workspaces they belong to
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE profile_id = auth.uid()
    )
  );

-- Users can view members of their workspaces
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE profile_id = auth.uid()
    )
  );
```

---

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt (handled by Supabase Auth)
- Minimum 8 characters enforced at API level
- Never returned in API responses

### Session Security
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag (HTTPS only in production)
- SameSite=Lax (CSRF protection)
- Automatic token refresh

### Phone Number Validation
- E.164 format required: `^\+[1-9]\d{1,14}$`
- Examples: `+1234567890`, `+442071234567`
- Validated on both send-otp and verify-otp

### Database Security
- RLS enabled on all tables
- Users can only access their own data
- Admin operations use service role key (server-only)

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
```

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/finance/src/app/api/auth/login/route.ts` | Login endpoint |
| `apps/finance/src/app/api/auth/signup/route.ts` | Signup endpoint |
| `apps/finance/src/app/api/auth/send-otp/route.ts` | Send OTP endpoint |
| `apps/finance/src/app/api/auth/verify-otp/route.ts` | Verify OTP endpoint |
| `apps/finance/src/app/api/auth/logout/route.ts` | Logout endpoint |
| `apps/finance/src/app/api/auth/me/route.ts` | Current user endpoint |
| `apps/finance/src/lib/twilio.ts` | Twilio SDK wrapper |
| `packages/database/src/client.ts` | Browser Supabase client |
| `packages/database/src/server.ts` | Server Supabase client |
| `packages/auth/src/session.ts` | Session utilities |

---

## Frontend Pages

| Route | Purpose |
|-------|---------|
| `/login` | Email/password login form |
| `/signup` | New user registration form |
| `/verify` | OTP code entry form |

### Verify Page Query Parameters

| Param | Description |
|-------|-------------|
| `phone` | Phone number for resending OTP |
| `userId` | User ID (for login flow) |
| `signup` | `true` if coming from signup |
| `name` | User's name (for display) |

---

## Mobile App Considerations

For React Native/Expo, authentication differs slightly:

1. **Token Storage**: Use `expo-secure-store` instead of cookies
2. **Session Persistence**: Configure Supabase with `AsyncStorage`
3. **Token Refresh**: Manual refresh may be needed

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

For API calls, include the access token in headers:

```typescript
const { data: { session } } = await supabase.auth.getSession()

fetch('/api/accounts', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`
  }
})
```
