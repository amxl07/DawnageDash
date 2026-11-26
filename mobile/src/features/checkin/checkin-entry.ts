export type CheckInEntryParams = { date?: string | string[]; history?: string | string[]; edit?: string | string[] };
type Entry = { destination: 'hub'; history?: true } | { destination: 'editor'; params: { date: string | string[]; history?: string } };

/** Keep malformed dates intact so the single editor owns visible validation. */
export function resolveCheckInEntry(params: CheckInEntryParams, today: string): Entry {
  if (params.date !== undefined || params.edit === '1') {
    return { destination: 'editor', params: { date: params.date ?? today, ...(params.history === '1' ? { history: '1' } : {}) } };
  }
  return { destination: 'hub', ...(params.history === '1' ? { history: true as const } : {}) };
}
