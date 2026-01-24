# Mobile & Messaging Features

This document covers the messaging and mobile-friendly features implemented in the Finance app.

---

## 1. HEIC Image Support

**Problem:** Apple devices capture photos in HEIC format by default. The Sharp library's prebuilt binaries don't include HEIC support, causing uploads to fail.

**Solution:** We use `heic-convert`, a pure JavaScript library that converts HEIC images to JPEG without native dependencies.

### How It Works

When a file is uploaded via `/api/upload`:
1. Check if the file has `.heic` or `.heif` extension
2. Use `heic-convert` to decode and convert to JPEG
3. Upload the converted JPEG to storage

### Key File
- `apps/finance/src/app/api/upload/route.ts`

### Usage
```typescript
import convert from "heic-convert"

const jpegBuffer = await convert({
  buffer: heicBuffer,
  format: "JPEG",
  quality: 0.9,
})
```

---

## 2. Notification System

Real-time notifications when receiving new messages from other users.

### Sound Notifications

Different sounds play depending on the message type:
- **Regular message:** Subtle "polite" notification sound
- **@Mention:** More distinct "chord" sound to grab attention

Sounds are OGG files from the [akx/Notifications](https://github.com/akx/Notifications) repository (CC0 license).

### Browser Desktop Notifications

Shows native OS notifications with:
- Sender's name
- Message preview (first 100 characters)
- Auto-dismiss after 5 seconds
- Click to focus the app window

### Key Files
| File | Purpose |
|------|---------|
| `src/hooks/use-notification-sound.ts` | Hook & standalone function for playing sounds |
| `src/hooks/use-browser-notifications.ts` | Hook for browser Notification API |
| `src/hooks/use-team-messages.ts` | Triggers notifications on new messages |
| `public/sounds/message.ogg` | Regular message sound |
| `public/sounds/mention.ogg` | Mention notification sound |

### Usage
```typescript
import { playNotificationSound } from "@/hooks/use-notification-sound"
import { showBrowserNotification } from "@/hooks/use-browser-notifications"

// Play sound (outside React components)
playNotificationSound("message") // or "mention"

// Show browser notification
showBrowserNotification("New message from John", {
  body: "Hey, check out this...",
  tag: "message-123", // Prevents duplicate notifications
})
```

### Browser Permission
Browser notifications require user permission. The first notification attempt will trigger the browser's permission prompt.

---

## 3. @Mention Tagging

Slack-style user mentions with autocomplete.

### Features
- Type `@` to trigger the mention popup
- Autocomplete searches by name, display name, or email
- Keyboard navigation: Arrow keys, Enter/Tab to select, Escape to close
- Visual highlighting of mentions in the input (colored background)
- Mentions appear highlighted in sent messages

### How It Works

1. **Detection:** The input monitors for `@` characters and tracks text after it
2. **Autocomplete:** Fetches workspace members via `/api/team/members` and filters by query
3. **Selection:** Inserts `@Username ` at the mention position
4. **Highlighting:** An overlay renders colored backgrounds behind mention text

### Key Files
| File | Purpose |
|------|---------|
| `src/hooks/use-workspace-members.ts` | Fetches and caches workspace members |
| `src/components/team/message-input.tsx` | Mention detection, insertion, and highlighting |
| `src/components/team/autocomplete-popup.tsx` | Dropdown UI for mention suggestions |

### Highlight Overlay Technique
The input uses a transparent overlay to show colored mentions:
```tsx
{/* Overlay with colored backgrounds */}
<div className="absolute inset-0 pointer-events-none">
  {content.split(/(@\w+)/g).map((part) =>
    part.startsWith("@") ? (
      <span className="bg-primary/20 text-transparent">{part}</span>
    ) : (
      <span className="text-transparent">{part}</span>
    )
  )}
</div>
{/* Actual textarea (transparent background) */}
<textarea className="bg-transparent" />
```

---

## 4. Emoji Picker

Integrated emoji picker with category browsing.

### Features
- 5 categories: Recent, Smileys, Gestures, Symbols, Objects
- Click to insert at cursor position
- Cursor repositions after the emoji

### Key Files
| File | Purpose |
|------|---------|
| `src/components/team/emoji-picker.tsx` | Emoji picker popover UI |
| `src/components/team/message-input.tsx` | Emoji insertion handler |

### Usage Pattern
```typescript
const handleEmojiSelect = useCallback((emoji: string) => {
  const cursorPos = textarea.selectionStart
  const before = content.slice(0, cursorPos)
  const after = content.slice(cursorPos)
  setContent(`${before}${emoji}${after}`)

  // Reposition cursor after emoji
  setTimeout(() => {
    textarea.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length)
  }, 0)
}, [content])
```

---

## 5. PDF Viewer

Inline PDF viewing without downloading.

### Features
- Inline preview using browser's native PDF renderer (iframe)
- Fullscreen modal (95% viewport) for detailed reading
- Maximize button to expand the view

### Key File
- `src/components/team/file-upload/file-attachment.tsx`

### Implementation
Uses a Dialog modal with an iframe:
```tsx
<Dialog>
  <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh]">
    <iframe src={fileUrl} className="w-full h-full" />
  </DialogContent>
</Dialog>
```

---

## 6. File Attachments

Flexible file upload with multiple input methods.

### Features
- **Drag & drop:** Drop files anywhere in the message input area
- **Paste from clipboard:** Paste screenshots directly (Cmd+V / Ctrl+V)
- **File picker:** Click the attachment button to browse
- **Preview thumbnails:** Shows image/file previews before sending
- **Left-aligned:** Attachment previews align to the left of the input

### Supported Formats
- Images: JPEG, PNG, GIF, WebP, HEIC, HEIF
- Documents: PDF
- Any other file type (shown as generic file icon)

### Key Files
| File | Purpose |
|------|---------|
| `src/hooks/use-file-upload.ts` | Upload state management and API calls |
| `src/components/team/message-input.tsx` | Drag/drop and paste handlers |
| `src/components/team/file-upload/attachment-preview-area.tsx` | Preview thumbnails UI |
| `src/components/team/file-upload/file-attachment.tsx` | Individual file preview/viewer |

---

## Architecture Notes

### Real-time Updates
All messaging features use **Supabase Realtime** with `postgres_changes` to subscribe to database changes:
```typescript
supabase
  .channel("messages")
  .on("postgres_changes", { event: "INSERT", ... }, (payload) => {
    // Handle new message
    if (payload.new.sender_id !== currentUserId) {
      playNotificationSound()
      showBrowserNotification(...)
    }
  })
```

### Client-Side Hooks Pattern
Features are organized as custom React hooks:
- `useNotificationSound()` - Sound playback
- `useBrowserNotifications()` - Browser notification permissions
- `useWorkspaceMembers()` - Member data for mentions
- `useFileUpload()` - File upload state management
- `useTeamMessages()` - Message subscription and CRUD

This pattern keeps components clean and makes features reusable across different contexts.
