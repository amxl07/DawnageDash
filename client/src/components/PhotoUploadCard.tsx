import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Image as ImageIcon, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivatePhotoUrl } from "@/hooks/usePrivatePhotoUrl";
import { PHOTO_BUCKET, photoStoragePath } from "@shared/progress-photos";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const JPEG_QUALITY = 0.75;

function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const sourceUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(sourceUrl);
            let { width, height } = img;

            // Scale down if exceeds max dimensions
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                },
                'image/jpeg',
                JPEG_QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(sourceUrl); reject(new Error('Failed to load image')); };
        img.src = sourceUrl;
    });
}

interface PhotoUploadCardProps {
    label: string;
    currentReference?: string | null;
    onUpload: (url: string) => void;
    onDelete: () => void;
    onUploadingChange?: (uploading: boolean) => void;
    disabled?: boolean;
    userId: string;
    dateStr: string;
}

export function PhotoUploadCard({
    label,
    currentReference,
    onUpload,
    onDelete,
    onUploadingChange,
    disabled = false,
    userId,
    dateStr
}: PhotoUploadCardProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const photo = usePrivatePhotoUrl(currentReference, userId);
    const scope = `${user?.id}:${userId}:${dateStr}`;
    const activeScope = useRef<string | null>(scope);
    activeScope.current = scope;
    useEffect(() => { activeScope.current = scope; return () => { activeScope.current = null; }; }, [scope]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const editingDisabled = disabled || isUploading || user?.id !== userId;

    // Helper to trigger file input
    const handleVerifyClick = () => {
        if (editingDisabled || activeScope.current !== scope) return;
        fileInputRef.current?.click();
    };

    const handleRemove = () => {
        if (editingDisabled || activeScope.current !== scope) return;
        onDelete();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || editingDisabled || activeScope.current !== scope) return;
        const operationScope = scope;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid file type",
                description: "Please upload an image file (JPEG, PNG, etc.)",
                variant: "destructive",
            });
            return;
        }

        // Validate size (e.g. 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Image size must be less than 10MB",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        onUploadingChange?.(true);
        try {
            // Compress the image before uploading
            const compressedBlob = await compressImage(file);

            if (activeScope.current !== operationScope) return;
            const fileName = photoStoragePath(userId, dateStr, label);

            const { error: uploadError } = await supabase.storage
                .from(PHOTO_BUCKET)
                .upload(fileName, compressedBlob, {
                    upsert: false,
                    cacheControl: '0',
                    contentType: 'image/jpeg',
                });

            if (uploadError) throw uploadError;

            if (activeScope.current !== operationScope) return;
            onUpload(fileName);
            toast({
                title: "Success",
                description: `Photo compressed & uploaded (${(compressedBlob.size / 1024).toFixed(0)}KB)`,
            });

        } catch (error: any) {
            if (activeScope.current !== operationScope) return;
            toast({
                title: "Upload Failed",
                description: "Failed to upload photo. Please try again.",
                variant: "destructive",
            });
        } finally {
            if (activeScope.current !== operationScope) return;
            setIsUploading(false);
            onUploadingChange?.(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const editActions = (
        <>
            <Button
                size="icon"
                variant="secondary"
                className="rounded-full h-8 w-8"
                onClick={handleVerifyClick}
                disabled={editingDisabled}
                title="Replace"
                aria-label={`Replace ${label} photo`}
                type="button"
            >
                <Upload className="w-4 h-4" />
            </Button>
            <Button
                size="icon"
                variant="destructive"
                className="rounded-full h-8 w-8"
                onClick={handleRemove}
                disabled={editingDisabled}
                title="Remove"
                aria-label={`Remove ${label} photo`}
                type="button"
            >
                <X className="w-4 h-4" />
            </Button>
        </>
    );

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>

            <div
                className={cn(
                    "relative aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors bg-muted/20 hover:bg-muted/40 overflow-hidden group",
                    currentReference ? "border-solid border-border" : "border-muted"
                )}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={editingDisabled}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Uploading...</span>
                    </div>
                ) : photo.url ? (
                    <>
                        <img
                            src={photo.url}
                            referrerPolicy="no-referrer"
                            alt={label}
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {editActions}
                            <a
                                href={photo.url}
                                download={`progress_photo_${label}.jpg`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="rounded-full h-8 w-8"
                                    title="Download"
                                    type="button"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </a>
                        </div>
                    </>
                ) : currentReference ? (
                    <div className="flex flex-col items-center gap-3 p-3">
                        <Button type="button" onClick={() => void photo.refresh()} disabled={photo.loading}>{photo.loading ? "Loading…" : "Retry photo"}</Button>
                        <div className="flex items-center gap-2">{editActions}</div>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center gap-2 cursor-pointer p-4 text-center w-full h-full justify-center"
                        onClick={handleVerifyClick}
                    >
                        <div className="p-3 rounded-full bg-muted shadow-sm group-hover:shadow-md transition-all">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">Click to upload</span>
                    </div>
                )}
            </div>
        </div>
    );
}
