// Supabase Edge Function: send-push-notification
// Sends push notifications to users via Expo Push API

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Expo Push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Notification types
type NotificationType = "channel_message" | "dm" | "mention";

// Notification payload from the database trigger or API call
interface NotificationPayload {
  type: NotificationType;
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  // For channel messages
  channelId?: string;
  channelName?: string;
  // For DMs
  dmConversationId?: string;
  // For mentions
  mentionedUserIds?: string[];
  // Recipients (if pre-specified, otherwise derived from type)
  recipientIds?: string[];
}

// Expo push message format
interface ExpoPushMessage {
  to: string;
  sound: "default" | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: "default" | "normal" | "high";
  channelId?: string;
}

// Expo push ticket response
interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: "DeviceNotRegistered" | "InvalidCredentials" | "MessageTooBig" | "MessageRateExceeded";
  };
}

// User push token from database
interface UserPushToken {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android";
}

// Create Supabase client with service role key for full access
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get push tokens for specific users
async function getTokensForUsers(
  supabase: ReturnType<typeof createClient>,
  userIds: string[]
): Promise<UserPushToken[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("user_push_tokens")
    .select("*")
    .in("user_id", userIds);

  if (error) {
    console.error("Error fetching push tokens:", error);
    return [];
  }

  return data || [];
}

// Get all channel members except the sender
async function getChannelMemberIds(
  supabase: ReturnType<typeof createClient>,
  channelId: string,
  excludeUserId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .neq("user_id", excludeUserId);

  if (error) {
    console.error("Error fetching channel members:", error);
    return [];
  }

  return (data || []).map((m) => m.user_id);
}

// Get the other participant in a DM conversation
async function getDmRecipientId(
  supabase: ReturnType<typeof createClient>,
  dmConversationId: string,
  excludeUserId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("dm_conversation_id", dmConversationId)
    .neq("user_id", excludeUserId)
    .single();

  if (error) {
    console.error("Error fetching DM recipient:", error);
    return null;
  }

  return data?.user_id || null;
}

// Build the notification title and body based on type
function buildNotificationContent(
  payload: NotificationPayload
): { title: string; body: string } {
  const senderName = payload.senderName || "Someone";
  const content =
    payload.content.length > 100
      ? payload.content.substring(0, 97) + "..."
      : payload.content;

  switch (payload.type) {
    case "channel_message":
      return {
        title: `#${payload.channelName || "channel"}`,
        body: `${senderName}: ${content}`,
      };

    case "dm":
      return {
        title: senderName,
        body: content,
      };

    case "mention":
      if (payload.channelId) {
        return {
          title: `Mentioned in #${payload.channelName || "channel"}`,
          body: `${senderName}: ${content}`,
        };
      } else {
        return {
          title: `${senderName} mentioned you`,
          body: content,
        };
      }

    default:
      return {
        title: "New message",
        body: content,
      };
  }
}

// Build the deep link data for the notification
function buildNotificationData(payload: NotificationPayload): Record<string, unknown> {
  const baseData: Record<string, unknown> = {
    messageId: payload.messageId,
    senderId: payload.senderId,
  };

  switch (payload.type) {
    case "channel_message":
      return {
        ...baseData,
        type: "message",
        channelId: payload.channelId,
      };

    case "dm":
      return {
        ...baseData,
        type: "dm",
        dmId: payload.dmConversationId,
      };

    case "mention":
      if (payload.channelId) {
        return {
          ...baseData,
          type: "mention",
          channelId: payload.channelId,
        };
      } else {
        return {
          ...baseData,
          type: "mention",
          dmId: payload.dmConversationId,
        };
      }

    default:
      return baseData;
  }
}

