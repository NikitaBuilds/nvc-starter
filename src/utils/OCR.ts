// import { JimpClass } from "@jimp/types";
// import { Jimp, JimpMime } from "jimp";
// import { createWorker } from "tesseract.js";
// import { clone, intToRGBA } from "@jimp/utils";

// // Core interfaces
// export interface Message {
//   time: Date | null;
//   body: string;
//   isReceiver: boolean;
// }

// interface HeaderInfo {
//   height: number;
//   profilePicX: number;
//   profilePicY: number;
//   nameX: number;
//   nameWidth: number;
// }

// interface MessageBubble {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   isReceiver: boolean;
//   color: string; // Hex color of the bubble
//   text: string;
//   timestamp: string | null;
// }

// // Dynamic detection helpers
// async function detectHeader(image: JimpClass): Promise<HeaderInfo> {
//   console.log("Detecting header region...");

//   // Start with a reasonable minimum header height
//   const minHeaderHeight = Math.floor(image.bitmap.height * 0.05); // 5% of image height
//   const maxHeaderHeight = Math.floor(image.bitmap.height * 0.15); // 15% of image height

//   let headerHeight = 0;
//   let profileFound = false;
//   let nameRegionFound = false;

//   // Scan for the dark header region
//   for (let y = 0; y < maxHeaderHeight; y++) {
//     let darkPixelCount = 0;
//     for (let x = 0; x < image.bitmap.width; x++) {
//       const pixel = image.getPixelColor(x, y);
//       const { r, g, b } = intToRGBA(pixel);
//       // Check for dark header background
//       if (r < 50 && g < 50 && b < 50) {
//         darkPixelCount++;
//       }
//     }

//     // If we find a row that's mostly dark, it's part of the header
//     if (darkPixelCount > image.bitmap.width * 0.8) {
//       headerHeight = Math.max(y + 1, minHeaderHeight);
//     }
//   }

//   // Default values in case detection fails
//   const headerInfo: HeaderInfo = {
//     height: headerHeight || Math.floor(image.bitmap.height * 0.1),
//     profilePicX: 20,
//     profilePicY: Math.floor(headerHeight * 0.2),
//     nameX: 70,
//     nameWidth: 200,
//   };

//   console.log("Detected header info:", headerInfo);
//   return headerInfo;
// }

// async function findMessageBubbles(
//   image: JimpClass,
//   headerInfo: HeaderInfo
// ): Promise<MessageBubble[]> {
//   console.log("Finding message bubbles...");

//   const bubbles: MessageBubble[] = [];
//   const { height, width } = image.bitmap;

//   // Color detection thresholds for WhatsApp bubbles
//   const greenBubbleColor = { r: 18, g: 140, b: 126 }; // WhatsApp green
//   const grayBubbleColor = { r: 50, g: 50, b: 50 }; // WhatsApp gray

//   let currentBubble: Partial<MessageBubble> | null = null;
//   let currentColor: string | null = null;

//   for (let y = headerInfo.height; y < height; y++) {
//     let rowStart = -1;
//     let rowEnd = -1;
//     let isGreen = false;
//     let isGray = false;

//     // Scan each row for bubble colors
//     for (let x = 0; x < width; x++) {
//       const pixel = image.getPixelColor(x, y);
//       const { r, g, b } = intToRGBA(pixel);

//       // Check if pixel matches bubble colors
//       const matchesGreen =
//         Math.abs(r - greenBubbleColor.r) < 30 &&
//         Math.abs(g - greenBubbleColor.g) < 30 &&
//         Math.abs(b - greenBubbleColor.b) < 30;

//       const matchesGray =
//         Math.abs(r - grayBubbleColor.r) < 30 &&
//         Math.abs(g - grayBubbleColor.g) < 30 &&
//         Math.abs(b - grayBubbleColor.b) < 30;

//       if (matchesGreen || matchesGray) {
//         if (rowStart === -1) {
//           rowStart = x;
//           isGreen = matchesGreen;
//           isGray = matchesGray;
//         }
//         rowEnd = x;
//       }
//     }

//     // Process found row segment
//     if (rowStart !== -1) {
//       const bubbleColor = isGreen ? "#128C7E" : "#323232";

