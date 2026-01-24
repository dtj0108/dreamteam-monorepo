# Plaid Integration Guide

Complete guide for integrating Plaid bank connections in the mobile app.

---

## Environment Setup

### Required Environment Variables

```env
PLAID_CLIENT_ID=<your_client_id>
PLAID_SECRET=<your_secret>
PLAID_ENV=sandbox|development|production
PLAID_WEBHOOK_URL=https://yourdomain.com/api/plaid/webhook
```

| Variable | Description |
|----------|-------------|
| `PLAID_CLIENT_ID` | Your Plaid application's client ID |
| `PLAID_SECRET` | Your Plaid application's secret key |
| `PLAID_ENV` | Environment: `sandbox` (testing), `development`, or `production` |
| `PLAID_WEBHOOK_URL` | Full URL for Plaid to send transaction/item updates |

---

## Bank Connection Flow

### New Connection Flow

```
1. User taps "Connect Bank"
       ↓
2. App calls POST /api/plaid/link-token
       ↓
3. App receives linkToken
       ↓
4. App opens Plaid Link SDK with linkToken
       ↓
5. User selects bank, logs in, grants permissions
       ↓
6. Plaid Link returns publicToken on success
       ↓
7. App calls POST /api/plaid/exchange with publicToken
       ↓
8. Backend exchanges token, creates accounts
       ↓
9. App receives created accounts, refreshes UI
```

### Update/Fix Connection Flow

When a bank connection breaks (user changed password, etc.):

```
1. App detects item.status === 'error'
       ↓
2. User taps "Fix Connection"
       ↓
3. App calls POST /api/plaid/link-token with accessToken
       ↓
4. App opens Plaid Link in UPDATE mode
       ↓
5. User re-authenticates
       ↓
6. Connection restored, status → 'good'
```

---

## API Endpoints

### 1. Create Link Token

**`POST /api/plaid/link-token`**

Creates a token to initialize Plaid Link UI.

**Request:**
```json
{
  "accessToken": "access-sandbox-xxx"  // Optional: for update mode
}
```

**Response:**
```json
{
  "linkToken": "link-sandbox-xxx",
  "expiration": "2025-01-16T12:00:00Z"
}
```

**Mobile Implementation:**
```typescript
// New connection
const { linkToken } = await fetch('/api/plaid/link-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json())

// Fix broken connection
const { linkToken } = await fetch('/api/plaid/link-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accessToken: item.access_token })
}).then(r => r.json())
```

---

### 2. Exchange Public Token

**`POST /api/plaid/exchange`**

Exchanges Plaid's public token for permanent access and creates accounts.

**Request:**
```json
{
  "publicToken": "public-sandbox-xxx",
  "institutionId": "ins_123456",
  "institutionName": "Chase Bank"
}
```

**Response:**
```json
{
  "success": true,
  "plaidItemId": "uuid",
  "accountsCreated": 2,
  "accounts": [
    {
      "id": "uuid",
      "name": "Checking",
      "type": "checking",
      "balance": 5000.00,
      "last_four": "1234"
    }
  ]
}
```

**Mobile Implementation:**
```typescript
const onPlaidSuccess = async (publicToken: string, metadata: any) => {
  const result = await fetch('/api/plaid/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicToken,
      institutionId: metadata.institution?.institution_id,
      institutionName: metadata.institution?.name
    })
  }).then(r => r.json())

  if (result.success) {
    // Refresh accounts list
    refreshAccounts()
  }
}
```

---

### 3. List Connected Banks

**`GET /api/plaid/accounts`**

