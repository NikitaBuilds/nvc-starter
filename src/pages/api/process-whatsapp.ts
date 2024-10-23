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

When analyzing a WhatsApp screenshot:

1. First, extract the name of the person or group from the chat header at the top of the screenshot
2. Identify messages based on their visual alignment:
   - Right-aligned messages are from "Person 1" (the user/sender)
   - Left-aligned messages are from "Person 2" (the chat partner/receiver)
3. Analyze the communication patterns using NVC principles

Return the data in the following JSON format:
{
  "chatName": "string", // Name from the WhatsApp chat header
  "messages": [
    {
      "role": "Person 1" | "Person 2",
      "content": "string",
      "timestamp": "string",
      "alignment": "right" | "left"
    }
  ],
  "nvcAnalysis": {
    "participantScores": {
      "Person 1": {
        "score": number, // Score out of 100
        "explanation": "string" // Detailed explanation of communication patterns
      },
      "Person 2": {
        "score": number,
        "explanation": "string"
      }
    },
    "messageRewrites": [
      {
        "original": "string",
        "role": "Person 1" | "Person 2",
        "rewritten": "string",
        "explanation": "string"
      }
    ],
    "relationshipDynamics": {
      "powerDynamics": "string",
      "tensionPoints": string[],
      "positivePatterns": string[],
      "suggestedImprovements": {
        "Person 1": string[],
        "Person 2": string[]
      }
    },
    "overallAnalysis": "string"
  }
}

Focus on:
1. Accurately extracting the chat partner's name from the header
2. Emotional triggers and escalation points
3. How well each person expresses needs and feelings
4. Use of observations vs. evaluations
5. Request clarity and response patterns
6. Power dynamics in the conversation
7. Patterns of defensive or aggressive communication

For message rewrites:
- Choose 3-4 key moments where better NVC could have changed the conversation direction
- Provide alternatives that express feelings and needs clearly
- Explain how the rewrite could have prevented escalation

Score participants based on:
- Expression of feelings and needs
- Use of non-judgmental language
- Ability to make clear requests
- Empathetic responses to others
- Handling of conflict or disagreement
- Taking responsibility for own emotions
- Ability to de-escalate tensions

Maintain original formatting and emoji where possible.`;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Adjust based on your needs
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
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "Image URL is required",
      });
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Note: Updated to latest model
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
              text: "Please transcribe and analyze this WhatsApp chat using NVC principles.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4096, // Increased for detailed analysis
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Check if we have a valid response
    if (!response.choices[0]?.message?.content) {
      throw new Error("No content received from OpenAI");
    }

    // Parse the response
    const transcription = JSON.parse(
      response.choices[0].message.content
    ) as WhatsAppTranscription;

    // Validate the response structure
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