//       if (!currentBubble || currentColor !== bubbleColor) {
//         // Start new bubble
//         if (currentBubble) {
//           bubbles.push(currentBubble as MessageBubble);
//         }
//         currentBubble = {
//           x: rowStart,
//           y,
//           width: rowEnd - rowStart,
//           height: 1,
//           isReceiver: isGreen,
//           color: bubbleColor,
//           text: "",
//           timestamp: null,
//         };
//         currentColor = bubbleColor;
//       } else {
//         // Extend current bubble
//         currentBubble.width = Math.max(currentBubble.width!, rowEnd - rowStart);
//         currentBubble.height! += 1;
//       }
//     } else if (currentBubble) {
//       // End current bubble if we have a gap
//       bubbles.push(currentBubble as MessageBubble);
//       currentBubble = null;
//       currentColor = null;
//     }
//   }

//   // Add final bubble if exists
//   if (currentBubble) {
//     bubbles.push(currentBubble as MessageBubble);
//   }

//   console.log(`Found ${bubbles.length} potential message bubbles`);
//   return bubbles;
// }

// async function extractMessageContent(
//   image: JimpClass,
//   bubble: MessageBubble
// ): Promise<void> {
//   console.log("Extracting content for bubble at", { x: bubble.x, y: bubble.y });

//   // Add padding to ensure we capture the full text
//   const padding = 10;
//   const cropRegion = {
//     x: Math.max(0, bubble.x - padding),
//     y: Math.max(0, bubble.y - padding),
//     w: Math.min(bubble.width + padding * 2, image.bitmap.width - bubble.x),
//     h: Math.min(bubble.height + padding * 2, image.bitmap.height - bubble.y),
//   };

//   const bubbleImage = clone(image).crop(cropRegion);

//   // Enhance image for OCR
//   bubbleImage.greyscale().contrast(0.7).normalize();

//   const worker = await createWorker();
//   try {
//     await worker.setParameters({
//       tessedit_char_whitelist:
//         "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:.,'\"?!@#$%&*()-+=<>/ ",
//       preserve_interword_spaces: "1",
//     });

//     const result = await worker.recognize(
//       await bubbleImage.getBuffer(JimpMime.png)
//     );

//     // Extract timestamp and message content
//     const lines = result.data.text
//       .split("\n")
//       .map((line) => line.trim())
//       .filter((line) => line);

//     // Look for timestamp pattern in each line
//     const timestampPattern = /(\d{1,2}):(\d{2})(?:\s*(?:AM|PM|am|pm))?/;
//     let messageContent: string[] = [];
//     let timestamp: string | null = null;

//     for (const line of lines) {
//       const timeMatch = line.match(timestampPattern);
//       if (timeMatch && !timestamp) {
//         timestamp = timeMatch[0];
//       } else if (line.length > 0) {
//         messageContent.push(line);
//       }
//     }

//     bubble.text = cleanMessageText(messageContent.join(" "));
//     bubble.timestamp = timestamp;

//     console.log("Extracted content:", {
//       text: bubble.text,
//       timestamp: bubble.timestamp,
//     });
//   } finally {
//     await worker.terminate();
//   }
// }

// function cleanMessageText(text: string): string {
//   console.log("Cleaning text:", text);

//   // Remove UI elements and common OCR artifacts
//   const cleaned = text
//     .replace(/^[▪■●\s]+/, "") // Remove bullets
//     .replace(/✓+/g, "") // Remove checkmarks
//     .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
//     .replace(/(?:\d{1,2}G|5G)\s*$/, "") // Remove network indicators
//     .replace(/^\d+:\d+(?:\s*(?:AM|PM))?\s*/i, "") // Remove timestamps
//     .replace(/\s+/g, " ") // Normalize spaces
//     .split("\n")
//     .map((line) => line.trim())
//     .filter((line) => {
//       // Filter out common UI elements and artifacts
//       const unwantedPatterns = [
//         /^(?:AM|PM)$/i,
//         /^\d+%$/,
//         /^(?:Back|Menu|More)$/i,
//         /^[0-9.]+$/,
//         /^\W+$/,
//         /^(?:Sent|Delivered|Read)$/i,
//       ];
//       return !unwantedPatterns.some((pattern) => pattern.test(line));
//     })
//     .join(" ")
//     .trim();

//   console.log("Cleaned result:", cleaned);
//   return cleaned;
// }

// function parseDateTime(timeStr: string | null): Date | null {
//   if (!timeStr) return null;

