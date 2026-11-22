/**
 * Applies a partial profile_data change without erasing fields owned by
 * onboarding, assessment, or newer clients. Explicit null clears a value;
 * undefined means the caller omitted that field.
 */
export function mergeProfileData(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );

  return { ...(current ?? {}), ...defined };
}
