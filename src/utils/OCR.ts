import { JimpClass } from "@jimp/types";
import { Jimp, JimpMime } from "jimp";
import { createWorker } from "tesseract.js";
import { intToRGBA } from "@jimp/utils";

// Core interfaces remain the same
export interface Message {
  time: Date | null;
  body: string;
  isReceiver: boolean;
}

interface Bubble {
  x: number;
  y: number;
  width: number;
  height: number;
  isLeft: boolean;
  intensity: number;
}

interface TimestampLocation {
  x: number;
  y: number;
  width: number;
  time: Date;
  text: string;
}

interface MessageSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  timestamp?: TimestampLocation;
}

// Configuration constants remain the same
const CONFIG = {
  TOP_BAR_HEIGHT: 100,
  BOTTOM_BAR_HEIGHT: 60,
  LEFT_MARGIN: 20,
  RIGHT_MARGIN: 20,
  MIN_MESSAGE_HEIGHT: 25,
  MAX_MESSAGE_HEIGHT: 400,
  MIN_MESSAGE_WIDTH: 50,
  BUBBLE_PADDING: 12,
  LEFT_ALIGN_THRESHOLD: 0.3,
  RIGHT_ALIGN_THRESHOLD: 0.7,
  MIN_VERTICAL_GAP: 8,
  TIMESTAMP_HEIGHT: 20,
  CONTRAST_BOOST: 0.5,
  THRESHOLD_VALUE: 200,
  OCR_PADDING: 5,
};

function getPixelIntensity(pixel: number): number {
  const { r, g, b } = intToRGBA(pixel);
  return (r + g + b) / 3;
}

function isBackground(pixel: number, backgroundPixel: number): boolean {
  const intensity = getPixelIntensity(pixel);
  const bgIntensity = getPixelIntensity(backgroundPixel);
  return Math.abs(intensity - bgIntensity) < 10;
}

