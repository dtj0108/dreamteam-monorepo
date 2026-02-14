import { ApiError, post } from "../api";

export type SupportRequestType = "bug" | "support";
export type SupportUrgency = "low" | "medium" | "high";

interface SubmitSupportRequestInput {
  type: SupportRequestType;
  subject: string;
  message: string;
  urgency: SupportUrgency;
}

interface SubmitSupportRequestResponse {
  success: boolean;
}

export async function submitSupportRequest(
  input: SubmitSupportRequestInput
): Promise<SubmitSupportRequestResponse> {
  try {
    return await post<SubmitSupportRequestResponse>("/api/support", {
      ...input,
      source: "user-mobile",
    });
  } catch (error) {
    // Backward compatibility: some deployed backends still only accept
    // "user-web" and "admin". Retry once with "user-web".
    if (
      error instanceof ApiError &&
      error.status === 400 &&
      /Invalid source/i.test(error.message)
    ) {
      return post<SubmitSupportRequestResponse>("/api/support", {
        ...input,
        source: "user-web",
      });
    }
    throw error;
  }
}