Returns all Plaid connections with their linked accounts.

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "plaid_item_id": "item-xxx",
      "institution_name": "Chase Bank",
      "status": "good",
      "error_code": null,
      "error_message": null,
      "last_successful_update": "2025-01-09T10:00:00Z",
      "created_at": "2025-01-01T10:00:00Z",
      "accounts": [
        {
          "id": "uuid",
          "name": "Checking",
          "type": "checking",
          "balance": 5000.00,
          "last_four": "1234",
          "is_plaid_linked": true
        }
      ]
    }
  ]
}
```

---

### 4. Manual Sync

**`POST /api/plaid/sync`**

Manually triggers transaction sync for a Plaid item.

**Request:**
```json
{
  "plaidItemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "added": 25,
  "modified": 5,
  "removed": 0
}
```

---

### 5. Disconnect Bank

**`DELETE /api/plaid/items/[id]`**

Removes a bank connection. Accounts are kept but unlinked from Plaid.

**Response:**
```json
{
  "success": true
}
```

---

### 6. Webhook Handler

**`POST /api/plaid/webhook`**

Receives Plaid webhook events. Not called by mobile app directly.

**Webhook Types Handled:**

| Type | Codes | Action |
|------|-------|--------|
| TRANSACTIONS | `SYNC_UPDATES_AVAILABLE`, `INITIAL_UPDATE`, `HISTORICAL_UPDATE`, `DEFAULT_UPDATE` | Triggers transaction sync |
| TRANSACTIONS | `TRANSACTIONS_REMOVED` | Deletes removed transactions |
| ITEM | `ERROR` | Updates item status to 'error' |
| ITEM | `PENDING_EXPIRATION` | Updates item status to 'pending' |
| ITEM | `USER_PERMISSION_REVOKED` | Marks item as disconnected |

---

## Connection Status

### Status Values

| Status | Meaning | User Action |
|--------|---------|-------------|
| `good` | Connection active, syncing normally | None |
| `error` | Connection broken | Show "Fix Connection" button |
| `pending` | Re-authentication needed soon | Show warning, prompt to update |

### Error Handling

When `status === 'error'`:

```typescript
// Display error to user
if (item.status === 'error') {
  showAlert({
    title: 'Connection Issue',
    message: item.error_message || 'Please reconnect your bank',
    action: {
      label: 'Fix Connection',
      onPress: () => openPlaidLinkUpdate(item.access_token)
    }
  })
}
```

---

## Mobile SDK Integration

### React Native (react-native-plaid-link-sdk)

```typescript
import { create, open, dismissLink } from 'react-native-plaid-link-sdk'

// 1. Create link token
const { linkToken } = await api.createLinkToken()

// 2. Create Plaid Link config
create({ token: linkToken })

// 3. Open Plaid Link
const result = await open({
  onSuccess: async (success) => {
    await api.exchangeToken({
      publicToken: success.publicToken,
      institutionId: success.metadata.institution?.id,
      institutionName: success.metadata.institution?.name
    })
  },
  onExit: (exit) => {
    if (exit.error) {
      console.error('Plaid Link error:', exit.error)
    }
  }
})
```

### iOS (LinkKit)

```swift
// Create configuration
var linkConfiguration = LinkTokenConfiguration(
    token: linkToken,
    onSuccess: { success in
        // Exchange public token
        exchangeToken(publicToken: success.publicToken)
    }
)

// Present Plaid Link
let result = Plaid.create(linkConfiguration)
present(result.viewController, animated: true)
```

---

## Transaction Amount Convention

**Important:** Plaid and the app use opposite conventions:

| Source | Debits (expenses) | Credits (income) |
|--------|-------------------|------------------|
| Plaid API | Positive | Negative |
| App Database | Negative | Positive |

The backend automatically negates amounts during sync. Mobile developers don't need to handle this.

---

## Sandbox Testing

In sandbox mode (`PLAID_ENV=sandbox`):

1. Use test credentials: `user_good` / `pass_good`
2. Transactions are auto-generated after connection
3. Manual sync resets cursor and fetches fresh test data

### Test Institutions

| Institution | ID | Features |
|-------------|-----|----------|
| Chase | `ins_3` | Standard checking/savings |
| Bank of America | `ins_4` | Credit cards |
| Wells Fargo | `ins_5` | Multiple account types |

---

## Database Schema Reference

### plaid_items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Internal ID |
| workspace_id | UUID | Workspace reference |
| plaid_item_id | TEXT | Plaid's Item ID |
| plaid_access_token | TEXT | Permanent access token |
| institution_name | TEXT | Bank display name |
| status | TEXT | 'good', 'error', 'pending' |
| error_code | TEXT | Last error code |
| error_message | TEXT | Error details |
| last_successful_update | TIMESTAMPTZ | Last sync time |

### accounts (Plaid fields)

| Column | Type | Description |
|--------|------|-------------|
| plaid_account_id | TEXT | Plaid's account ID |
| plaid_item_id | UUID | Reference to plaid_items |
| plaid_mask | TEXT | Last 4 digits |
| is_plaid_linked | BOOLEAN | Whether account is Plaid-linked |

### transactions (Plaid fields)

| Column | Type | Description |
|--------|------|-------------|
| plaid_transaction_id | TEXT | Unique transaction ID from Plaid |
| plaid_pending | BOOLEAN | Is transaction pending |
| plaid_merchant_name | TEXT | Merchant from Plaid |

---

## Error Codes Reference

Common Plaid error codes your app should handle:

| Code | Meaning | Solution |
|------|---------|----------|
| `ITEM_LOGIN_REQUIRED` | Credentials expired | Prompt user to update connection |
| `ITEM_LOCKED` | Account locked at bank | User must unlock at bank |
| `ITEM_NOT_SUPPORTED` | Bank not supported | Try different bank |
| `INVALID_CREDENTIALS` | Wrong username/password | Re-enter credentials |
| `MFA_NOT_SUPPORTED` | MFA method not supported | Try different MFA method |
