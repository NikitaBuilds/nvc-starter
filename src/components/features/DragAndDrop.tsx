import React, { useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { CloudUpload, Loader } from "lucide-react";
import { processWhatsAppScreenshot, Message } from "@/utils/OCR";
// import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileWithPreview extends File {
  preview: string;
}

const WhatsAppOCRComponent = () => {
  const [file, setFile] = useState<FileWithPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const onDrop = useCallback(
    async (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent
    ) => {
      setError("");
      if (acceptedFiles.length > 0) {
        const newFile = Object.assign(acceptedFiles[0], {
          preview: URL.createObjectURL(acceptedFiles[0]),
        });
        setFile(newFile);
        await processImage(newFile);
      } else if (fileRejections.length > 0) {
        setError("Please upload a valid image file (PNG or JPEG)");
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
  });

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus("Analyzing image...");
    setMessages([]);

    try {
      const messages = await processWhatsAppScreenshot(file);
      setMessages(messages);
      console.log(
        "Messages from processImage: ",
        messages.map((message) => {
          return { text: message.body, isReceiver: message.isReceiver };
        })
      );

      if (messages.length === 0) {
        setError(
          "No messages could be detected in the image. Please try a clearer screenshot."
        );
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setError(
        "Failed to process the image. Please try again with a different screenshot."
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const formatMessageTime = (time: Date | null) => {
    if (!time) return "Time unknown";
    return time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Upload WhatsApp Screenshot
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-300">
            Drag and drop your WhatsApp screenshot here. We'll extract the
            messages for you.
          </p>

          <div className="mx-auto mt-10 max-w-md">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-white/50 bg-white/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <input {...getInputProps()} />
              <CloudUpload className="mx-auto h-12 w-12 text-white/70" />
              <p className="mt-2 text-sm text-gray-300">
                Drag 'n' drop a WhatsApp screenshot here, or click to select a
                file
              </p>
            </div>

            {file && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-white">
                  Uploaded screenshot:
                </h4>
                <div className="mt-2">
                  <img
                    src={file.preview}
                    alt="WhatsApp screenshot"
                    className="w-full h-auto object-contain rounded-md"
                    onClick={async () => await processImage(file)}
                    onLoad={() => {
                      URL.revokeObjectURL(file.preview);
                    }}
                  />
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <Loader className="animate-spin h-8 w-8 text-white" />
                <span className="ml-2 text-white">Processing image...</span>
              </div>
            )}

            {messages.length > 0 && (
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">
                  Extracted Messages ({messages.length}):
                </h4>
                <div className="space-y-2">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        message.isReceiver
                          ? "bg-blue-500/80 ml-auto max-w-[80%]"
                          : "bg-green-500/80 mr-auto max-w-[80%]"
                      }`}
                    >
                      <p className="text-sm text-white break-words">
                        {message.body}
                      </p>
                      <p className="text-xs text-white/70 mt-1">
                        {formatMessageTime(message.time)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <svg
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
          >
            <circle
              r={512}
              cx={512}
              cy={512}
              fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
              fillOpacity="0.7"
            />
            <defs>
              <radialGradient
                r={1}
                cx={0}
                cy={0}
                id="759c1415-0410-454c-8f7c-9a820de03641"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(512 512) rotate(90) scale(512)"
              >
                <stop stopColor="#7775D6" />
                <stop offset={1} stopColor="#E935C1" stopOpacity={0} />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOCRComponent;
