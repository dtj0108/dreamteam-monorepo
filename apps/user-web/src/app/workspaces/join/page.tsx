"use client"

import { Suspense, useState, useEffect, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Loader2, MailOpen, EyeIcon, EyeOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/providers/workspace-provider"

export default function JoinWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <JoinWorkspaceContent />
    </Suspense>
  )
}

function JoinWorkspaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshWorkspaces } = useWorkspace()
  const inviteId = searchParams.get("invite")
  const [isJoining, setIsJoining] = useState(false)
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [requiresAccountSwitch, setRequiresAccountSwitch] = useState(false)
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [isCreatingPassword, setIsCreatingPassword] = useState(false)

  const redirectToInviteUrl = inviteId ? `/workspaces/join?invite=${inviteId}` : "/workspaces/join"

  const handleSwitchAccount = async () => {
    setIsSwitchingAccount(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore logout failures and continue to login.
    } finally {
      router.push(`/login?redirectTo=${encodeURIComponent(redirectToInviteUrl)}`)
    }
  }

  const handleInviteSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFormMessage(null)

    if (!inviteId) {
      setFormMessage("Invite link is missing.")
      return
    }

    if (!password || !confirmPassword) {
      setFormMessage("Please enter and confirm your password.")
      return
    }

    if (password.length < 8) {
      setFormMessage("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setFormMessage("Passwords do not match.")
      return
    }

    setIsCreatingPassword(true)
    setIsRedirecting(false)
    setInfoMessage(null)

    try {
      const response = await fetch("/api/auth/invite-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, password }),
      })

      let data: { code?: string; error?: string } = {}
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try {
          data = await response.json()
        } catch {
          data = {}
        }
      }

      if (!response.ok) {
        if (data.code === "INVITE_ACCOUNT_EXISTS") {
          setFormMessage(
            data.error || "An account already exists for this invite email. Please sign in."
          )
          return
        }

        throw new Error(data.error || "Failed to create account from invite")
      }

      setIsRedirecting(true)
      setRequiresAuth(false)
      setInfoMessage("Redirecting you to your workspace...")
      await refreshWorkspaces()
      router.push("/")
    } catch (err) {
      setIsRedirecting(false)
      setError(
        err instanceof Error ? err.message : "Failed to create account from invite"
      )
    } finally {
      setIsCreatingPassword(false)
    }
  }

  useEffect(() => {
    if (!inviteId) return

    setIsJoining(true)
    setIsRedirecting(false)
    setRequiresAccountSwitch(false)
    setRequiresAuth(false)
    setError(null)
    setInfoMessage(null)
    setFormMessage(null)
    const join = async () => {
      try {
        const response = await fetch("/api/workspaces/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId }),
        })

        const contentType = response.headers.get("content-type") || ""
        const isJson = contentType.includes("application/json")
        const text = await response.text()

        if (!isJson) {
          if (response.status === 401 || response.url.includes("/login")) {
            setInfoMessage("Set your password to join your workspace.")
            setRequiresAuth(true)
            setIsJoining(false)
            return
          }
          throw new Error("Failed to process invite response. Please try again.")
        }

        let data: {
          error?: string
          code?: string
          inviteEmailMasked?: string
        }
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error("Failed to join workspace — please try again")
        }

        if (response.status === 401) {
          setInfoMessage("Set your password to join your workspace.")
          setRequiresAuth(true)
          setIsJoining(false)
          return
        }

        if (!response.ok) {
          if (data.code === "INVITE_EMAIL_MISMATCH") {
            const inviteHint = data.inviteEmailMasked
              ? ` Please sign in with ${data.inviteEmailMasked}.`
              : ""
            setError((data.error || "This invite was sent to a different email.") + inviteHint)
            setInfoMessage(null)
            setRequiresAccountSwitch(true)
            setIsJoining(false)
            return
          }

          throw new Error(data.error || "Failed to join workspace")
        }

        await refreshWorkspaces()
        router.push("/")
      } catch (err) {
        setInfoMessage(null)
        setError(err instanceof Error ? err.message : "Failed to join workspace")
        setIsJoining(false)
      }
    }

    join()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId, redirectToInviteUrl])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-6 text-primary" />
            </div>
            <CardTitle>Join a workspace</CardTitle>
            <CardDescription>
              {isRedirecting
                ? "Redirecting you to your workspace..."
                : isJoining
                ? "Joining workspace..."
                : requiresAuth
                  ? "Set your password to join"
                : error
                  ? "Something went wrong"
                  : "Check your email for an invite link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRedirecting ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Redirecting you to your workspace...</p>
              </div>
            ) : isJoining ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing your invite...</p>
              </div>
            ) : requiresAuth ? (
              <form className="w-full space-y-4" onSubmit={handleInviteSignup} noValidate>
                <p className="text-sm text-muted-foreground text-center">
                  {infoMessage || "Set a password for the invited email to create your account and join instantly."}
                </p>
                {formMessage ? (
                  <p className="text-sm text-destructive text-center" role="alert">{formMessage}</p>
                ) : null}
                {error ? (
                  <p className="text-sm text-destructive text-center">{error}</p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="invite-password"
                      type={isPasswordVisible ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setFormMessage(null)
                      }}
                      autoComplete="new-password"
                      className="pr-9"
                      disabled={isCreatingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsPasswordVisible((value) => !value)}
                      className="absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
                      disabled={isCreatingPassword}
                    >
                      {isPasswordVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      <span className="sr-only">{isPasswordVisible ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-confirm-password">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="invite-confirm-password"
                      type={isConfirmPasswordVisible ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        setFormMessage(null)
                      }}
                      autoComplete="new-password"
                      className="pr-9"
                      disabled={isCreatingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsConfirmPasswordVisible((value) => !value)}
                      className="absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
                      disabled={isCreatingPassword}
                    >
                      {isConfirmPasswordVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      <span className="sr-only">{isConfirmPasswordVisible ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isCreatingPassword}>
                  {isCreatingPassword ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    "Create password and join"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(redirectToInviteUrl)}`)}
                  disabled={isCreatingPassword}
                >
                  Sign in instead
                </Button>
              </form>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-sm text-destructive text-center">{error}</p>
                <div className="flex justify-center">
                  {requiresAccountSwitch ? (
                    <Button onClick={handleSwitchAccount} disabled={isSwitchingAccount}>
                      {isSwitchingAccount ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Switching...
                        </>
                      ) : (
                        "Switch account"
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => router.push("/")}>
                      Back to home
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <MailOpen className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Ask your team admin to send you an invite. You'll receive an email with a link to join.
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an invite?{" "}
                <Link href="/workspaces/new" className="text-primary hover:underline">
                  Create a new workspace
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
