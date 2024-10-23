import React, { useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import {
  CloudUpload,
  Info,
  Loader,
  MessageSquare,
  MoveVertical,
} from "lucide-react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/utils/uploadthing";
import { scaleImageDown } from "@/utils/scaleImage";
import type { WhatsAppTranscription } from "@/types/whatsapp";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableImage from "../DraggableImage";

const { useUploadThing: useUpload } = generateReactHelpers<OurFileRouter>();

interface FileWithPreview extends File {
  preview: string;
  id: string;
  order: number;
}

interface UploadState {
  isUploading: boolean;
  isProcessing: boolean;
  error: string;
  originalSizes: Record<string, string>;
  scaledSizes: Record<string, string>;
}

const WhatsAppOCRComponent = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [transcription, setTranscription] =
    useState<WhatsAppTranscription | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    error: "",
    originalSizes: {},
    scaledSizes: {},
  });

  const { startUpload, isUploading } = useUpload("imageUploader");

  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      const [draggedFile] = newFiles.splice(dragIndex, 1);
      newFiles.splice(hoverIndex, 0, draggedFile);
      return newFiles.map((file, index) => ({
        ...file,
        order: index,
      }));
    });
  }, []);

  const removeFile = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  };

  const processImages = async () => {
    if (files.length === 0) {
      setUploadState((prev) => ({
        ...prev,
        error: "Please add screenshots first",
      }));
      return;
    }

    setUploadState((prev) => ({ ...prev, isUploading: true, error: "" }));

    try {
      // Sort files by order before uploading
      const sortedFiles = [...files].sort((a, b) => a.order - b.order);

      // Upload files
      const uploadResponse = await startUpload(sortedFiles);

      if (!uploadResponse) {
        throw new Error("No response from upload");
      }

      // Extract URLs, ensuring they're in the correct order
      const imageUrls = uploadResponse.map((file) => file.url);

      if (imageUrls.length === 0) {
        throw new Error("No files were uploaded successfully");
      }

      // Process the images
      await processConversation(imageUrls);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Upload failed",
      }));
    } finally {
      setUploadState((prev) => ({ ...prev, isUploading: false }));
    }
  };
  const processConversation = async (imageUrls: string[]) => {
    setUploadState((prev) => ({ ...prev, isProcessing: true, error: "" }));

    try {
      const response = await fetch("/api/process-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls }), // Now sending array of URLs
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process images");
      }

      if (result.success && result.data) {
        setTranscription(result.data);
      } else {
        throw new Error(result.error || "Failed to transcribe images");
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
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setUploadState((prev) => ({ ...prev, error: "" }));

      if (acceptedFiles.length > 0) {
        const newFiles = await Promise.all(
          acceptedFiles.map(async (file, index) => {
            const originalSize = formatFileSize(file.size);
            const scaledFile = await scaleImageDown(file);
            const scaledSize = formatFileSize(scaledFile.size);

            const fileWithPreview = Object.assign(scaledFile, {
              preview: URL.createObjectURL(scaledFile),
              id: `${Date.now()}-${index}`,
              order: files.length + index,
            }) as FileWithPreview;

            setUploadState((prev) => ({
              ...prev,
              originalSizes: {
                ...prev.originalSizes,
                [fileWithPreview.id]: originalSize,
              },
              scaledSizes: {
                ...prev.scaledSizes,
                [fileWithPreview.id]: scaledSize,
              },
            }));

            return fileWithPreview;
          })
        );

        setFiles((prev) => [...prev, ...newFiles]);
      } else if (fileRejections.length > 0) {
        setUploadState((prev) => ({
          ...prev,
          error: "Please upload valid image files (PNG or JPEG)",
        }));
      }
    },
    [files.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
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
          <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                In this conversation:
                <br />
                <span className="text-blue-400">You (Person 1)</span> - Messages
                on the right
                <br />
                <span className="text-purple-400">
                  {transcription.chatName} (Person 2)
                </span>{" "}
                - Messages on the left
              </p>
            </div>
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
                        ? "bg-blue-600 text-right"
                        : "bg-purple-600 text-left"
                    }
                  `}
                >
                  <p className="text-xs text-gray-300 mb-1">
                    {message.alignment === "right"
                      ? "You"
                      : transcription.chatName}
                    {message.timestamp && ` • ${message.timestamp}`}
                  </p>
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
                ([role, score]) => (
                  <div key={role} className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">
                        {role === "Person 1" ? (
                          <span className="text-blue-400">You</span>
                        ) : (
                          <span className="text-purple-400">
                            {transcription.chatName}
                          </span>
                        )}
                      </span>
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
                    <p className="text-sm text-gray-300 mb-2">
                      From:{" "}
                      {rewrite.role === "Person 1" ? (
                        <span className="text-blue-400">You</span>
                      ) : (
                        <span className="text-purple-400">
                          {transcription.chatName}
                        </span>
                      )}
                    </p>
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
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Upload WhatsApp Screenshots
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-300">
              Drag and drop your WhatsApp screenshots to analyze communication
              patterns.
            </p>
            {files.length > 1 && (
              <div className="mx-auto mt-6 max-w-xl text-center flex items-start justify-center gap-2 text-gray-300">
                <Info className="h-5 w-5" />
                <p className="text-sm">
                  You can reorder screenshots by dragging to ensure correct
                  conversation flow.
                </p>
              </div>
            )}

            <div className="mx-auto mt-10 max-w-2xl">
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
                  Drag 'n' drop WhatsApp screenshots here, or click to select
                  files
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4 text-gray-300">
                    <MoveVertical className="h-5 w-5" />
                    <p className="text-sm">
                      Drag screenshots to reorder them in the correct sequence
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {files.map((file, index) => (
                      <DraggableImage
                        key={file.id}
                        file={file}
                        index={index}
                        moveImage={moveImage}
                        onRemove={removeFile}
                      />
                    ))}
                  </div>

                  <button
                    onClick={processImages}
                    disabled={isUploading || uploadState.isProcessing}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2"
                  >
                    {isUploading || uploadState.isProcessing ? (
                      <>
                        <Loader className="animate-spin h-5 w-5" />
                        <span>
                          {isUploading ? "Uploading..." : "Processing..."}
                        </span>
                      </>
                    ) : (
                      <span>Analyze Conversation</span>
                    )}
                  </button>
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

            {/* Existing SVG background */}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default WhatsAppOCRComponent;
