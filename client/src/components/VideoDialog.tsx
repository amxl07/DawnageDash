import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface VideoDialogProps {
    videoId: string;
    title: string;
    children?: React.ReactNode;
}

export function VideoDialog({ videoId, title, children }: VideoDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        {title}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden bg-black shadow-lg border border-border">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                        title={title}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
