import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";

interface PhotoUploadProps {
  label: string;
  onUpload?: (file: File) => void;
  existingPhoto?: string;
}

export function PhotoUpload({ label, onUpload, existingPhoto }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(existingPhoto || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload?.(file);
      console.log('Photo uploaded:', label, file.name);
    }
  };

  return (
    <div className="space-y-2" data-testid={`upload-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <label className="text-sm font-medium">{label}</label>
      <Card className="aspect-square rounded-xl overflow-hidden hover-elevate cursor-pointer relative group">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id={`upload-${label}`}
          data-testid={`input-photo-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
        <label htmlFor={`upload-${label}`} className="cursor-pointer block h-full">
          {preview ? (
            <div className="relative h-full">
              <img src={preview} alt={label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30">
              <div className="p-4 rounded-full bg-muted">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Upload Photo</p>
                <p className="text-xs text-muted-foreground">Click to browse</p>
              </div>
            </div>
          )}
        </label>
      </Card>
    </div>
  );
}