// Send notifications via Expo Push API
async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Expo Push API error:", errorText);
      return messages.map(() => ({
        status: "error" as const,
        message: `HTTP ${response.status}: ${errorText}`,
      }));
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Failed to send Expo push notifications:", error);
    return messages.map(() => ({
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

// Remove invalid tokens from the database
async function removeInvalidTokens(
  supabase: ReturnType<typeof createClient>,
  tokenIds: string[]
): Promise<void> {
  if (tokenIds.length === 0) return;

  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .in("id", tokenIds);

  if (error) {
    console.error("Error removing invalid tokens:", error);
  } else {
    console.log(`Removed ${tokenIds.length} invalid push tokens`);
  }
}

// Log notification results
async function logNotificationResults(
  supabase: ReturnType<typeof createClient>,
  payload: NotificationPayload,
  tokens: UserPushToken[],
  tickets: ExpoPushTicket[]
): Promise<void> {
  const logs = tokens.map((token, index) => {
    const ticket = tickets[index];
    let status: "sent" | "failed" | "no_token" = "sent";
    let errorMessage: string | null = null;

    if (!ticket || ticket.status === "error") {
      status = "failed";
      errorMessage = ticket?.message || "Unknown error";
    }

    return {
      message_id: payload.messageId,
      recipient_id: token.user_id,
      notification_type: payload.type,
      status,
      error_message: errorMessage,
    };
  });

  if (logs.length === 0) {
    // Log when no tokens were found
    logs.push({
      message_id: payload.messageId,
      recipient_id: null,
      notification_type: payload.type,
      status: "no_token" as const,
      error_message: "No push tokens found for recipients",
    });
  }

  const { error } = await supabase.from("notification_logs").insert(logs);

  if (error) {
    console.error("Error logging notifications:", error);
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const payload: NotificationPayload = await req.json();
    console.log("Received notification payload:", JSON.stringify(payload));

    // Validate required fields
    if (!payload.type || !payload.messageId || !payload.senderId || !payload.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, messageId, senderId, content" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createSupabaseClient();

    // Determine recipients based on notification type
    let recipientIds: string[] = payload.recipientIds || [];

    if (recipientIds.length === 0) {
      switch (payload.type) {
        case "channel_message":
          if (!payload.channelId) {
            return new Response(
              JSON.stringify({ error: "channelId required for channel_message type" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          recipientIds = await getChannelMemberIds(
            supabase,
            payload.channelId,
            payload.senderId
          );
          break;

        case "dm":
          if (!payload.dmConversationId) {
            return new Response(
              JSON.stringify({ error: "dmConversationId required for dm type" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          const dmRecipient = await getDmRecipientId(
            supabase,
            payload.dmConversationId,
            payload.senderId
          );
          if (dmRecipient) {
            recipientIds = [dmRecipient];
          }
          break;

        case "mention":
          if (payload.mentionedUserIds && payload.mentionedUserIds.length > 0) {
            // Filter out the sender from mentions
            recipientIds = payload.mentionedUserIds.filter(
              (id) => id !== payload.senderId
            );
          }
          break;
      }
    }

    console.log(`Recipients for ${payload.type}:`, recipientIds);

    if (recipientIds.length === 0) {
      console.log("No recipients found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No recipients" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get push tokens for all recipients
    const tokens = await getTokensForUsers(supabase, recipientIds);
    console.log(`Found ${tokens.length} push tokens for ${recipientIds.length} recipients`);

    if (tokens.length === 0) {
      // Log that no tokens were found
      await logNotificationResults(supabase, payload, [], []);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No push tokens found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build notification content
    const { title, body } = buildNotificationContent(payload);
    const data = buildNotificationData(payload);

    // Build Expo push messages
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token.token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      // Android notification channel
      channelId: "messages",
    }));

    // Send notifications
    const tickets = await sendExpoPushNotifications(messages);
    console.log("Push tickets:", JSON.stringify(tickets));

    // Handle invalid tokens (DeviceNotRegistered)
    const invalidTokenIds: string[] = [];
    tickets.forEach((ticket, index) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        invalidTokenIds.push(tokens[index].id);
      }
    });

    // Remove invalid tokens from database
    if (invalidTokenIds.length > 0) {
      await removeInvalidTokens(supabase, invalidTokenIds);
    }

    // Log results
    await logNotificationResults(supabase, payload, tokens, tickets);

    // Count successful sends
    const sentCount = tickets.filter((t) => t.status === "ok").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: tickets.length - sentCount,
        invalidTokensRemoved: invalidTokenIds.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
