import type { Metadata } from "next"
import { ContactContent } from "./contact-content"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the DreamTeam team. We'd love to hear from you.",
  openGraph: {
    title: "Contact | dreamteam.ai",
    description: "Get in touch with the DreamTeam team. We'd love to hear from you.",
    url: "https://dreamteam.ai/contact",
  },
}

export default function ContactPage() {
  return <ContactContent />
}
