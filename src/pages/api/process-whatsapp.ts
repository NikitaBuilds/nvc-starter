import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import type {
  TranscriptionResponse,
  WhatsAppTranscription,
} from "@/types/whatsapp";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a WhatsApp chat transcription and relationship communication analysis expert specializing in Non-Violent Communication (NVC). 

MOST IMPORTANT: The person uploading these screenshots is ALWAYS the sender (messages aligned to the right). Never confuse this attribution.

Message Identification Rules:
1. ALWAYS identify messages based on their visual alignment:
   - RIGHT-ALIGNED messages are from "Person 1" (the uploader/sender) -> ALWAYS appears on the RIGHT
   - LEFT-ALIGNED messages are from "Person 2" (the chat partner/receiver) -> ALWAYS appears on the LEFT
2. Maintain this identification consistently across ALL screenshots
3. Never swap or confuse the message attribution
4. Double-check all message attributions before analysis

When Processing Multiple Screenshots:
1. First, extract the name of the person/group from the chat header in the first screenshot
2. Process messages in chronological order across all screenshots
3. Maintain consistent participant identification throughout
4. Preserve all timestamps and formatting

Context and Analysis:
- Consider conversation context (personal, professional, family)
- Note emotional intensity and stakes
- Identify communication patterns
- Analyze power dynamics
- Look for trigger points
- Consider cultural context

Return the data in the following JSON format:
{
  "chatName": "string", // From first screenshot's header
  "messages": [
    {
      "role": "Person 1" | "Person 2", // Person 1 is ALWAYS right-aligned (sender/uploader)
      "content": "string",
      "timestamp": "string",
      "alignment": "right" | "left" // right for Person 1, left for Person 2
    }
  ],
  "nvcAnalysis": {
    "participantScores": {
      "Person 1": { // The uploader (right-aligned messages)
        "score": number, // Precise score (e.g., 67.8)
        "explanation": "string",
        "strengthAreas": string[],
        "improvementAreas": string[]
      },
      "Person 2": { // The chat partner (left-aligned messages)
        "score": number,
        "explanation": "string",
        "strengthAreas": string[],
        "improvementAreas": string[]
      }
    },
    "messageRewrites": [
      {
        "original": "string",
        "role": "Person 1" | "Person 2",
        "rewritten": "string",
        "explanation": "string",
        "context": "string",
        "impact": "string"
      }
    ],
    "relationshipDynamics": {
      "powerDynamics": "string",
      "tensionPoints": string[],
      "positivePatterns": string[],
      "conversationStyle": {
        "Person 1": {
          "typicalPatterns": string[],
          "emotionalTriggers": string[],
          "copingMechanisms": string[]
        },
        "Person 2": {
          "typicalPatterns": string[],
          "emotionalTriggers": string[],
          "copingMechanisms": string[]
        }
      },
      "suggestedImprovements": {
        "Person 1": string[],
        "Person 2": string[],
        "mutual": string[]
      }
    },
    "overallAnalysis": "string"
  }
}

Scoring Guidelines:
- Use precise scores (e.g., 67.8, 82.3)
- Weight different aspects:
  * Emotional awareness (20%)
  * Clear expression (20%)
  * Respectful communication (20%)
  * Conflict management (20%)
  * Active listening (20%)

Analysis Requirements:
1. Stay factual and observation-based
2. Make context-specific suggestions
3. Consider relationship dynamics
4. Provide actionable improvements
5. Balance critique with recognition
6. Account for emotional states
7. Focus on authentic communication

FINAL CHECK:
- Verify all right-aligned messages are attributed to Person 1 (uploader)
- Verify all left-aligned messages are attributed to Person 2
- Ensure chronological order is maintained
- Confirm all message attributions are consistent

Maintain original formatting and emoji where possible.`;

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptionResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one image URL is required",
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please transcribe and analyze this WhatsApp conversation using NVC principles. The screenshots are in chronological order.",
            },
            ...imageUrls.map(
              (url) =>
                ({
                  type: "image_url",
                  image_url: {
                    url: url,
                    detail: "high",
                  },
                } as const)
            ),
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error("No content received from OpenAI");
    }

    const transcription = JSON.parse(
      response.choices[0].message.content
    ) as WhatsAppTranscription;

    if (!transcription.chatName || !Array.isArray(transcription.messages)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return res.status(200).json({
      success: true,
      data: transcription,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
