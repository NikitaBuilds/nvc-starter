export const scaleImageDown = async (
  file: File,
  scaleFactor: number = 3.5
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Calculate new dimensions
        canvas.width = img.width / scaleFactor;
        canvas.height = img.height / scaleFactor;

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw scaled image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert back to file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not create blob"));
              return;
            }

            const scaledFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(scaledFile);
          },
          file.type,
          0.9 // Quality setting for JPEG compression
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
  });
};