async function findTimestamps(image: JimpClass): Promise<TimestampLocation[]> {
  console.log("Starting timestamp detection...");
  const timestamps: TimestampLocation[] = [];
  const worker = await createWorker();
  console.log("OCR worker created for timestamps");

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789:.APM ",
      preserve_interword_spaces: "1",
    });
    console.log("OCR parameters set for timestamp detection");

    for (
      let y = CONFIG.TOP_BAR_HEIGHT;
      y < image.bitmap.height - CONFIG.BOTTOM_BAR_HEIGHT;
      y += CONFIG.MIN_MESSAGE_HEIGHT
    ) {
      const slice = image.clone();
      console.log(`Processing slice at y=${y}`);

      try {
        slice.crop({
          x: 0,
          y: y,
          w: image.bitmap.width,
          h: CONFIG.TIMESTAMP_HEIGHT,
        });

        slice.greyscale().contrast(0.7);
        console.log("Image slice processed for OCR");

        const result = await worker.recognize(
          await slice.getBuffer(JimpMime.png)
        );
        console.log("OCR result for slice:", result.data.text);

        for (const line of result.data.lines) {
          console.log("Processing line:", line.text);
          const timeMatch = line.text.match(
            /(\d{1,2}):(\d{2})(?:\s*(?:AM|PM))?/i
          );
          if (timeMatch) {
            console.log("Found time match:", timeMatch[0]);
            const time = parseDateTime(timeMatch[0]);
            if (time) {
              console.log("Successfully parsed time:", time);
              timestamps.push({
                x: line.bbox.x0,
                y: y + line.bbox.y0,
                width: line.bbox.x1 - line.bbox.x0,
                time,
                text: timeMatch[0],
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing slice at y=${y}:`, error);
      }
    }
  } finally {
    await worker.terminate();
    console.log(
      `Timestamp detection complete. Found ${timestamps.length} timestamps`
    );
  }

  return timestamps;
}

async function detectMessageBubbles(image: JimpClass): Promise<Bubble[]> {
  console.log("Starting message bubble detection...");
  const bubbles: Bubble[] = [];
  const backgroundPixel = image.getPixelColor(0, 0);
  console.log("Background pixel color:", backgroundPixel);

  let currentBubble: Partial<Bubble> | null = null;
  let bubbleCount = 0;

  for (
    let y = CONFIG.TOP_BAR_HEIGHT;
    y < image.bitmap.height - CONFIG.BOTTOM_BAR_HEIGHT;
    y++
  ) {
    let contentStart = -1;
    let contentEnd = -1;
    let rowIntensity = 0;
    let pixelCount = 0;

    for (
      let x = CONFIG.LEFT_MARGIN;
      x < image.bitmap.width - CONFIG.RIGHT_MARGIN;
      x++
    ) {
      const pixel = image.getPixelColor(x, y);
      if (!isBackground(pixel, backgroundPixel)) {
        if (contentStart === -1) contentStart = x;
        contentEnd = x;
        rowIntensity += getPixelIntensity(pixel);
        pixelCount++;
      }
    }

    if (contentStart !== -1) {
      const avgIntensity = rowIntensity / pixelCount;
      const width = contentEnd - contentStart;
      const isLeft =
        contentStart < image.bitmap.width * CONFIG.LEFT_ALIGN_THRESHOLD;

      if (!currentBubble) {
        currentBubble = {
          x: contentStart,
          y,
          width,
          height: 1,
          isLeft,
          intensity: avgIntensity,
        };
        console.log(`Starting new bubble at y=${y}, x=${contentStart}`);
      } else {
        currentBubble.width = Math.max(currentBubble.width!, width);
        currentBubble.height! += 1;
        currentBubble.x = Math.min(currentBubble.x!, contentStart);
        currentBubble.intensity = (currentBubble.intensity! + avgIntensity) / 2;
      }
    } else if (currentBubble) {
      if (currentBubble.height! >= CONFIG.MIN_MESSAGE_HEIGHT) {
        bubbles.push(currentBubble as Bubble);
        bubbleCount++;
        console.log(`Completed bubble #${bubbleCount}:`, currentBubble);
      }
      currentBubble = null;
    }
  }

  if (currentBubble && currentBubble.height! >= CONFIG.MIN_MESSAGE_HEIGHT) {
    bubbles.push(currentBubble as Bubble);
    console.log("Added final bubble:", currentBubble);
  }

  console.log(`Found ${bubbles.length} raw bubbles before merging`);
  const mergedBubbles = mergeBubbles(bubbles);
  console.log(`After merging: ${mergedBubbles.length} bubbles`);
  return mergedBubbles;
}

function mergeBubbles(bubbles: Bubble[]): Bubble[] {
  if (bubbles.length === 0) {
    console.log("No bubbles to merge");
    return [];
  }

  console.log("Starting bubble merge process");
  const merged: Bubble[] = [];
  let current = bubbles[0];

  for (let i = 1; i < bubbles.length; i++) {
    const next = bubbles[i];
    const gap = next.y - (current.y + current.height);

    console.log(`Analyzing bubble pair ${i - 1} and ${i}, gap: ${gap}px`);

    if (
      gap < CONFIG.MIN_VERTICAL_GAP &&
      current.isLeft === next.isLeft &&
      Math.abs(current.x - next.x) < CONFIG.BUBBLE_PADDING
    ) {
      console.log("Merging bubbles due to proximity");
      current = {
        x: Math.min(current.x, next.x),
        y: current.y,
        width: Math.max(current.width, next.width),
        height: next.y + next.height - current.y,
        isLeft: current.isLeft,
        intensity: (current.intensity + next.intensity) / 2,
      };
    } else {
      merged.push(current);
      current = next;
      console.log("Bubbles too far apart, starting new bubble");
    }
  }
  merged.push(current);

  console.log(
    `Merge complete. ${bubbles.length} bubbles merged into ${merged.length}`
  );
  return merged;
}

async function extractMessageContent(
  image: JimpClass,
  bubble: Bubble,
  timestamp: TimestampLocation | undefined
): Promise<MessageSegment> {
  console.log("Extracting message content for bubble:", bubble);
  const contentImage = image.clone();

  try {
    contentImage.crop({
      x: bubble.x - CONFIG.OCR_PADDING,
      y: bubble.y,
      w: bubble.width + CONFIG.OCR_PADDING * 2,
      h: bubble.height,
    });

    console.log("Bubble area cropped successfully");

    contentImage
      .greyscale()
      .contrast(CONFIG.CONTRAST_BOOST)
      .threshold({ max: CONFIG.THRESHOLD_VALUE });

    console.log("Image processing applied for OCR");

    const worker = await createWorker();
    console.log("OCR worker created for message content");

    try {
      await worker.setParameters({
        tessedit_char_whitelist:
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:.,'\"?!@#$%&*()-+=<>/ ",
        preserve_interword_spaces: "1",
      });

      const result = await worker.recognize(
        await contentImage.getBuffer(JimpMime.png)
      );
      console.log("OCR result:", result.data.text);

      return {
        x: bubble.x,
        y: bubble.y,
        width: bubble.width,
        height: bubble.height,
        text: result.data.text.trim(),
        timestamp,
      };
    } finally {
      await worker.terminate();
      console.log("OCR worker terminated");
    }
  } catch (error) {
    console.error("Error during content extraction:", error);
    throw error;
  }
}

function cleanMessageText(text: string): string {
  console.log("Cleaning message text:", text);
  const cleaned = text
    .replace(/^[▪■●\s]+/, "")
    .replace(/✓+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/(?:\d{1,2}G|5G)\s*$/, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .trim();

  console.log("Cleaned text:", cleaned);
  return cleaned;
}

function parseDateTime(timeStr: string): Date | null {
  console.log("Parsing datetime:", timeStr);
  try {
    // Handle various time formats
    let match = timeStr.match(
      /(\d{1,2})[:.]\s*(\d{2})\s*((?:AM|PM|am|pm|ppm)?)/
    );
    if (!match) return null;

    let [_, hours, minutes, meridiem] = match;
    let hour = parseInt(hours);
    const minute = parseInt(minutes);

    // Validate time components
    if (minute < 0 || minute > 59) return null;

    // Convert 24-hour format to 12-hour
    if (hour > 12 && hour <= 23) {
      meridiem = "PM";
      hour -= 12;
    }

    // Handle 12-hour format
    if (meridiem && meridiem.toLowerCase().includes("pm") && hour !== 12) {
      hour += 12;
    } else if (
      meridiem &&
      meridiem.toLowerCase().includes("am") &&
      hour === 12
    ) {
      hour = 0;
    }

    const now = new Date();
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute
    );
    console.log("Parsed datetime:", date);
    return date;
  } catch (error) {
    console.error("Error parsing datetime:", error);
    return null;
  }
}

function splitIntoMessages(
  text: string
): { body: string; time: string | null }[] {
  console.log("Splitting text into messages:", text);

  // Split by timestamps with various formats
  const timePatterns = [
    /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/g, // 12:38 PM
    /(\d{1,2}\.\d{2}(?:pm|am|PM|AM)?)/g, // 1.02pm
    /(\d{1,2}:\d{2}(?:ppm|pm|am)?)/g, // 15:35pm
  ];

  // First, mark all timestamps with a special delimiter
  let markedText = text;
  timePatterns.forEach((pattern) => {
    markedText = markedText.replace(pattern, "|||$1|||");
  });

  // Split by the delimiter
  const segments = markedText.split("|||").filter((s) => s.trim());
  console.log("Raw segments:", segments);

  const messages: { body: string; time: string | null }[] = [];
  let currentBody = "";

  for (const segment of segments) {
    const isTimestamp = timePatterns.some((pattern) => segment.match(pattern));

    if (isTimestamp) {
      if (currentBody.trim()) {
        messages.push({
          body: currentBody.trim(),
          time: segment.trim(),
        });
        currentBody = "";
      }
    } else {
      currentBody += " " + segment;
    }
  }

  // Add the last message if there's remaining text
  if (currentBody.trim()) {
    messages.push({
      body: currentBody.trim(),
      time: null,
    });
  }

  console.log("Parsed messages:", messages);
  return messages;
}

export async function processWhatsAppScreenshot(
  file: File
): Promise<Message[]> {
  console.log("Starting WhatsApp screenshot processing...");
  try {
    const imageBuffer = await file.arrayBuffer();
    const image = await Jimp.read(Buffer.from(imageBuffer));

    console.log("Image loaded:", {
      width: image.bitmap.width,
      height: image.bitmap.height,
    });

    // Process the entire image with OCR
    const worker = await createWorker();
    try {
      await worker.setParameters({
        tessedit_char_whitelist:
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:.,'\"?!@#$%&*()-+=<>/ ",
        preserve_interword_spaces: "1",
      });

      const enhancedImage = image.clone().greyscale().contrast(0.7);

      const result = await worker.recognize(
        await enhancedImage.getBuffer(JimpMime.png)
      );

      console.log("Full OCR result:", result.data.text);

      // Split the text into individual messages
      const parsedMessages = splitIntoMessages(result.data.text);

      // Convert to Message format
      const messages: Message[] = parsedMessages
        .filter((msg) => msg.body && msg.time) // Ensure both body and time exist
        .map((msg) => ({
          time: msg.time ? parseDateTime(msg.time) : null,
          body: cleanMessageText(msg.body),
          isReceiver: true, // You might need to adjust this based on your needs
        }))
        .filter(
          (msg) =>
            msg.body.length > 0 &&
            msg.body.length < 1000 &&
            !msg.body.match(/^[0-9.]+$/) &&
            !msg.body.match(/^(?:AM|PM)$/i) &&
            !msg.body.match(/^\W+$/)
        );

      console.log("Final processed messages:", messages);
      return messages;
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error("Error processing screenshot:", error);
    throw error;
  }
}

// // Debug helper function
// function logImageStats(image: JimpClass, label: string) {
//   console.log(`Image stats for ${label}:`, {
//     width: image.bitmap.width,
//     height: image.bitmap.height,
//     hasAlpha: image.hasAlpha(),
//     colorType: image.getColorType(),
//     pixelColor: {
//       topLeft: image.getPixelColor(0, 0),
//       center: image.getPixelColor(
//         Math.floor(image.bitmap.width / 2),
//         Math.floor(image.bitmap.height / 2)
//       ),
//       bottomRight: image.getPixelColor(
//         image.bitmap.width - 1,
//         image.bitmap.height - 1
//       ),
//     },
//   });
// }

// import { JimpClass } from "@jimp/types";
// import { Jimp, JimpMime } from "jimp";
// import { createWorker } from "tesseract.js";

// export interface Message {
//   time: Date | null;
//   body: string;
//   isReceiver: boolean;
// }

// interface MessageBlock {
//   y: number;
//   height: number;
//   color: number;
// }

// async function detectMessageBlocks(image: JimpClass): Promise<MessageBlock[]> {
//   console.log("Starting message block detection...");
//   const blocks: MessageBlock[] = [];
//   let currentBlock: MessageBlock | null = null;
//   const backgroundPixel = image.getPixelColor(0, 0);

//   try {
//     for (let y = 0; y < image.bitmap.height; y++) {
//       let hasContent = false;
//       let dominantColor = backgroundPixel;
//       let colorCounts: Record<number, number> = {};

//       for (let x = 0; x < image.bitmap.width; x++) {
//         const pixel = image.getPixelColor(x, y);
//         if (pixel !== backgroundPixel) {
//           hasContent = true;
//           colorCounts[pixel] = (colorCounts[pixel] || 0) + 1;
//         }
//       }

//       if (Object.keys(colorCounts).length > 0) {
//         dominantColor = parseInt(
//           Object.entries(colorCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
//         );
//       }

//       if (hasContent) {
//         if (!currentBlock) {
//           currentBlock = {
//             y,
//             height: 1,
//             color: dominantColor,
//           };
//         } else {
//           currentBlock.height++;
//         }
//       } else if (currentBlock) {
//         if (currentBlock.height > 20) {
//           blocks.push(currentBlock);
//           console.log(
//             `Found message block at y=${currentBlock.y}, height=${currentBlock.height}`
//           );
//         }
//         currentBlock = null;
//       }
//     }

//     if (currentBlock && currentBlock.height > 20) {
//       blocks.push(currentBlock);
//     }

//     console.log(`Detected ${blocks.length} message blocks`);
//     return blocks;
//   } catch (error) {
//     console.error("Error in detectMessageBlocks:", error);
//     throw error;
//   }
// }

// async function processMessageBlock(
//   image: JimpClass,
//   block: MessageBlock
// ): Promise<Message[]> {
//   console.log(`Processing block at y=${block.y}, height=${block.height}`);
//   try {
//     const blockImage = image.clone();

//     blockImage.crop({
//       x: 0,
//       y: block.y,
//       w: image.bitmap.width,
//       h: block.height,
//     });

//     blockImage.greyscale().contrast(0.5).threshold({ max: 200 });

//     const worker = await createWorker("eng");
//     const result = await worker.recognize(
//       await blockImage.getBuffer(JimpMime.png)
//     );
//     await worker.terminate();

//     // Parse the extracted text into messages
//     const messages = parseMessages(result.data.text);
//     console.log(`Extracted ${messages.length} messages from block`);

//     return messages;
//   } catch (error) {
//     console.error("Error processing message block:", error);
//     throw error;
//   }
// }

// function parseMessages(text: string): Message[] {
//   console.log("Raw text to parse:", text);

//   // Split text into lines and clean them
//   const lines = text
//     .split("\n")
//     .map((line) => line.trim())
//     .filter((line) => line.length > 0);

//   const messages: Message[] = [];
//   let currentMessage: Partial<Message> = {};

//   // More comprehensive time pattern matching
//   const timePatterns = [
//     /(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i, // Basic time format
//     /(\d{1,2}\.\d{2}(?:\s*(?:AM|PM))?)/i, // Time with dots
//     /(\d{1,2}[:.]\d{2}\s*(?:AM|PM)?)/i, // Combined pattern
//   ];

//   function hasTimePattern(line: string): boolean {
//     return timePatterns.some((pattern) => pattern.test(line));
//   }

//   function extractTime(line: string): Date | null {
//     for (const pattern of timePatterns) {
//       const match = line.match(pattern);
//       if (match) {
//         return parseDateTime(match[1]);
//       }
//     }
//     return null;
//   }

//   // Process lines to group messages
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i].trim();

//     // Skip header/system lines
//     if (line.match(/^[0-9]{1,2}:[0-9]{2}\s*[AP]M\s*[0-9]{1,2}G/i)) {
//       continue;
//     }

//     // If line contains a time pattern, it might be a new message
//     if (hasTimePattern(line)) {
//       // Save previous message if exists
//       if (currentMessage.body && currentMessage.time) {
//         messages.push(currentMessage as Message);
//         currentMessage = {};
//       }

//       const time = extractTime(line);
//       if (time) {
//         // Remove the time pattern from the message content
//         let content = line;
//         for (const pattern of timePatterns) {
//           content = content.replace(pattern, "").trim();
//         }

//         // Check if this is a sent or received message
//         const isSentMessage = content.match(/^([▪■●]|You:|$)/) !== null;

//         currentMessage = {
//           time,
//           body: content,
//           isReceiver: !isSentMessage,
//         };
//       }
//     } else if (currentMessage.body) {
//       // Append line to current message if it's a continuation
//       currentMessage.body += " " + line;
//     }
//   }

//   // Don't forget the last message
//   if (currentMessage.body && currentMessage.time) {
//     messages.push(currentMessage as Message);
//   }

//   // Clean up message bodies
//   return messages
//     .map((msg) => ({
//       ...msg,
//       body: msg.body.replace(/[▪■●]/g, "").replace(/\s+/g, " ").trim(),
//     }))
//     .filter(
//       (msg) =>
//         msg.body && msg.body.length > 0 && !msg.body.match(/^[0-9]{1,2}G/) // Filter out network indicators
//     );
// }

// function parseMessage(text: string): Message | null {
//   console.log("Parsing message text:", text);
//   const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i;
//   const timeMatch = text.match(timeRegex);

//   if (!text.trim()) {
//     return null;
//   }

//   let messageTime: Date | null = null;
//   let messageText = text;

//   if (timeMatch) {
//     messageTime = parseDateTime(timeMatch[1]);
//     messageText = text.replace(timeMatch[0], "").trim();
//   }

//   // Check for message direction using various indicators
//   const sentIndicators = [/^▪/, /^■/, /^\s{4,}/]; // Common sent message indicators
//   const isReceiver = !sentIndicators.some((indicator) => indicator.test(text));

//   return {
//     time: messageTime,
//     body: messageText.replace(/[▶»■▪]/g, "").trim(),
//     isReceiver,
//   };
// }

// function parseDateTime(text: string): Date | null {
//   // Clean the time string
//   const cleanTime = text.replace(/\./g, ":").trim();

//   // Match hours, minutes, and optional AM/PM
//   const timeMatch = cleanTime.match(/(\d{1,2})[:.]\s*(\d{2})(?:\s*(AM|PM))?/i);

//   if (timeMatch) {
//     const [_, hours, minutes, meridiem] = timeMatch;
//     const now = new Date();
//     let hour = parseInt(hours);

//     // Handle 12-hour format
//     if (meridiem) {
//       if (meridiem.toLowerCase() === "pm" && hour !== 12) {
//         hour += 12;
//       } else if (meridiem.toLowerCase() === "am" && hour === 12) {
//         hour = 0;
//       }
//     }

//     return new Date(
//       now.getFullYear(),
//       now.getMonth(),
//       now.getDate(),
//       hour,
//       parseInt(minutes)
//     );
//   }

//   return null;
// }
// export async function processWhatsAppScreenshot(
//   file: File
// ): Promise<Message[]> {
//   console.log("Starting WhatsApp screenshot processing...");
//   try {
//     const imageBuffer = await file.arrayBuffer();
//     const image = await Jimp.read(Buffer.from(imageBuffer));
//     console.log("Image loaded", {
//       width: image.bitmap.width,
//       height: image.bitmap.height,
//     });

//     const messageBlocks = await detectMessageBlocks(image);
//     console.log(`Found ${messageBlocks.length} message blocks`);

//     const allMessages: Message[] = [];

//     for (const block of messageBlocks) {
//       try {
//         const blockMessages = await processMessageBlock(image, block);
//         allMessages.push(...blockMessages);
//       } catch (error) {
//         console.error("Error processing block:", error);
//       }
//     }

//     // Sort messages by time
//     allMessages.sort((a, b) => {
//       if (!a.time || !b.time) return 0;
//       return a.time.getTime() - b.time.getTime();
//     });

//     console.log(`Successfully processed ${allMessages.length} messages`);

//     console.log("Messages resp from processWhatsAppScreenshot: ", allMessages);
//     return allMessages;
//   } catch (error) {
//     console.error("Error in processWhatsAppScreenshot:", error);
//     throw error;
//   }
// }