//   console.log("Parsing datetime:", timeStr);
//   try {
//     // Handle various time formats
//     const match = timeStr.match(/(\d{1,2})[:.]\s*(\d{2})\s*((?:AM|PM|am|pm)?)/);
//     if (!match) return null;

//     let [_, hours, minutes, meridiem] = match;
//     let hour = parseInt(hours);
//     const minute = parseInt(minutes);

//     if (minute < 0 || minute > 59) return null;

//     // Handle 12/24 hour format
//     if (meridiem) {
//       meridiem = meridiem.toLowerCase();
//       if (meridiem === "pm" && hour !== 12) hour += 12;
//       else if (meridiem === "am" && hour === 12) hour = 0;
//     }

//     const now = new Date();
//     const date = new Date(
//       now.getFullYear(),
//       now.getMonth(),
//       now.getDate(),
//       hour,
//       minute
//     );
//     console.log("Parsed datetime:", date);
//     return date;
//   } catch (error) {
//     console.error("Error parsing datetime:", error);
//     return null;
//   }
// }

// export async function processWhatsAppScreenshot(
//   file: File
// ): Promise<Message[]> {
//   console.log("Starting WhatsApp screenshot processing...");
//   try {
//     // Load and prepare image
//     const imageBuffer = await file.arrayBuffer();
//     const image = await Jimp.read(Buffer.from(imageBuffer));
//     console.log("Image loaded:", {
//       width: image.bitmap.width,
//       height: image.bitmap.height,
//     });

//     // Detect header region
//     const headerInfo = await detectHeader(image);
//     console.log("Header detected:", headerInfo);

//     // Find message bubbles
//     const bubbles = await findMessageBubbles(image, headerInfo);
//     console.log(`Found ${bubbles.length} message bubbles`);

//     // Extract content for each bubble
//     for (const bubble of bubbles) {
//       await extractMessageContent(image, bubble);
//     }

//     // Convert bubbles to messages
//     const messages: Message[] = bubbles
//       .filter((bubble) => bubble.text && bubble.text.length > 0)
//       .map((bubble) => ({
//         time: parseDateTime(bubble.timestamp),
//         body: bubble.text,
//         isReceiver: bubble.isReceiver,
//       }))
//       .filter(
//         (message) =>
//           message.body.length > 0 &&
//           message.body.length < 1000 &&
//           message.body !== "null" &&
//           message.body !== "undefined"
//       );

//     // Sort messages by time
//     messages.sort((a, b) => {
//       if (!a.time || !b.time) return 0;
//       return a.time.getTime() - b.time.getTime();
//     });

//     console.log(`Successfully processed ${messages.length} messages`);
//     return messages;
//   } catch (error) {
//     console.error("Error processing screenshot:", error);
//     throw error;
//   }
// }

// // // Debug helper function
// // function logImageStats(image: JimpClass, label: string) {
// //   console.log(`Image stats for ${label}:`, {
// //     width: image.bitmap.width,
// //     height: image.bitmap.height,
// //     hasAlpha: image.hasAlpha(),
// //     colorType: image.getColorType(),
// //     pixelColor: {
// //       topLeft: image.getPixelColor(0, 0),
// //       center: image.getPixelColor(
// //         Math.floor(image.bitmap.width / 2),
// //         Math.floor(image.bitmap.height / 2)
// //       ),
// //       bottomRight: image.getPixelColor(
// //         image.bitmap.width - 1,
// //         image.bitmap.height - 1
// //       ),
// //     },
// //   });
// // }

// // import { JimpClass } from "@jimp/types";
// // import { Jimp, JimpMime } from "jimp";
// // import { createWorker } from "tesseract.js";

// // export interface Message {
// //   time: Date | null;
// //   body: string;
// //   isReceiver: boolean;
// // }

// // interface MessageBlock {
// //   y: number;
// //   height: number;
// //   color: number;
// // }

// // async function detectMessageBlocks(image: JimpClass): Promise<MessageBlock[]> {
// //   console.log("Starting message block detection...");
// //   const blocks: MessageBlock[] = [];
// //   let currentBlock: MessageBlock | null = null;
// //   const backgroundPixel = image.getPixelColor(0, 0);

// //   try {
// //     for (let y = 0; y < image.bitmap.height; y++) {
// //       let hasContent = false;
// //       let dominantColor = backgroundPixel;
// //       let colorCounts: Record<number, number> = {};

