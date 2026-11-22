// Actual web wizard with fictional authentication and database responses only.
import { createRoot } from 'react-dom/client';
import { QuestionnaireWizard } from '../../client/src/components/QuestionnaireWizard';

const userId = '00000000-0000-4000-8000-000000000001';
const fixture = {
  row: {
    id: '00000000-0000-4000-8000-000000000003', user_id: userId,
    answers: JSON.stringify({ q1: '', q2: 32, q3: 175, q4: 72.4, q7: '+91 9999999999', q14: 'Build a training routine', q60: 'Earlier answer', future_answer: { preserved: true } }),
    completed_sections: '[]', status: 'in_progress',
  },
  writes: [] as { payload: Record<string, unknown>; filters: [string, unknown][] }[],
  toasts: [] as { title: string; description?: string }[],
  rejectWrites: false,
  completed: 0,
  profile: { full_name: null, phone_number: null, profile_data: {} } as Record<string, unknown>,
  role: 'client' as 'client' | 'coach',
  remount: () => {},
};
(window as any).assessmentFixture = fixture;
export const useAuth = () => ({ user: { id: userId, user_metadata: { role: fixture.role } }, viewedUserId: fixture.role === 'coach' ? userId : null });
export const useToast = () => ({ toast: (message: { title: string; description?: string }) => fixture.toasts.push(message) });
export const supabase = {
  from(table: string) {
    const filters: [string, unknown][] = [];
    let payload: Record<string, unknown> | undefined;
    const query: any = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      update: (value: Record<string, unknown>) => { payload = value; return query; },
      insert: (value: Record<string, unknown>) => { payload = value; return query; },
      maybeSingle: async () => {
        if (table === 'users') return { data: fixture.profile, error: null };
        if (table !== 'onboarding_questionnaire') throw new Error('Unexpected fixture table: ' + table);
        const matches = filters.every(([key, value]) => (fixture.row as any)[key] === value);
        if (payload) {
          fixture.writes.push({ payload, filters });
          if (fixture.rejectWrites || !matches) return { data: null, error: null };
          fixture.row = { ...fixture.row, ...payload };
        }
        return { data: matches ? { ...fixture.row } : null, error: null };
      },
    };
    return query;
  },
};

const root = createRoot(document.getElementById('root')!);
let mountRevision = 0;
fixture.remount = () => root.render(
  <main style={{ padding: 24, height: '100dvh', overflowY: 'auto', boxSizing: 'border-box' }}>
    <QuestionnaireWizard key={++mountRevision} onComplete={() => { fixture.completed += 1; }} />
  </main>,
);
fixture.remount();
