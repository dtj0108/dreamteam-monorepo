"use client"

import { useState } from "react"
import { Loader2, CheckCircle2, Mail } from "lucide-react"
import { Header } from "@/components/marketing/header-navigation/header"
import { Button } from "@/components/base/buttons/button"

type ContactReason = "general" | "sales" | "partnership" | "support"

const reasons: { value: ContactReason; label: string; emoji: string; description: string }[] = [
  { value: "general", label: "General Inquiry", emoji: "💬", description: "Just want to say hello" },
  { value: "sales", label: "Sales", emoji: "🤝", description: "Interested in DreamTeam for my business" },
  { value: "partnership", label: "Partnership", emoji: "🔗", description: "Explore working together" },
  { value: "support", label: "Support", emoji: "🛠", description: "Need help with something" },
]

export function ContactContent() {
  const [reason, setReason] = useState<ContactReason>("general")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) { setError("Please enter your name."); return }
    if (!email.trim()) { setError("Please enter your email."); return }
    if (!message.trim()) { setError("Please enter a message."); return }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          message: message.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send message")
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <Header />

      <div className="flex items-start justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-xl">
          {isSuccess ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-8 py-16 text-center shadow-sm">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-green-50 ring-1 ring-green-200">
                <CheckCircle2 className="size-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Message sent!</h1>
              <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-gray-500">
                Thanks for reaching out. We typically respond within 24 hours.
              </p>
              <Button href="/" color="secondary" className="mt-8">
                Back to Home
              </Button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                  <Mail className="size-3" />
                  Get in touch
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                  Contact us
                </h1>
                <p className="mt-2 text-[15px] text-gray-500">
                  Have a question, idea, or just want to chat? We&apos;d love to hear from you.
                </p>
              </div>

              {/* Form card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Reason */}
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 w-full text-center text-sm font-medium text-gray-700">Why are you reaching out?</legend>
                    <div className="grid grid-cols-2 gap-2.5">
                      {reasons.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setReason(r.value)}
                          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-left cursor-pointer transition-all ${
                            reason === r.value
                              ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{r.label}</p>
                            <p className="text-[11px] leading-snug text-gray-400">{r.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-name" className="text-sm font-medium text-gray-700">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-email" className="text-sm font-medium text-gray-700">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-company" className="text-sm font-medium text-gray-700">
                      Company <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="contact-company"
                      type="text"
                      placeholder="Your company name"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={isSubmitting}
                      className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-message" className="text-sm font-medium text-gray-700">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      placeholder="Tell us what's on your mind..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSubmitting}
                      rows={5}
                      className="resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