// //       for (let x = 0; x < image.bitmap.width; x++) {
// //         const pixel = image.getPixelColor(x, y);
// //         if (pixel !== backgroundPixel) {
// //           hasContent = true;
// //           colorCounts[pixel] = (colorCounts[pixel] || 0) + 1;
// //         }
// //       }

// //       if (Object.keys(colorCounts).length > 0) {
// //         dominantColor = parseInt(
// //           Object.entries(colorCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
// //         );
// //       }

// //       if (hasContent) {
// //         if (!currentBlock) {
// //           currentBlock = {
// //             y,
// //             height: 1,
// //             color: dominantColor,
// //           };
// //         } else {
// //           currentBlock.height++;
// //         }
// //       } else if (currentBlock) {
// //         if (currentBlock.height > 20) {
// //           blocks.push(currentBlock);
// //           console.log(
// //             `Found message block at y=${currentBlock.y}, height=${currentBlock.height}`
// //           );
// //         }
// //         currentBlock = null;
// //       }
// //     }

// //     if (currentBlock && currentBlock.height > 20) {
// //       blocks.push(currentBlock);
// //     }

// //     console.log(`Detected ${blocks.length} message blocks`);
// //     return blocks;
// //   } catch (error) {
// //     console.error("Error in detectMessageBlocks:", error);
// //     throw error;
// //   }
// // }

// // async function processMessageBlock(
// //   image: JimpClass,
// //   block: MessageBlock
// // ): Promise<Message[]> {
// //   console.log(`Processing block at y=${block.y}, height=${block.height}`);
// //   try {
// //     const blockImage = image.clone();

// //     blockImage.crop({
// //       x: 0,
// //       y: block.y,
// //       w: image.bitmap.width,
// //       h: block.height,
// //     });

// //     blockImage.greyscale().contrast(0.5).threshold({ max: 200 });

// //     const worker = await createWorker("eng");
// //     const result = await worker.recognize(
// //       await blockImage.getBuffer(JimpMime.png)
// //     );
// //     await worker.terminate();

// //     // Parse the extracted text into messages
// //     const messages = parseMessages(result.data.text);
// //     console.log(`Extracted ${messages.length} messages from block`);

// //     return messages;
// //   } catch (error) {
// //     console.error("Error processing message block:", error);
// //     throw error;
// //   }
// // }

// // function parseMessages(text: string): Message[] {
// //   console.log("Raw text to parse:", text);

// //   // Split text into lines and clean them
// //   const lines = text
// //     .split("\n")
// //     .map((line) => line.trim())
// //     .filter((line) => line.length > 0);

// //   const messages: Message[] = [];
// //   let currentMessage: Partial<Message> = {};

// //   // More comprehensive time pattern matching
// //   const timePatterns = [
// //     /(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i, // Basic time format
// //     /(\d{1,2}\.\d{2}(?:\s*(?:AM|PM))?)/i, // Time with dots
// //     /(\d{1,2}[:.]\d{2}\s*(?:AM|PM)?)/i, // Combined pattern
// //   ];

// //   function hasTimePattern(line: string): boolean {
// //     return timePatterns.some((pattern) => pattern.test(line));
// //   }

// //   function extractTime(line: string): Date | null {
// //     for (const pattern of timePatterns) {
// //       const match = line.match(pattern);
// //       if (match) {
// //         return parseDateTime(match[1]);
// //       }
// //     }
// //     return null;
// //   }

// //   // Process lines to group messages
// //   for (let i = 0; i < lines.length; i++) {
// //     const line = lines[i].trim();

// //     // Skip header/system lines
// //     if (line.match(/^[0-9]{1,2}:[0-9]{2}\s*[AP]M\s*[0-9]{1,2}G/i)) {
// //       continue;
// //     }

// //     // If line contains a time pattern, it might be a new message
// //     if (hasTimePattern(line)) {
// //       // Save previous message if exists
// //       if (currentMessage.body && currentMessage.time) {
// //         messages.push(currentMessage as Message);
// //         currentMessage = {};
// //       }

// //       const time = extractTime(line);
// //       if (time) {
// //         // Remove the time pattern from the message content
// //         let content = line;
// //         for (const pattern of timePatterns) {
// //           content = content.replace(pattern, "").trim();
// //         }

