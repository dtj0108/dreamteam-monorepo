import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server"
import { decryptCRMToken } from "@/lib/crm-encryption"
import { SlackClient } from "@/lib/slack-client"
import type { SlackImportFilters, SlackImportResult, SlackUserMapping, SlackMessage } from "@/types/slack"

// POST /api/integrations/slack/import - Import channels and messages from Slack
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { workspaceId, channelIds, filters } = body as {
    workspaceId: string
    channelIds: string[]
    filters: SlackImportFilters
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  if (!channelIds || channelIds.length === 0) {
    return NextResponse.json({ error: "At least one channel must be selected" }, { status: 400 })
  }

  // Verify user is an admin or owner
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
  }

  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only admins can import data" },
      { status: 403 }
    )
  }

  // Get the integration
  const { data: integration, error: integrationError } = await supabase
    .from("slack_integrations")
    .select("id, encrypted_access_token, status")
    .eq("workspace_id", workspaceId)
    .single()

  if (integrationError || !integration) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 404 })
  }

  if (integration.status !== "active") {
    return NextResponse.json({ error: "Slack integration is not active" }, { status: 400 })
  }

  // Decrypt the token
  let token: string
  try {
    token = decryptCRMToken(integration.encrypted_access_token)
  } catch {
    return NextResponse.json({ error: "Failed to decrypt token" }, { status: 500 })
  }

  // Perform the import
  // Use admin client to bypass RLS for importing messages from other users
  const adminSupabase = createAdminClient()

  try {
    const client = new SlackClient(token)
    const result = await importFromSlack(
      adminSupabase,
      client,
      workspaceId,
      user.id,
      channelIds,
      filters
    )

    // Update last sync time
    await supabase
      .from("slack_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integration.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Slack import failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    )
  }
}

