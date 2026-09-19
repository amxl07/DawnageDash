/** Shared by mobile and web. References are durable; signed URLs are display-only. */
export const PHOTO_BUCKET = 'progress_photos';
export const PHOTO_URL_SECONDS = 300;
export const PHOTO_REFRESH_MS = 240_000;
export const PHOTO_COLUMNS = ['front_url', 'back_url', 'side_left_url', 'side_right_url'] as const;
export type PhotoReferences = Record<(typeof PHOTO_COLUMNS)[number], string | null>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.getUTCFullYear() > 0 && parsed.toISOString().slice(0, 10) === value;
}

export function canonicalPhotoReference(reference: string, projectUrl: string, ownerId?: string): string {
  let path = reference;
  if (reference.includes('://')) {
    // Check the raw prefix BEFORE URL parsing: URL() normalizes away ../ segments.
    const origin = new URL(projectUrl).origin;
    const prefix = `${origin}/storage/v1/object/public/${PHOTO_BUCKET}/`;
    if (!reference.startsWith(prefix) || /[?#\\\s]/.test(reference)) throw new Error('Unrecognized photo reference');
    try { path = decodeURIComponent(reference.slice(prefix.length)); }
    catch { throw new Error('Unrecognized photo reference'); }
  }
  const parts = path.split('/');
  if (parts.length !== 3 || !uuid.test(parts[0]) || !validDate(parts[1]) ||
      !/^[a-z0-9_()-]+_[0-9]+\.jpg$/.test(parts[2]) || (ownerId && parts[0] !== ownerId)) {
    throw new Error('Unrecognized photo reference');
  }
  return path;
}

export function photoStoragePath(ownerId: string, date: string, label: string, timestamp = Date.now()): string {
  const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return canonicalPhotoReference(`${ownerId}/${date}/${name}_${timestamp}.jpg`, '', ownerId);
}

export function photoReferencesForSave(fields: PhotoReferences, projectUrl: string, ownerId: string): PhotoReferences {
  return Object.fromEntries(PHOTO_COLUMNS.map((key) => [key, fields[key] === null
    ? null : canonicalPhotoReference(fields[key], projectUrl, ownerId)])) as PhotoReferences;
}

export type PhotoSigner = {
  createSignedUrl(path: string, expiresIn: number): Promise<{
    data: { signedUrl: string } | null;
    error: unknown;
  }>;
};
export type SignedPhoto = { url: string; viewerId: string; expiresAt: number };

export async function signPhoto(
  storage: PhotoSigner, reference: string, projectUrl: string, ownerId: string,
  viewerId: string, now: () => number = Date.now,
): Promise<SignedPhoto> {
  try {
    if (!viewerId) throw new Error();
    const path = canonicalPhotoReference(reference, projectUrl, ownerId);
    const startedAt = now();
    const { data, error } = await storage.createSignedUrl(path, PHOTO_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error();
    const url = new URL(data.signedUrl);
    if (url.origin !== new URL(projectUrl).origin || url.username || url.password || url.hash ||
        !url.searchParams.get('token') ||
        decodeURIComponent(url.pathname) !== `/storage/v1/object/sign/${PHOTO_BUCKET}/${path}`) throw new Error();
    return { url: data.signedUrl, viewerId, expiresAt: startedAt + PHOTO_URL_SECONDS * 1000 };
  } catch {
    // SDK errors may include sensitive object references or tokens.
    throw new Error('Photo access unavailable. Try again.');
  }
}

export function photoUrlForSession(photo: SignedPhoto | undefined, viewerId: string | null | undefined, now = Date.now()): string | null {
  return photo && viewerId && photo.viewerId === viewerId && now < photo.expiresAt ? photo.url : null;
}
