export type Supplement = { id: string; name: string; serving: string; timing: string };

export type SupplementResult =
  | { kind: 'ready'; items: Supplement[] }
  | { kind: 'invalid' };

/** Missing optional instructions are valid; unreadable prescriptions are not empty. */
export function readSupplements(raw: string | null): SupplementResult {
  if (!raw?.trim()) return { kind: 'ready', items: [] };
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return { kind: 'invalid' };
    const items: Supplement[] = [];
    for (const [index, value] of data.entries()) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { kind: 'invalid' };
      const item = value as Record<string, unknown>;
      if (typeof item.name !== 'string' || !item.name.trim()) return { kind: 'invalid' };
      if (['id', 'serving', 'timing'].some((key) => item[key] != null && typeof item[key] !== 'string')) {
        return { kind: 'invalid' };
      }
      items.push({
        id: typeof item.id === 'string' ? item.id : String(index),
        name: item.name,
        serving: typeof item.serving === 'string' ? item.serving : '',
        timing: typeof item.timing === 'string' ? item.timing : '',
      });
    }
    return { kind: 'ready', items };
  } catch {
    return { kind: 'invalid' };
  }
}

/** Compatibility accessor for consumers that only need available values. */
export function parseSupplements(raw: string | null): Supplement[] {
  const result = readSupplements(raw);
  return result.kind === 'ready' ? result.items : [];
}
