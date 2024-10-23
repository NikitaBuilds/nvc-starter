import { MoveVertical, Trash2 } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { useRef } from "react";

interface FileWithPreview extends File {
  preview: string;
  id: string;
  order: number;
}

interface DraggableImageProps {
  file: FileWithPreview;
  index: number;
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (id: string) => void;
}

const DraggableImage = ({
  file,
  index,
  moveImage,
  onRemove,
}: DraggableImageProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "IMAGE",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "IMAGE",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveImage(item.index, index);
        item.index = index;
      }
    },
  });

  // Combine the refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`relative p-2 bg-gray-800 rounded-lg ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <img
        src={file.preview}
        alt={`Screenshot ${index + 1}`}
        className="w-full h-auto object-contain rounded-md"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 px-3 py-1 rounded-full">
        <span className="text-white text-sm">Part {index + 1}</span>
      </div>
      <button
        onClick={() => onRemove(file.id)}
        className="absolute top-4 right-4 p-1 bg-red-500 rounded-full hover:bg-red-600"
      >
        <Trash2 className="h-4 w-4 text-white" />
      </button>
      <div className="absolute top-4 left-4 p-1 bg-gray-900/80 rounded-full">
        <MoveVertical className="h-4 w-4 text-white" />
      </div>
    </div>
  );
};

export default DraggableImage;
