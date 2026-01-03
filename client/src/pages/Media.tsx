import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Calendar, Plus, Edit2, Download, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { PhotosUploadDialog } from "@/components/PhotosUploadDialog";

export default function Media() {
  const { user, viewedUserId } = useAuth();
  const targetUserId = viewedUserId || user?.id;
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch photos
  const { data: weeklyPhotos, isLoading } = useQuery({
    queryKey: ['weeklyProgressPhotos', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('weekly_progress_photos')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const handleLogPhotos = () => {
    setSelectedDate(undefined);
    setIsDialogOpen(true);
  };

  const handleEditPhotos = (dateStr: string) => {
    setSelectedDate(new Date(dateStr));
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['weeklyProgressPhotos'] });
  };

  const renderPhotoThumbnail = (url: string | null, label: string) => {
    if (!url) {
      return (
        <div className="aspect-[3/4] bg-muted/30 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-muted">
          <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
        </div>
      );
    }

    return (
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden group border border-border">
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <a href={url} download target="_blank" rel="noreferrer">
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
              <Download className="w-4 h-4" />
            </Button>
          </a>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2">
          <span className="text-[10px] text-white font-medium uppercase">{label}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading photos...</p>
        </div>
      </div>
    );
  }

  const isEmpty = !weeklyPhotos || weeklyPhotos.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2" data-testid="text-media-title">Progress Photos</h1>
          <p className="text-sm md:text-base text-muted-foreground">Visual documentation of your transformation journey</p>
        </div>
        {!viewedUserId && (
          <Button onClick={handleLogPhotos} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Log New Photos
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="p-8 text-center max-w-md">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Photos Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start documenting your progress by uploading your first set of photos.
            </p>
            {!viewedUserId && (
              <Button onClick={handleLogPhotos}>
                Log First Set
              </Button>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {weeklyPhotos?.map((record, index) => {
            const weekNum = weeklyPhotos.length - index;
            // Check completeness
            const photosCount = [record.front_url, record.back_url, record.side_left_url, record.side_right_url].filter(Boolean).length;
            const isComplete = photosCount === 4;

            return (
              <Card key={record.id} className="p-4 rounded-2xl hover-elevate group relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">Week {weekNum}</h3>
                      <Badge variant="outline" className="rounded-full">
                        {new Date(record.date).toLocaleDateString()}
                      </Badge>
                    </div>
                    {!isComplete && (
                      <div className="flex items-center gap-1 text-xs text-orange-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>{photosCount}/4 photos</span>
                      </div>
                    )}
                  </div>
                  {!viewedUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPhotos(record.date)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {renderPhotoThumbnail(record.front_url, "Front")}
                  {renderPhotoThumbnail(record.back_url, "Back")}
                  {renderPhotoThumbnail(record.side_left_url, "Left")}
                  {renderPhotoThumbnail(record.side_right_url, "Right")}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PhotosUploadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedDate={selectedDate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

