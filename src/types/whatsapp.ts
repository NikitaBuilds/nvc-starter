export interface WhatsAppMessage {
  role: "Person 1" | "Person 2";
  content: string;
  timestamp: string;
  alignment: "right" | "left";
}

export interface NVCScore {
  score: number;
  explanation: string;
  strengthAreas: string[];
  improvementAreas: string[];
}

export interface MessageRewrite {
  original: string;
  role: "Person 1" | "Person 2";
  rewritten: string;
  explanation: string;
  context: string;
  impact: string;
}

export interface ConversationStyle {
  typicalPatterns: string[];
  emotionalTriggers: string[];
  copingMechanisms: string[];
}

export interface RelationshipDynamics {
  powerDynamics: string;
  tensionPoints: string[];
  positivePatterns: string[];
  conversationStyle: {
    "Person 1": ConversationStyle;
    "Person 2": ConversationStyle;
  };
  suggestedImprovements: {
    "Person 1": string[];
    "Person 2": string[];
    mutual: string[];
  };
}

export interface NVCAnalysis {
  participantScores: {
    "Person 1": NVCScore;
    "Person 2": NVCScore;
  };
  messageRewrites: MessageRewrite[];
  relationshipDynamics: RelationshipDynamics;
  overallAnalysis: string;
}

export interface WhatsAppTranscription {
  chatName: string;
  messages: WhatsAppMessage[];
  nvcAnalysis: NVCAnalysis;
}

export interface TranscriptionResponse {
  success: boolean;
  data?: WhatsAppTranscription;
  error?: string;
}

// // @types/whatsapp.ts

// export interface WhatsAppMessage {
//   role: "Person 1" | "Person 2";
//   content: string;
//   timestamp: string;
//   alignment: "right" | "left";
// }

// export interface NVCScore {
//   score: number;
//   explanation: string;
// }

// export interface MessageRewrite {
//   original: string;
//   role: "Person 1" | "Person 2";
//   rewritten: string;
//   explanation: string;
// }

// export interface RelationshipDynamics {
//   powerDynamics: string;
//   tensionPoints: string[];
//   positivePatterns: string[];
//   suggestedImprovements: {
//     "Person 1": string[];
//     "Person 2": string[];
//   };
// }

// export interface NVCAnalysis {
//   participantScores: {
//     "Person 1": NVCScore;
//     "Person 2": NVCScore;
//   };
//   messageRewrites: MessageRewrite[];
//   relationshipDynamics: RelationshipDynamics;
//   overallAnalysis: string;
// }

// export interface WhatsAppTranscription {
//   chatName: string; // Name from the WhatsApp header
//   messages: WhatsAppMessage[];
//   nvcAnalysis: NVCAnalysis;
// }

// export interface TranscriptionResponse {
//   success: boolean;
//   data?: WhatsAppTranscription;
//   error?: string;
// }
