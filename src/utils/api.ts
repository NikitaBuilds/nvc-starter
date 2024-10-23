import { TranscriptionResponse } from "@/types/whatsapp";

// Third file: ~/utils/api.ts
export async function transcribeWhatsAppImage(
  imageUrl: string
): Promise<TranscriptionResponse> {
  try {
    const response = await fetch("/api/transcribe-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to transcribe image",
    };
  }
}
