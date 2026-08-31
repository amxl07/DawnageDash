/** Defaults on for the trial; set EXPO_PUBLIC_CHECKIN_SINGLE_SCROLL=false to restore the wizard. */
export function isSingleScrollCheckInEnabled(
  value = process.env.EXPO_PUBLIC_CHECKIN_SINGLE_SCROLL,
): boolean {
  return !['false', '0', 'off'].includes((value ?? '').trim().toLowerCase());
}