// //         // Check if this is a sent or received message
// //         const isSentMessage = content.match(/^([▪■●]|You:|$)/) !== null;

// //         currentMessage = {
// //           time,
// //           body: content,
// //           isReceiver: !isSentMessage,
// //         };
// //       }
// //     } else if (currentMessage.body) {
// //       // Append line to current message if it's a continuation
// //       currentMessage.body += " " + line;
// //     }
// //   }

// //   // Don't forget the last message
// //   if (currentMessage.body && currentMessage.time) {
// //     messages.push(currentMessage as Message);
// //   }

// //   // Clean up message bodies
// //   return messages
// //     .map((msg) => ({
// //       ...msg,
// //       body: msg.body.replace(/[▪■●]/g, "").replace(/\s+/g, " ").trim(),
// //     }))
// //     .filter(
// //       (msg) =>
// //         msg.body && msg.body.length > 0 && !msg.body.match(/^[0-9]{1,2}G/) // Filter out network indicators
// //     );
// // }

// // function parseMessage(text: string): Message | null {
// //   console.log("Parsing message text:", text);
// //   const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i;
// //   const timeMatch = text.match(timeRegex);

// //   if (!text.trim()) {
// //     return null;
// //   }

// //   let messageTime: Date | null = null;
// //   let messageText = text;

// //   if (timeMatch) {
// //     messageTime = parseDateTime(timeMatch[1]);
// //     messageText = text.replace(timeMatch[0], "").trim();
// //   }

// //   // Check for message direction using various indicators
// //   const sentIndicators = [/^▪/, /^■/, /^\s{4,}/]; // Common sent message indicators
// //   const isReceiver = !sentIndicators.some((indicator) => indicator.test(text));

// //   return {
// //     time: messageTime,
// //     body: messageText.replace(/[▶»■▪]/g, "").trim(),
// //     isReceiver,
// //   };
// // }

// // function parseDateTime(text: string): Date | null {
// //   // Clean the time string
// //   const cleanTime = text.replace(/\./g, ":").trim();

// //   // Match hours, minutes, and optional AM/PM
// //   const timeMatch = cleanTime.match(/(\d{1,2})[:.]\s*(\d{2})(?:\s*(AM|PM))?/i);

// //   if (timeMatch) {
// //     const [_, hours, minutes, meridiem] = timeMatch;
// //     const now = new Date();
// //     let hour = parseInt(hours);

// //     // Handle 12-hour format
// //     if (meridiem) {
// //       if (meridiem.toLowerCase() === "pm" && hour !== 12) {
// //         hour += 12;
// //       } else if (meridiem.toLowerCase() === "am" && hour === 12) {
// //         hour = 0;
// //       }
// //     }

// //     return new Date(
// //       now.getFullYear(),
// //       now.getMonth(),
// //       now.getDate(),
// //       hour,
// //       parseInt(minutes)
// //     );
// //   }

// //   return null;
// // }
// // export async function processWhatsAppScreenshot(
// //   file: File
// // ): Promise<Message[]> {
// //   console.log("Starting WhatsApp screenshot processing...");
// //   try {
// //     const imageBuffer = await file.arrayBuffer();
// //     const image = await Jimp.read(Buffer.from(imageBuffer));
// //     console.log("Image loaded", {
// //       width: image.bitmap.width,
// //       height: image.bitmap.height,
// //     });

// //     const messageBlocks = await detectMessageBlocks(image);
// //     console.log(`Found ${messageBlocks.length} message blocks`);

// //     const allMessages: Message[] = [];

// //     for (const block of messageBlocks) {
// //       try {
// //         const blockMessages = await processMessageBlock(image, block);
// //         allMessages.push(...blockMessages);
// //       } catch (error) {
// //         console.error("Error processing block:", error);
// //       }
// //     }

// //     // Sort messages by time
// //     allMessages.sort((a, b) => {
// //       if (!a.time || !b.time) return 0;
// //       return a.time.getTime() - b.time.getTime();
// //     });

// //     console.log(`Successfully processed ${allMessages.length} messages`);

// //     console.log("Messages resp from processWhatsAppScreenshot: ", allMessages);
// //     return allMessages;
// //   } catch (error) {
// //     console.error("Error in processWhatsAppScreenshot:", error);
// //     throw error;
// //   }
// // }
