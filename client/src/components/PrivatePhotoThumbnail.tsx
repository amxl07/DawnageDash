import { Image as ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivatePhotoUrl } from '@/hooks/usePrivatePhotoUrl';

export function PrivatePhotoThumbnail({ reference, ownerId, label }: { reference: string | null; ownerId: string; label: string }) {
  const photo = usePrivatePhotoUrl(reference, ownerId);
  if (!photo.url) return (
    <div className="aspect-[3/4] bg-muted/30 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-muted">
      <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
      {reference && <button type="button" onClick={() => void photo.refresh()} disabled={photo.loading} className="text-xs min-h-11">{photo.loading ? 'Loading…' : 'Retry photo'}</button>}
    </div>
  );
  return (
    <div className="relative aspect-[3/4] rounded-lg overflow-hidden group border border-border">
      <img key={photo.url} src={photo.url} referrerPolicy="no-referrer" alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <a href={photo.url} download target="_blank" rel="noreferrer"><Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" aria-label={`Download ${label} photo`}><Download className="w-4 h-4" /></Button></a>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2"><span className="text-[10px] text-white font-medium uppercase">{label}</span></div>
    </div>
  );
}
