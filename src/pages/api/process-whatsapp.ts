export const maxDuration = 45; // This function can run for a maximum of 45 seconds

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

// import type { NextApiRequest, NextApiResponse } from "next";
// import { OpenAI } from "openai";
// import type {
//   TranscriptionResponse,
//   WhatsAppTranscription,
// } from "@/types/whatsapp";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const SYSTEM_PROMPT = `You are a WhatsApp chat transcription and relationship communication analysis expert specializing in Non-Violent Communication (NVC).

// You will be provided with one or more screenshots from the same WhatsApp conversation, in chronological order. The person uploading these screenshots is ALWAYS the sender (messages aligned to the right).

// When analyzing the WhatsApp screenshots:

// 1. First, extract the name of the person or group from the chat header at the top of the first screenshot
// 2. For each message, identify:
//    - Right-aligned messages are from "Person 1" (the uploader/sender)
//    - Left-aligned messages are from "Person 2" (the chat partner/receiver)
// 3. Maintain chronological order across all screenshots
// 4. Ensure consistent participant identification across all screenshots
// 5. Analyze the communication patterns using NVC principles

// Return the data in the following JSON format:
// {
//   "chatName": "string", // Name from the WhatsApp chat header
//   "messages": [
//     {
//       "role": "Person 1" | "Person 2", // Person 1 is ALWAYS the uploader
//       "content": "string",
//       "timestamp": "string",
//       "alignment": "right" | "left" // right for Person 1 (uploader), left for Person 2
//     }
//   ],
//   "nvcAnalysis": {
//     "participantScores": {
//       "Person 1": { // The uploader
//         "score": number,
//         "explanation": "string"
//       },
//       "Person 2": { // The chat partner
//         "score": number,
//         "explanation": "string"
//       }
//     },
//     "messageRewrites": [
//       {
//         "original": "string",
//         "role": "Person 1" | "Person 2",
//         "rewritten": "string",
//         "explanation": "string"
//       }
//     ],
//     "relationshipDynamics": {
//       "powerDynamics": "string",
//       "tensionPoints": string[],
//       "positivePatterns": string[],
//       "suggestedImprovements": {
//         "Person 1": string[], // Improvements for the uploader
//         "Person 2": string[]  // Improvements for the chat partner
//       }
//     },
//     "overallAnalysis": "string"
//   }
// }

// Focus on:
// 1. Maintaining consistent participant identification (Person 1 is ALWAYS the uploader)
// 2. Creating a coherent conversation flow across all screenshots
// 3. Emotional triggers and escalation points
// 4. How well each person expresses needs and feelings
// 5. Use of observations vs. evaluations
// 6. Request clarity and response patterns
// 7. Power dynamics in the conversation
// 8. Patterns of defensive or aggressive communication

// For message rewrites:
// - Choose 3-4 key moments where better NVC could have changed the conversation direction
// - Provide alternatives that express feelings and needs clearly
// - Explain how the rewrite could have prevented escalation

// Score participants based on:
// - Expression of feelings and needs
// - Use of non-judgmental language
// - Ability to make clear requests
// - Empathetic responses to others
// - Handling of conflict or disagreement
// - Taking responsibility for own emotions
// - Ability to de-escalate tensions

// Maintain original formatting and emoji where possible.`;

// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: "10mb",
//     },
//   },
// };

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<TranscriptionResponse>
// ) {
//   if (req.method !== "POST") {
//     return res.status(405).json({
//       success: false,
//       error: "Method not allowed",
//     });
//   }

//   try {
//     const { imageUrls } = req.body;

//     if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: "At least one image URL is required",
//       });
//     }

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: SYSTEM_PROMPT,
//         },
//         {
//           role: "user",
//           content: [
//             {
//               type: "text",
//               text: "Please transcribe and analyze this WhatsApp conversation using NVC principles. The screenshots are in chronological order.",
//             },
//             ...imageUrls.map((url) => ({
//               type: "image_url",
//               image_url: {
//                 url,
//                 detail: "high",
//               },
//             })),
//           ],
//         },
//       ],
//       max_tokens: 4096,
//       temperature: 0.2,
//       response_format: { type: "json_object" },
//     });

//     if (!response.choices[0]?.message?.content) {
//       throw new Error("No content received from OpenAI");
//     }

//     const transcription = JSON.parse(
//       response.choices[0].message.content
//     ) as WhatsAppTranscription;

//     if (!transcription.chatName || !Array.isArray(transcription.messages)) {
//       throw new Error("Invalid response format from OpenAI");
//     }

//     return res.status(200).json({
//       success: true,
//       data: transcription,
//     });
//   } catch (error) {
//     console.error("Transcription error:", error);
//     return res.status(500).json({
//       success: false,
//       error:
//         error instanceof Error ? error.message : "An unknown error occurred",
//     });
//   }
// }

// // import type { NextApiRequest, NextApiResponse } from "next";
// // import { OpenAI } from "openai";
// // import type {
// //   TranscriptionResponse,
// //   WhatsAppTranscription,
// // } from "@/types/whatsapp";

// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// // });

// // const SYSTEM_PROMPT = `You are a WhatsApp chat transcription and relationship communication analysis expert specializing in Non-Violent Communication (NVC).

// // When analyzing a WhatsApp screenshot:

// // 1. First, extract the name of the person or group from the chat header at the top of the screenshot
// // 2. Identify messages based on their visual alignment:
// //    - Right-aligned messages are from "Person 1" (the user/sender)
// //    - Left-aligned messages are from "Person 2" (the chat partner/receiver)
// // 3. Analyze the communication patterns using NVC principles

// // Return the data in the following JSON format:
// // {
// //   "chatName": "string", // Name from the WhatsApp chat header
// //   "messages": [
// //     {
// //       "role": "Person 1" | "Person 2",
// //       "content": "string",
// //       "timestamp": "string",
// //       "alignment": "right" | "left"
// //     }
// //   ],
// //   "nvcAnalysis": {
// //     "participantScores": {
// //       "Person 1": {
// //         "score": number, // Score out of 100
// //         "explanation": "string" // Detailed explanation of communication patterns
// //       },
// //       "Person 2": {
// //         "score": number,
// //         "explanation": "string"
// //       }
// //     },
// //     "messageRewrites": [
// //       {
// //         "original": "string",
// //         "role": "Person 1" | "Person 2",
// //         "rewritten": "string",
// //         "explanation": "string"
// //       }
// //     ],
// //     "relationshipDynamics": {
// //       "powerDynamics": "string",
// //       "tensionPoints": string[],
// //       "positivePatterns": string[],
// //       "suggestedImprovements": {
// //         "Person 1": string[],
// //         "Person 2": string[]
// //       }
// //     },
// //     "overallAnalysis": "string"
// //   }
// // }

// // Focus on:
// // 1. Accurately extracting the chat partner's name from the header
// // 2. Emotional triggers and escalation points
// // 3. How well each person expresses needs and feelings
// // 4. Use of observations vs. evaluations
// // 5. Request clarity and response patterns
// // 6. Power dynamics in the conversation
// // 7. Patterns of defensive or aggressive communication

// // For message rewrites:
// // - Choose 3-4 key moments where better NVC could have changed the conversation direction
// // - Provide alternatives that express feelings and needs clearly
// // - Explain how the rewrite could have prevented escalation

// // Score participants based on:
// // - Expression of feelings and needs
// // - Use of non-judgmental language
// // - Ability to make clear requests
// // - Empathetic responses to others
// // - Handling of conflict or disagreement
// // - Taking responsibility for own emotions
// // - Ability to de-escalate tensions

// // Maintain original formatting and emoji where possible.`;

// // export const config = {
// //   api: {
// //     bodyParser: {
// //       sizeLimit: "10mb", // Adjust based on your needs
// //     },
// //   },
// // };

// // export default async function handler(
// //   req: NextApiRequest,
// //   res: NextApiResponse<TranscriptionResponse>
// // ) {
// //   if (req.method !== "POST") {
// //     return res.status(405).json({
// //       success: false,
// //       error: "Method not allowed",
// //     });
// //   }

// //   try {
// //     const { imageUrl } = req.body;

// //     if (!imageUrl) {
// //       return res.status(400).json({
// //         success: false,
// //         error: "Image URL is required",
// //       });
// //     }
// //     const response = await openai.chat.completions.create({
// //       model: "gpt-4o-mini", // Note: Updated to latest model
// //       messages: [
// //         {
// //           role: "system",
// //           content: SYSTEM_PROMPT,
// //         },
// //         {
// //           role: "user",
// //           content: [
// //             {
// //               type: "text",
// //               text: "Please transcribe and analyze this WhatsApp chat using NVC principles.",
// //             },
// //             {
// //               type: "image_url",
// //               image_url: {
// //                 url: imageUrl,
// //                 detail: "high",
// //               },
// //             },
// //           ],
// //         },
// //       ],
// //       max_tokens: 4096, // Increased for detailed analysis
// //       temperature: 0.2,
// //       response_format: { type: "json_object" },
// //     });

// //     // Check if we have a valid response
// //     if (!response.choices[0]?.message?.content) {
// //       throw new Error("No content received from OpenAI");
// //     }

// //     // Parse the response
// //     const transcription = JSON.parse(
// //       response.choices[0].message.content
// //     ) as WhatsAppTranscription;

// //     // Validate the response structure
// //     if (!transcription.chatName || !Array.isArray(transcription.messages)) {
// //       throw new Error("Invalid response format from OpenAI");
// //     }

// //     return res.status(200).json({
// //       success: true,
// //       data: transcription,
// //     });
// //   } catch (error) {
// //     console.error("Transcription error:", error);
// //     return res.status(500).json({
// //       success: false,
// //       error:
// //         error instanceof Error ? error.message : "An unknown error occurred",
// //     });
// //   }
// // }
