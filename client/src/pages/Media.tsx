import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Plus, Edit2, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { PrivatePhotoThumbnail } from "@/components/PrivatePhotoThumbnail";
import { PhotosUploadDialog } from "@/components/PhotosUploadDialog";

export default function Media() {
  const { user, viewedUserId } = useAuth();
  const targetUserId = viewedUserId || user?.id;
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch photos
  const { data: weeklyPhotos, isLoading, isError, refetch } = useQuery({
    queryKey: ['weeklyProgressPhotos', user?.id, targetUserId],
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
    enabled: !!targetUserId && !!user?.id,
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

      {isError && <div role="alert">Photo history could not load. <Button onClick={() => void refetch()}>Retry</Button></div>}

      {isEmpty && !isError ? (
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
            // Week 0 is the first/oldest entry (baseline), then Week 1, 2, etc.
            const weekNum = weeklyPhotos.length - 1 - index;
            const isBaseline = weekNum === 0;
            // Check completeness
            const photosCount = [record.front_url, record.back_url, record.side_left_url, record.side_right_url].filter(Boolean).length;
            const isComplete = photosCount === 4;

            return (
              <Card key={record.id} className={`p-4 rounded-2xl hover-elevate group relative ${isBaseline ? 'border-2 border-primary/50' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">{isBaseline ? 'Week 0 (Baseline)' : `Week ${weekNum}`}</h3>
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
                  <PrivatePhotoThumbnail reference={record.front_url} ownerId={record.user_id} label="Front" />
                  <PrivatePhotoThumbnail reference={record.back_url} ownerId={record.user_id} label="Back" />
                  <PrivatePhotoThumbnail reference={record.side_left_url} ownerId={record.user_id} label="Left" />
                  <PrivatePhotoThumbnail reference={record.side_right_url} ownerId={record.user_id} label="Right" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PhotosUploadDialog
        key={`${user?.id}:${selectedDate?.toISOString()}:${isDialogOpen}`}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedDate={selectedDate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

