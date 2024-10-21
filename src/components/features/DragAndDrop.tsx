import React, { useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { CloudUpload, X } from "lucide-react";

interface FileWithPreview extends File {
  preview: string;
}

interface HelloResponse {
  name: string;
}

const ImageUploadComponent: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  const onDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent
    ) => {
      setFiles(
        acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
      );
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/gif": [],
      "image/webp": [],
    },
  });

  const removeFile = (file: FileWithPreview) => {
    const newFiles = [...files];
    newFiles.splice(newFiles.indexOf(file), 1);
    setFiles(newFiles);
  };

  const sendToAPI = async () => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const response = await fetch("/api/process-images", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        alert("Images uploaded successfully!");
        setFiles([]);
      } else {
        alert("Failed to upload images");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while uploading images");
    }
  };

  const fetchHelloEndpoint = async () => {
    try {
      const response = await fetch("/api/hello");
      console.log("response", response);
      if (response.ok) {
        const data: HelloResponse = await response.json();
        console.log("data", data);
        setApiResponse(data.name);
      } else {
        setApiResponse("Failed to fetch data");
      }
    } catch (error) {
      console.error("Error:", error);
      setApiResponse("An error occurred while fetching data");
    }
  };

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Upload your images
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-300">
            Drag and drop your images here or click to select files. We accept
            JPEG, PNG, GIF, and WebP formats.
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
                Drag 'n' drop some images here, or click to select files
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-white">
                  Selected files:
                </h4>
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {files.map((file) => (
                    <li key={file.name} className="relative">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-24 w-24 object-cover rounded-md"
                        onLoad={() => {
                          URL.revokeObjectURL(file.preview);
                        }}
                      />
                      <button
                        onClick={() => removeFile(file)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={sendToAPI}
              disabled={files.length === 0}
              className={`mt-6 w-full rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                files.length === 0
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-white text-gray-900 hover:bg-gray-100 focus-visible:outline-white"
              }`}
            >
              Upload Images
            </button>

            <button
              onClick={fetchHelloEndpoint}
              className="mt-4 w-full rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Fetch Hello Endpoint
            </button>

            {apiResponse && (
              <div className="mt-4 p-4 bg-white/10 rounded-md">
                <h4 className="text-sm font-medium text-white mb-2">
                  API Response:
                </h4>
                <p className="text-sm text-gray-300">{apiResponse}</p>
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

export default ImageUploadComponent;
