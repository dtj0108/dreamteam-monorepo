import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient, createServerSupabaseClient } from "@dreamteam/database/server"

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const deriveNameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? ""
  const cleaned = localPart.replace(/[._-]+/g, " ").trim()
  if (!cleaned) return "New Member"

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 80)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inviteId = typeof body.inviteId === "string" ? body.inviteId : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const admin = createAdminClient()

    const { data: invite, error: inviteError } = await admin
      .from("pending_invites")
      .select("id, workspace_id, email, role, expires_at")
      .eq("id", inviteId)
      .is("accepted_at", null)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 400 }
      )
    }

    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json(
        {
          code: "INVITE_EXPIRED",
          error: "This invite has expired. Ask your team admin to send a new invite.",
        },
        { status: 410 }
      )
    }

    const invitedEmail = invite.email ? normalizeEmail(invite.email) : ""
    if (!invitedEmail) {
      return NextResponse.json(
        { error: "Invite does not have a valid email address." },
        { status: 400 }
      )
    }

    const defaultName = deriveNameFromEmail(invitedEmail)

    const signInWithInvitePassword = async () => {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitedEmail,
        password,
      })

      if (signInError || !signInData.user) {
        return null
      }

      return signInData.user
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: invitedEmail,
      password,
      options: {
        data: {
          name: defaultName,
          phone: "",
        },
        emailRedirectTo: undefined,
      },
    })

    let authUser = authData.user
    let usedExistingAccount = false

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        const existingUser = await signInWithInvitePassword()
        if (!existingUser) {
          return NextResponse.json(
            {
              code: "INVITE_ACCOUNT_EXISTS",
              error: "An account already exists for this invite email. Please sign in.",
            },
            { status: 409 }
          )
        }

        authUser = existingUser
        usedExistingAccount = true
      } else {
        return NextResponse.json({ error: signUpError.message }, { status: 400 })
      }
    } else if (!authUser) {
      // Some providers obfuscate existing accounts by returning no user.
      // Try signing in with the invite password before failing hard.
      const existingUser = await signInWithInvitePassword()
      if (!existingUser) {
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
      }
      authUser = existingUser
      usedExistingAccount = true
    }

    if (!authUser) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    const role = invite.role === "admin" ? "admin" : "member"

    if (usedExistingAccount) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", authUser.id)
        .single()

      if (!existingProfile) {
        await admin
          .from("profiles")
          .upsert(
            {
              id: authUser.id,
              email: invitedEmail,
              name: defaultName,
              phone: "",
              company_name: null,
              phone_verified: false,
              pending_2fa: false,
              onboarding_completed: true,
              role,
              default_workspace_id: invite.workspace_id,
            },
            { onConflict: "id" }
          )
      } else {
        await admin
          .from("profiles")
          .update({
            onboarding_completed: true,
            default_workspace_id: invite.workspace_id,
          })
          .eq("id", authUser.id)
      }
    } else {
      await admin
        .from("profiles")
        .upsert(
          {
            id: authUser.id,
            email: invitedEmail,
            name: defaultName,
            phone: "",
            company_name: null,
            phone_verified: false,
            pending_2fa: false,
            onboarding_completed: true,
            role,
            default_workspace_id: invite.workspace_id,
          },
          { onConflict: "id" }
        )
    }

    const { data: existingMembership } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("profile_id", authUser.id)
      .single()

    if (!existingMembership) {
      const { error: memberError } = await admin
        .from("workspace_members")
        .insert({
          workspace_id: invite.workspace_id,
          profile_id: authUser.id,
          role,
        })

      if (memberError) {
        console.error("Error creating workspace membership during invite signup:", memberError)
        return NextResponse.json({ error: "Failed to join workspace" }, { status: 500 })
      }
    }

    await admin
      .from("pending_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)

    if (!usedExistingAccount) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitedEmail,
        password,
      })

      if (signInError) {
        // If sign-in failed but the user is already in session from signUp, continue.
        const { data: currentAuthData } = await supabase.auth.getUser()
        if (currentAuthData.user?.id !== authUser.id) {
          console.error("Error signing in new invite user:", signInError)
          return NextResponse.json(
            { error: "Account created but failed to sign in. Please sign in manually." },
            { status: 500 }
          )
        }
      }
    }

    const cookieStore = await cookies()
    cookieStore.set("current_workspace_id", invite.workspace_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return NextResponse.json({
      success: true,
      workspaceId: invite.workspace_id,
    })
  } catch (error) {
    console.error("Error in POST /api/auth/invite-signup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
