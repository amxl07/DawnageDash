import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from './supabase';

export const BUCKET = 'progress_photos';
export const MAX_WIDTH = 1200;
export const MAX_HEIGHT = 1600;
export const JPEG_QUALITY = 0.75;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export type AngleKey = 'front' | 'back' | 'side_left' | 'side_right';

export const ANGLES: { key: AngleKey; label: string; column: string }[] = [
  { key: 'front', label: 'Front', column: 'front_url' },
  { key: 'back', label: 'Back', column: 'back_url' },
  { key: 'side_left', label: 'Left', column: 'side_left_url' },
  { key: 'side_right', label: 'Right', column: 'side_right_url' },
];

/**
 * Replicates the web's canvas compressImage(): fit inside 1200×1600, JPEG q0.75.
 * Only the width is constrained here — expo-image-manipulator preserves aspect
 * ratio, and portrait photos hit the height bound first, so we pick whichever
 * dimension actually needs shrinking.
 */
export async function compressImage(
  uri: string,
  width?: number,
  height?: number,
): Promise<{ uri: string; bytes: number }> {
  const resize =
    width && height
      ? width / height > MAX_WIDTH / MAX_HEIGHT
        ? { width: Math.min(width, MAX_WIDTH) }
        : { height: Math.min(height, MAX_HEIGHT) }
      : { width: MAX_WIDTH };

  const result = await ImageManipulator.manipulateAsync(uri, [{ resize }], {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const response = await fetch(result.uri);
  const blob = await response.blob();
  return { uri: result.uri, bytes: blob.size };
}

/** Path shape must match the web exactly: userId/date/label_timestamp.jpg */
export function storagePath(userId: string, dateStr: string, label: string): string {
  return `${userId}/${dateStr}/${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.jpg`;
}

export async function uploadPhoto(
  localUri: string,
  userId: string,
  dateStr: string,
  label: string,
  dimensions?: { width: number; height: number },
): Promise<{ publicUrl: string; bytes: number }> {
  const { uri, bytes } = await compressImage(localUri, dimensions?.width, dimensions?.height);

  // RN has no File; supabase-js accepts an ArrayBuffer for storage uploads.
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const path = storagePath(userId, dateStr, label);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl, bytes };
}
