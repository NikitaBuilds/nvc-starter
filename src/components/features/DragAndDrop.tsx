import React, { useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { CloudUpload, Loader, MessageSquare } from "lucide-react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/utils/uploadthing";
import { scaleImageDown } from "@/utils/scaleImage";
import type { WhatsAppTranscription } from "@/types/whatsapp";

const { useUploadThing: useUpload } = generateReactHelpers<OurFileRouter>();

interface FileWithPreview extends File {
  preview: string;
}

interface UploadState {
  isUploading: boolean;
  isProcessing: boolean;
  error: string;
  originalSize: string;
  scaledSize: string;
}

const WhatsAppOCRComponent = () => {
  const [file, setFile] = useState<FileWithPreview | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [transcription, setTranscription] =
    useState<WhatsAppTranscription | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    error: "",
    originalSize: "",
    scaledSize: "",
  });

  const { startUpload, isUploading } = useUpload("imageUploader", {
    onClientUploadComplete: async (res) => {
      if (res && res[0]) {
        setUploadedImageUrl(res[0].url);
        await processImage(res[0].url);
      }
    },
    onUploadError: (error: Error) => {
      console.error("Upload error:", error);
      setUploadState((prev) => ({
        ...prev,
        error: "Upload failed: " + error.message,
      }));
    },
  });

  const processImage = async (imageUrl: string) => {
    setUploadState((prev) => ({ ...prev, isProcessing: true, error: "" }));

    try {
      const response = await fetch("/api/process-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process image");
      }

      if (result.success && result.data) {
        setTranscription(result.data);
      } else {
        throw new Error(result.error || "Failed to transcribe image");
      }
    } catch (err) {
      setUploadState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      }));
    } finally {
      setUploadState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const onDrop = useCallback(
    async (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent
    ) => {
      setUploadState((prev) => ({ ...prev, error: "" }));
      setTranscription(null);

      if (acceptedFiles.length > 0) {
        const originalFile = acceptedFiles[0];
        const originalSize = formatFileSize(originalFile.size);

        try {
          const scaledFile = await scaleImageDown(originalFile);
          const scaledSize = formatFileSize(scaledFile.size);

          const newFile = Object.assign(scaledFile, {
            preview: URL.createObjectURL(scaledFile),
          }) as FileWithPreview;

          setFile(newFile);
          setUploadState((prev) => ({
            ...prev,
            originalSize,
            scaledSize,
          }));

          await startUpload([scaledFile]);
        } catch (err) {
          setUploadState((prev) => ({
            ...prev,
            error: "Error processing image: " + (err as Error).message,
          }));
        }
      } else if (fileRejections.length > 0) {
        setUploadState((prev) => ({
          ...prev,
          error: "Please upload a valid image file (PNG or JPEG)",
        }));
      }
    },
    [startUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
  });
  const renderTranscription = () => {
    if (!transcription) return null;

    return (
      <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-white" />
            <h3 className="text-lg font-semibold text-white">
              Chat with: {transcription.chatName}
            </h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3 max-w-md mx-auto">
            {transcription.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.alignment === "right"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`
                    p-3 rounded-lg max-w-[85%]
                    ${
                      message.alignment === "right"
                        ? "bg-blue-600"
                        : "bg-gray-700"
                    }
                  `}
                >
                  {message.timestamp && (
                    <p className="text-xs text-gray-300 mb-1">
                      {message.timestamp}
                    </p>
                  )}
                  <p className="text-white break-words">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderNVCAnalysis = () => {
    if (!transcription?.nvcAnalysis) return null;

    return (
      <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Communication Analysis
          </h3>
        </div>

        <div className="p-4 space-y-6">
          {/* Participant Scores */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">
              Participant NVC Scores
            </h4>
            <div className="space-y-2">
              {Object.entries(transcription.nvcAnalysis.participantScores).map(
                ([name, score]) => (
                  <div key={name} className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">{name}</span>
                      <span className="text-white font-medium">
                        {score.score}/100
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{score.explanation}</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Message Rewrites */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">
              Suggested Message Improvements
            </h4>
            <div className="space-y-4">
              {transcription.nvcAnalysis.messageRewrites.map(
                (rewrite, index) => (
                  <div key={index} className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="mb-2">
                      <p className="text-red-400 line-through text-sm">
                        {rewrite.original}
                      </p>
                      <p className="text-green-400 text-sm mt-1">
                        {rewrite.rewritten}
                      </p>
                    </div>
                    <p className="text-sm text-gray-300 mt-2">
                      {rewrite.explanation}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Overall Analysis */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">
              Overall Analysis
            </h4>
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <p className="text-gray-300">
                {transcription.nvcAnalysis.overallAnalysis}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Upload WhatsApp Screenshot
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-300">
            Drag and drop your WhatsApp screenshot here. We'll automatically
            scale it down and transcribe it.
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
                {uploadState.originalSize && uploadState.scaledSize && (
                  <p className="text-sm text-gray-300 mt-1">
                    Original size: {uploadState.originalSize} → Scaled size:{" "}
                    {uploadState.scaledSize}
                  </p>
                )}
                <div className="mt-2">
                  <img
                    src={file.preview}
                    alt="WhatsApp screenshot"
                    className="w-full h-auto object-contain rounded-md"
                    onLoad={() => {
                      URL.revokeObjectURL(file.preview);
                    }}
                  />
                </div>
              </div>
            )}

            {(isUploading || uploadState.isProcessing) && (
              <div className="mt-4 flex items-center justify-center">
                <Loader className="animate-spin h-8 w-8 text-white" />
                <span className="ml-2 text-white">
                  {isUploading ? "Uploading image..." : "Processing image..."}
                </span>
              </div>
            )}

            {uploadState.error && (
              <div className="mt-4 text-red-400 text-sm text-center">
                {uploadState.error}
              </div>
            )}

            {renderTranscription()}
            {renderNVCAnalysis()}
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