async function importFromSlack(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  client: SlackClient,
  workspaceId: string,
  userId: string,
  channelIds: string[],
  filters: SlackImportFilters
): Promise<SlackImportResult> {
  const result: SlackImportResult = {
    channelsImported: 0,
    messagesImported: 0,
    usersCreated: 0,
    errors: [],
  }

  // Step 1: Fetch Slack channels info
  console.log("Fetching Slack channels...")
  const allChannels = await client.getChannels()
  const channelsToImport = allChannels.filter((c) => channelIds.includes(c.id))

  // Step 2: For each channel, auto-join (if public) and fetch messages
  // Collect all user IDs we need from messages
  const channelMessages = new Map<string, SlackMessage[]>()
  const userIdsNeeded = new Set<string>()

  for (const slackChannel of channelsToImport) {
    try {
      console.log(`Processing channel: #${slackChannel.name}`)

      // Auto-join public channels (requires channels:join scope)
      if (!slackChannel.is_private) {
        try {
          console.log(`Auto-joining public channel #${slackChannel.name}...`)
          await client.joinChannel(slackChannel.id)
        } catch (joinError) {
          console.error(`Failed to auto-join #${slackChannel.name}:`, joinError)
          // Continue anyway - might already be a member
        }
      }

      // Fetch messages
      const oldest = SlackClient.getOldestTs(filters.dateRange || "all")
      const messages = await client.getMessages(slackChannel.id, {
        oldest,
        limit: filters.messageLimit,
      })

      console.log(`Fetched ${messages.length} messages from #${slackChannel.name}`)
      channelMessages.set(slackChannel.id, messages)

      // Collect user IDs and bot IDs from messages
      for (const msg of messages) {
        if (msg.user) {
          userIdsNeeded.add(msg.user)
        } else if (msg.bot_id) {
          // Bot messages - use bot_id as the identifier
          userIdsNeeded.add(msg.bot_id)
        }
      }

      // If including threads, we'll also need users from thread replies
      // We'll collect those later when fetching threads
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      // Handle "not_in_channel" error for private channels
      if (errorMsg.includes("not_in_channel")) {
        console.error(`Cannot access #${slackChannel.name} - bot not invited`)
        result.errors.push(
          `#${slackChannel.name}: Bot not invited. For private channels, invite the bot with /invite @YourAppName`
        )
      } else {
        console.error(`Error fetching messages from #${slackChannel.name}:`, error)
        result.errors.push(`Error accessing #${slackChannel.name}: ${errorMsg}`)
      }
      // Don't add this channel to channelMessages - we'll skip it
    }
  }

  // If no messages found in any channel, we're done
  if (userIdsNeeded.size === 0) {
    console.log("No messages found in selected channels")
    return result
  }

  console.log(`Found ${userIdsNeeded.size} unique users in messages`)

  // Step 3: Fetch only the users we need
  console.log("Fetching user details for message authors...")
  const slackUsers = await client.getUsersByIds([...userIdsNeeded])
  console.log(`Fetched ${slackUsers.length} user profiles`)

  // Step 4: Get existing DreamTeam profiles and create mapping
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, email, slack_user_id, first_name, last_name")

  const profilesByEmail = new Map<string, string>()
  const profilesBySlackId = new Map<string, string>()

  console.log(`Found ${existingProfiles?.length || 0} existing DreamTeam profiles`)

  existingProfiles?.forEach((profile) => {
    if (profile.email) {
      profilesByEmail.set(profile.email.toLowerCase(), profile.id)
      console.log(`  DreamTeam profile: ${profile.first_name} ${profile.last_name} <${profile.email}>`)
    }
    if (profile.slack_user_id) {
      profilesBySlackId.set(profile.slack_user_id, profile.id)
    }
  })

  // Create user mapping only for users who have messages
  const userMapping = new Map<string, SlackUserMapping>()

  console.log(`Processing ${slackUsers.length} Slack users for mapping...`)

  for (const slackUser of slackUsers) {
    const email = slackUser.profile?.email?.toLowerCase()
    const slackName = slackUser.profile?.display_name || slackUser.real_name || slackUser.name

    console.log(`  Slack user: ${slackName} (${slackUser.id}) email: ${email || "NO EMAIL"}`)

    // Check if already mapped by Slack ID
    if (profilesBySlackId.has(slackUser.id)) {
      console.log(`    -> Matched by Slack ID to existing profile`)
      userMapping.set(slackUser.id, {
        slackUserId: slackUser.id,
        slackUserName: slackName,
        slackEmail: email,
        dreamTeamProfileId: profilesBySlackId.get(slackUser.id)!,
        isPlaceholder: false,
      })
      continue
    }

    // Check if can match by email
    if (email && profilesByEmail.has(email)) {
      const profileId = profilesByEmail.get(email)!
      console.log(`    -> Matched by email to DreamTeam profile ${profileId}`)

      // Update the profile with slack_user_id
      await supabase
        .from("profiles")
        .update({ slack_user_id: slackUser.id })
        .eq("id", profileId)

      userMapping.set(slackUser.id, {
        slackUserId: slackUser.id,
        slackUserName: slackName,
        slackEmail: email,
        dreamTeamProfileId: profileId,
        isPlaceholder: false,
      })
      continue
    }

    console.log(`    -> No match found, will create placeholder`)

    // Create placeholder profile (only for users with messages)
    const displayName = slackUser.profile?.display_name || slackUser.real_name || slackUser.name || "Unknown User"

    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        name: displayName,
        avatar_url: slackUser.profile?.image_192 || slackUser.profile?.image_72,
        is_placeholder: true,
        slack_user_id: slackUser.id,
      })
      .select("id")
      .single()

    if (profileError) {
      console.error(`Failed to create placeholder for ${displayName}:`, profileError)
      result.errors.push(`Failed to create user: ${displayName}`)
      continue
    }

    result.usersCreated++
    userMapping.set(slackUser.id, {
      slackUserId: slackUser.id,
      slackUserName: displayName,
      slackEmail: email,
      dreamTeamProfileId: newProfile.id,
      isPlaceholder: true,
    })
  }

  // Step 4b: Create placeholders for users we couldn't fetch from Slack
  // (deleted users, bots, etc.)
  for (const slackUserId of userIdsNeeded) {
    // Skip if we already have a mapping (either from fetch or existing profile)
    if (userMapping.has(slackUserId)) continue
    if (profilesBySlackId.has(slackUserId)) {
      userMapping.set(slackUserId, {
        slackUserId,
        slackUserName: "Former User",
        slackEmail: undefined,
        dreamTeamProfileId: profilesBySlackId.get(slackUserId)!,
        isPlaceholder: false,
      })
      continue
    }

    // Create a placeholder for this unknown user
    console.log(`Creating placeholder for unfetchable Slack user: ${slackUserId}`)
    const placeholderName = slackUserId.startsWith('B')
      ? `Bot ${slackUserId.slice(-6)}`
      : slackUserId.startsWith('U')
        ? `User ${slackUserId.slice(-6)}`
        : `Unknown ${slackUserId.slice(-6)}`
    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        name: placeholderName,
        is_placeholder: true,
        slack_user_id: slackUserId,
      })
      .select("id")
      .single()

    if (profileError) {
      console.error(`Failed to create placeholder for unknown user ${slackUserId}:`, profileError)
      result.errors.push(`Failed to create placeholder for Slack user: ${slackUserId}`)
      continue
    }

    result.usersCreated++
    userMapping.set(slackUserId, {
      slackUserId,
      slackUserName: placeholderName,
      slackEmail: undefined,
      dreamTeamProfileId: newProfile.id,
      isPlaceholder: true,
    })
  }

  console.log(`User mapping complete: ${userMapping.size} users, ${result.usersCreated} placeholders created`)

  // Step 5: Import channels and messages
  for (const slackChannel of channelsToImport) {
    const messages = channelMessages.get(slackChannel.id)
    if (!messages || messages.length === 0) {
      // Skip channels we couldn't access or had no messages
      continue
    }

    try {
      console.log(`Importing channel: #${slackChannel.name}`)

      // Check if channel already exists
      const { data: existingChannel } = await supabase
        .from("channels")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("name", slackChannel.name)
        .single()

      let channelId: string

      if (existingChannel) {
        channelId = existingChannel.id
        console.log(`Channel #${slackChannel.name} already exists, adding messages`)
      } else {
        // Create channel
        const { data: newChannel, error: channelError } = await supabase
          .from("channels")
          .insert({
            workspace_id: workspaceId,
            name: slackChannel.name,
            description: slackChannel.topic?.value || slackChannel.purpose?.value || null,
            is_private: slackChannel.is_private,
            is_archived: slackChannel.is_archived,
            created_by: userId,
          })
          .select("id")
          .single()

        if (channelError) {
          console.error(`Failed to create channel #${slackChannel.name}:`, channelError)
          result.errors.push(`Failed to create channel: #${slackChannel.name}`)
          continue
        }

        channelId = newChannel.id
        result.channelsImported++
      }

      // Add current user as channel member if not already
      await supabase
        .from("channel_members")
        .upsert(
          {
            channel_id: channelId,
            profile_id: userId,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: "channel_id,profile_id" }
        )

      // Create mapping of Slack message ts to DreamTeam message id for threading
      const messageIdMapping = new Map<string, string>()

      // Sort messages by timestamp (oldest first for proper ordering)
      const sortedMessages = [...messages].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))

      // First pass: Import all parent messages (non-thread-replies)
      const parentMessages = sortedMessages.filter((m) => !m.thread_ts || m.thread_ts === m.ts)

      for (const msg of parentMessages) {
        // Get the sender ID - either user or bot_id
        const senderId = msg.user || msg.bot_id
        if (!senderId) continue // Skip system messages without user or bot

        const userMap = userMapping.get(senderId)
        if (!userMap) {
          console.log(`No user mapping for ${senderId}, skipping message: "${msg.text?.slice(0, 50)}..."`)
          continue
        }

        const content = SlackClient.transformMessageContent(msg)
        if (!content.trim()) continue // Skip empty messages

        const { data: newMessage, error: msgError } = await supabase
          .from("messages")
          .insert({
            workspace_id: workspaceId,
            channel_id: channelId,
            sender_id: userMap.dreamTeamProfileId,
            content,
            created_at: SlackClient.slackTsToDate(msg.ts),
          })
          .select("id")
          .single()

        if (msgError) {
          console.error("Failed to insert message:", msgError)
          continue
        }

        messageIdMapping.set(msg.ts, newMessage.id)
        result.messagesImported++
      }

      // Second pass: Import thread replies if enabled
      if (filters.includeThreads) {
        const parentMessagesWithReplies = parentMessages.filter(
          (m) => m.reply_count && m.reply_count > 0
        )

        for (const parentMsg of parentMessagesWithReplies) {
          const parentId = messageIdMapping.get(parentMsg.ts)
          if (!parentId) continue

          try {
            const replies = await client.getThreadReplies(slackChannel.id, parentMsg.ts)

            // Fetch any new users from thread replies (including bots)
            const threadSenderIds = replies
              .map((r) => r.user || r.bot_id)
              .filter((id): id is string => !!id && !userMapping.has(id))

            // Create placeholders for any new thread users we haven't seen
            for (const senderId of threadSenderIds) {
              if (userMapping.has(senderId)) continue

              // Try to fetch user info
              const threadUsers = await client.getUsersByIds([senderId])
              if (threadUsers.length > 0) {
                const slackUser = threadUsers[0]
                const displayName = slackUser.profile?.display_name || slackUser.real_name || slackUser.name || "Unknown"

                const { data: newProfile, error: profileError } = await supabase
                  .from("profiles")
                  .insert({
                    id: crypto.randomUUID(),
                    name: displayName,
                    avatar_url: slackUser.profile?.image_192 || slackUser.profile?.image_72,
                    is_placeholder: true,
                    slack_user_id: slackUser.id,
                  })
                  .select("id")
                  .single()

                if (!profileError && newProfile) {
                  result.usersCreated++
                  userMapping.set(slackUser.id, {
                    slackUserId: slackUser.id,
                    slackUserName: displayName,
                    slackEmail: slackUser.profile?.email?.toLowerCase(),
                    dreamTeamProfileId: newProfile.id,
                    isPlaceholder: true,
                  })
                }
              } else {
                // Create placeholder for unfetchable user (bot or deleted)
                const placeholderName = senderId.startsWith('B')
                  ? `Bot ${senderId.slice(-6)}`
                  : senderId.startsWith('U')
                    ? `User ${senderId.slice(-6)}`
                    : `Unknown ${senderId.slice(-6)}`
                const { data: newProfile, error: profileError } = await supabase
                  .from("profiles")
                  .insert({
                    id: crypto.randomUUID(),
                    name: placeholderName,
                    is_placeholder: true,
                    slack_user_id: senderId,
                  })
                  .select("id")
                  .single()

                if (!profileError && newProfile) {
                  result.usersCreated++
                  userMapping.set(senderId, {
                    slackUserId: senderId,
                    slackUserName: placeholderName,
                    slackEmail: undefined,
                    dreamTeamProfileId: newProfile.id,
                    isPlaceholder: true,
                  })
                }
              }
            }

            for (const reply of replies) {
              const replySenderId = reply.user || reply.bot_id
              if (!replySenderId) continue

              const userMap = userMapping.get(replySenderId)
              if (!userMap) continue

              const content = SlackClient.transformMessageContent(reply)
              if (!content.trim()) continue

              const { error: replyError } = await supabase.from("messages").insert({
                workspace_id: workspaceId,
                channel_id: channelId,
                sender_id: userMap.dreamTeamProfileId,
                parent_id: parentId,
                content,
                created_at: SlackClient.slackTsToDate(reply.ts),
              })

              if (!replyError) {
                result.messagesImported++
              }
            }
          } catch (error) {
            console.error(`Failed to fetch thread replies for ${parentMsg.ts}:`, error)
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log(`Completed importing #${slackChannel.name}`)
    } catch (error) {
      console.error(`Error importing channel ${slackChannel.name}:`, error)
      result.errors.push(`Error importing #${slackChannel.name}`)
    }
  }

  return result
}
