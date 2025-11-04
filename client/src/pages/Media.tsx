import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image as ImageIcon, Calendar, X } from "lucide-react";

interface ProgressPhoto {
  id: number;
  date: string;
  week: number;
  view: string;
  url?: string;
}

export default function Media() {
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);

  const progressPhotos: ProgressPhoto[] = [
    { id: 1, date: 'Jan 29, 2025', week: 4, view: 'Front' },
    { id: 2, date: 'Jan 29, 2025', week: 4, view: 'Back' },
    { id: 3, date: 'Jan 29, 2025', week: 4, view: 'Left' },
    { id: 4, date: 'Jan 29, 2025', week: 4, view: 'Right' },
    { id: 5, date: 'Jan 22, 2025', week: 3, view: 'Front' },
    { id: 6, date: 'Jan 22, 2025', week: 3, view: 'Back' },
    { id: 7, date: 'Jan 22, 2025', week: 3, view: 'Left' },
    { id: 8, date: 'Jan 22, 2025', week: 3, view: 'Right' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-media-title">Progress Photos</h1>
        <p className="text-muted-foreground">Visual documentation of your transformation journey</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {progressPhotos.map((photo) => (
          <Card
            key={photo.id}
            className="overflow-hidden rounded-2xl hover-elevate cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
            data-testid={`card-photo-${photo.id}`}
          >
            <div className="aspect-square bg-muted/30 flex items-center justify-center relative group">
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="secondary" className="rounded-full">
                  Week {photo.week}
                </Badge>
              </div>
              <div className="absolute top-3 right-3 z-10">
                <Badge variant="outline" className="rounded-full bg-background/80 backdrop-blur-sm">
                  {photo.view}
                </Badge>
              </div>
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="p-4 rounded-full bg-muted">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No photo</p>
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{photo.date}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Week {selectedPhoto.week} - {selectedPhoto.view} View</h3>
                  <p className="text-sm text-muted-foreground">{selectedPhoto.date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPhoto(null)}
                  data-testid="button-close-photo"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="aspect-square bg-muted/30 rounded-xl flex items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-6 rounded-full bg-muted">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No photo uploaded</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
