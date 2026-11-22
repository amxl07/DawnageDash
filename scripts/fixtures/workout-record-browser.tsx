// Isolated browser fixture: only fictional in-memory rows, never a backend.
import { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkoutLogDialog } from '../../client/src/components/WorkoutLogDialog';
import { Toaster } from '../../client/src/components/ui/toaster';

export const mobileRecord = {
  version: 2, planDayNumber: 4, sessionMeta: { effort: 'comfortable' },
  exercises: [
    { name: 'Plank', tracking: 'duration', custom: { keep: true }, sets: [
      { setNumber: 1, duration: '60', reps: '', weight: '', rpe: '7', kind: 'work', completed: true, tempo: 'steady' },
    ] },
    { name: 'Squat', tracking: 'weight-reps', sets: [
      { setNumber: 1, reps: '5', weight: '20', rpe: '', duration: '', kind: 'warmup', completed: false, note: 'Not done' },
      { setNumber: 2, reps: '8', weight: 62.25, rpe: '', duration: '', kind: 'work', completed: true },
    ] },
  ],
};

const rows: any[] = [
  { id: 'mobile-a', user_id: 'fixture-a', date: '2026-09-29', title: 'Mobile session A', content: JSON.stringify(mobileRecord) },
  { id: 'mobile-b', user_id: 'fixture-a', date: '2026-09-29', title: 'Mobile session B', content: JSON.stringify(mobileRecord) },
  { id: 'future', user_id: 'fixture-a', date: '2026-09-29', title: 'Future session', content: JSON.stringify({ ...mobileRecord, version: 99 }) },
  { id: 'other-user', user_id: 'fixture-b', date: '2026-09-29', title: 'Other account session', content: JSON.stringify(mobileRecord) },
];
let owner = 'fixture-a';
const listeners = new Set<() => void>();
const fixture: any = {
  rows, original: JSON.parse(rows[0].content), writes: [], hold: false, conflict: false,
  release: () => {}, switchRecord: (_id: string, _user?: string) => {}, open: true,
};
(window as any).workoutFixture = fixture;

export function useAuth() {
  const userId = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => owner);
  return { user: { id: userId, user_metadata: { role: 'client' } }, viewedUserId: null };
}

export const supabase = {
  from(table: string) {
    const filters: [string, unknown][] = [];
    let update: any = null;
    let insertion: any = null;
    let single = false;
    const query: any = {
      select: () => query, order: () => query, limit: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      single: () => { single = true; return query; },
      maybeSingle: () => { single = true; return query; },
      update: (value: unknown) => { update = value; return query; },
      insert: (value: unknown) => { insertion = value; return query; },
      then(resolve: (value: unknown) => void, reject: (error: unknown) => void) {
        return (async () => {
          if (table === 'users') return { data: { active_workout_plan: JSON.stringify({ level: 'Beginner', workoutType: 'Gym', daysPerWeek: 3 }) }, error: null };
          if (table === 'workout_plans') return { data: [{ id: 'plan-1', day_number: 1, focus: 'Strength', exercises: [{ Exercise: 'Squat', Sets: 2 }] }], error: null };
          if (table !== 'workout_logs') return { data: [], error: null };
          let matching = rows.filter(row => filters.every(([key, value]) => row[key] === value));
          if (update || insertion) {
            fixture.writes.push({ filters, values: update ?? insertion, mode: update ? 'update' : 'insert' });
            if (fixture.hold) await new Promise<void>(done => { fixture.release = done; });
            if (fixture.conflict) return { data: null, error: null };
            if (update) matching.forEach(row => Object.assign(row, update));
            else { const row = { id: 'new-fictional-row', ...insertion }; rows.push(row); matching = [row]; }
          }
          return { data: single ? matching[0] ?? null : matching, error: null };
        })().then(resolve, reject);
      },
    };
    return query;
  },
};

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function FixtureApp() {
  const [selected, setSelected] = useState('mobile-a');
  const [open, setOpen] = useState(true);
  fixture.open = open;
  fixture.switchRecord = (id: string, user = 'fixture-a') => {
    owner = user;
    listeners.forEach(listener => listener());
    setSelected(id);
    setOpen(true);
  };
  return <QueryClientProvider client={queryClient}>
    <main style={{ padding: 24 }}>Fictional workout compatibility fixture</main>
    <WorkoutLogDialog open={open} onOpenChange={setOpen} initialDate={new Date(2026, 8, 29)} initialLogId={selected || undefined} />
    <Toaster />
  </QueryClientProvider>;
}
createRoot(document.getElementById('root')!).render(<FixtureApp />);
