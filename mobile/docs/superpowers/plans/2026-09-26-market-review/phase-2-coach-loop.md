# Phase 2: Coach loop implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. Task 2.1 is a **🔒 OWNER GATE**. Tasks 2.2–2.6 can be written and tested before the SQL is applied, because every screen handles "messages unavailable" calmly.

**Goal:** Make the coach present (F2, X1):
- a private message thread with the coach
- messages pinned to a specific check-in, workout or week
- the coach's reply shown next to the weekly feedback it answers
- a "From your coach" card on Home

**Architecture:**
- **Data:** one new table, `coach_messages`, with RLS, plus one `SECURITY DEFINER` RPC that marks messages read.
- **Mobile:**
  - A pure model module (`coach-messages.ts`).
  - React Query hooks (`useCoachThread.ts`) that poll every 60 seconds while the screen is open. No realtime, no push.
  - One screen (`CoachScreen.tsx`) mounted at `app/(app)/coach.tsx`. Phase 7 turns it into a tab by changing one constant in `routes.ts`.

**Tech stack:** Supabase Postgres + RLS, supabase-js `from().select/insert`, `rpc()`, @tanstack/react-query v5, expo-router `useLocalSearchParams` / `useFocusEffect`, date-fns `format`.

**Spec:** [F2 and X1](../../specs/2026-09-26-market-review-findings.md#f2-p0-the-coach-is-invisible).

**Files in this phase:**

| File | Responsibility |
|---|---|
| `mobile/plans/sql/2026-09-26_coach_messages.sql` | Table, RLS, RPC (owner applies) |
| `src/features/coach/coach-messages.ts` (+ `.test.ts`) | Types, validation, unread/replies/context helpers |
| `src/features/coach/useCoachThread.ts` (+ `.test.tsx`) | Query, send and mark-read hooks |
| `src/features/coach/routes.ts` | The single place that knows the coach route |
| `src/features/coach/CoachScreen.tsx` (+ `.test.tsx`) | Thread + composer |
| `src/features/coach/AskCoachButton.tsx` | "Ask your coach about this" entry point |
| `src/features/coach/CoachMessageCard.tsx` | Home card for the latest unread coach message |
| `app/(app)/coach.tsx` | Route (moved into tabs in Phase 7) |

---

### Task 2.1: `coach_messages` table, RLS and mark-read RPC 🔒 OWNER GATE

**Files:**
- Create: `mobile/plans/sql/2026-09-26_coach_messages.sql`

**Interfaces:**
- Produces:
  - Table `public.coach_messages(id uuid, client_id uuid, sender_id uuid, body text, context_type text null, context_id text null, context_date date null, created_at timestamptz, read_at timestamptz null)`
  - RPC `public.mark_coach_messages_read(p_client_id uuid) returns integer`

- [ ] **Step 1: Write the SQL file**

```sql
-- ============================================================================
-- Dawnage 2026-09-26 · Coach messages (client <-> assigned coach)
-- Additive only: one new table, policies on that table, one function.
-- Reversible:
--   DROP FUNCTION IF EXISTS public.mark_coach_messages_read(uuid);
--   DROP TABLE IF EXISTS public.coach_messages;
-- Depends on: public.is_coach_of(uuid) (sqlmigrationfiles/enable_coach_view_access.sql)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body         text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  -- What the message is about. NULL = general conversation.
  context_type text CHECK (context_type IN ('daily_check_in', 'weekly_check_in', 'workout_log', 'progress_photo', 'workout_set')),
  context_id   text,
  context_date date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz
);

CREATE INDEX IF NOT EXISTS coach_messages_client_created_idx
  ON public.coach_messages (client_id, created_at DESC);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_messages FROM anon;
GRANT SELECT, INSERT ON public.coach_messages TO authenticated;

-- Client: read and write only their own thread, only as themselves.
CREATE POLICY coach_messages_client_read ON public.coach_messages
  FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY coach_messages_client_write ON public.coach_messages
  FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid() AND sender_id = auth.uid());

-- Coach: read and write threads of assigned clients, only as themselves.
CREATE POLICY coach_messages_coach_read ON public.coach_messages
  FOR SELECT TO authenticated USING (public.is_coach_of(client_id));
CREATE POLICY coach_messages_coach_write ON public.coach_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_coach_of(client_id));

-- Admin: read everything (support).
CREATE POLICY coach_messages_admin_read ON public.coach_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users a WHERE a.id = auth.uid() AND a.role = 'admin'));

-- No UPDATE/DELETE policies: messages are immutable. Read state changes only here.
CREATE OR REPLACE FUNCTION public.mark_coach_messages_read(p_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = p_client_id OR public.is_coach_of(p_client_id)) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE public.coach_messages
     SET read_at = now()
   WHERE client_id = p_client_id
     AND sender_id <> auth.uid()
     AND read_at IS NULL;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_coach_messages_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_coach_messages_read(uuid) TO authenticated;

-- ============================================================================
-- VERIFY (owner):
-- 1. As client A: INSERT a message with client_id = A, sender_id = A → succeeds.
-- 2. As client A: INSERT with client_id = B → fails (RLS).
-- 3. As A's coach: SELECT * FROM coach_messages WHERE client_id = A → sees it.
-- 4. As another coach: same SELECT → 0 rows.
-- 5. As A: SELECT public.mark_coach_messages_read(A) → returns count of coach messages marked.
-- ============================================================================
```

- [ ] **Step 2: Show the file to the owner and stop.** Continue with Tasks 2.2–2.6 while waiting. They don't need the table to exist.
- [ ] **Step 3: Commit**

```bash
git add plans/sql/2026-09-26_coach_messages.sql
git commit -m "chore(mobile): add coach_messages SQL for owner review"
```

---

### Task 2.2: Message model (pure)

**Files:**
- Create: `src/features/coach/coach-messages.ts`
- Test: `src/features/coach/coach-messages.test.ts`

**Interfaces:**
- Produces:
  - `COACH_MESSAGE_CONTEXTS`
  - `type CoachMessageContextType`
  - `type CoachMessage`
  - `type MessageContext = { type: CoachMessageContextType; id: string | null; date: string | null }`
  - `MESSAGE_MAX_LENGTH = 4000`
  - `messageBodyError(body: string): string | null`
  - `isFromCoach(message: CoachMessage, clientId: string): boolean`
  - `unreadFromCoach(messages: readonly CoachMessage[], clientId: string): CoachMessage[]`
  - `repliesFor(messages: readonly CoachMessage[], type: CoachMessageContextType, id: string): CoachMessage[]`
  - `contextLabel(context: { type: CoachMessageContextType | null; date: string | null }): string | null`
  - `parseContextParams(params: { contextType?: string | string[]; contextId?: string | string[]; contextDate?: string | string[] }): MessageContext | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/coach/coach-messages.test.ts
import { contextLabel, messageBodyError, parseContextParams, repliesFor, unreadFromCoach, type CoachMessage } from './coach-messages';

const base: CoachMessage = { id: 'm1', client_id: 'client', sender_id: 'client', body: 'Hi', context_type: null, context_id: null, context_date: null, created_at: '2026-09-26T08:00:00Z', read_at: null };

it('rejects blank and oversized bodies', () => {
  expect(messageBodyError('   ')).toBe('Write a message first.');
  expect(messageBodyError('x'.repeat(4001))).toBe('Keep messages under 4000 characters.');
  expect(messageBodyError(' Hello ')).toBeNull();
});

it('counts only unread messages sent by someone other than the client', () => {
  const messages = [base, { ...base, id: 'm2', sender_id: 'coach' }, { ...base, id: 'm3', sender_id: 'coach', read_at: '2026-09-26T09:00:00Z' }];
  expect(unreadFromCoach(messages, 'client').map((m) => m.id)).toEqual(['m2']);
});

it('finds replies pinned to a context', () => {
  const messages = [{ ...base, id: 'a', context_type: 'weekly_check_in' as const, context_id: 'w1' }, { ...base, id: 'b', context_type: 'weekly_check_in' as const, context_id: 'w2' }];
  expect(repliesFor(messages, 'weekly_check_in', 'w1').map((m) => m.id)).toEqual(['a']);
});

it('labels contexts with a local date', () => {
  expect(contextLabel({ type: 'daily_check_in', date: '2026-09-15' })).toBe('About your check-in · 15 Sep');
  expect(contextLabel({ type: 'workout_log', date: null })).toBe('About your workout');
  expect(contextLabel({ type: null, date: null })).toBeNull();
});

it('parses route params and ignores unknown context types and bad dates', () => {
  expect(parseContextParams({ contextType: 'workout_log', contextId: 'log-1', contextDate: '2026-09-15' })).toEqual({ type: 'workout_log', id: 'log-1', date: '2026-09-15' });
  expect(parseContextParams({ contextType: 'hack', contextId: 'x' })).toBeNull();
  expect(parseContextParams({ contextType: ['daily_check_in'], contextDate: 'not-a-date' })).toEqual({ type: 'daily_check_in', id: null, date: null });
  expect(parseContextParams({})).toBeNull();
});
```

- [ ] **Step 2: Run it and confirm it fails**
  Run: `npx jest src/features/coach/coach-messages.test.ts --runInBand`
  Expected: FAIL with "Cannot find module './coach-messages'".
- [ ] **Step 3: Implement**

```ts
// src/features/coach/coach-messages.ts
import { format } from 'date-fns';

import { isDateKeyStrict, parseLocalDate } from '@/lib/dates';

export const COACH_MESSAGE_CONTEXTS = ['daily_check_in', 'weekly_check_in', 'workout_log', 'progress_photo', 'workout_set'] as const;
export type CoachMessageContextType = (typeof COACH_MESSAGE_CONTEXTS)[number];

/** Row shape of public.coach_messages (plans/sql/2026-09-26_coach_messages.sql). */
export type CoachMessage = {
  id: string;
  client_id: string;
  sender_id: string;
  body: string;
  context_type: CoachMessageContextType | null;
  context_id: string | null;
  context_date: string | null;
  created_at: string;
  read_at: string | null;
};

export type MessageContext = { type: CoachMessageContextType; id: string | null; date: string | null };

export const MESSAGE_MAX_LENGTH = 4000;

export function messageBodyError(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return 'Write a message first.';
  if (trimmed.length > MESSAGE_MAX_LENGTH) return `Keep messages under ${MESSAGE_MAX_LENGTH} characters.`;
  return null;
}

export const isFromCoach = (message: CoachMessage, clientId: string) => message.sender_id !== clientId;

export function unreadFromCoach(messages: readonly CoachMessage[], clientId: string): CoachMessage[] {
  return messages.filter((message) => isFromCoach(message, clientId) && message.read_at === null);
}

export function repliesFor(messages: readonly CoachMessage[], type: CoachMessageContextType, id: string): CoachMessage[] {
  return messages.filter((message) => message.context_type === type && message.context_id === id);
}

const CONTEXT_NOUN: Record<CoachMessageContextType, string> = {
  daily_check_in: 'check-in',
  weekly_check_in: 'weekly feedback',
  workout_log: 'workout',
  progress_photo: 'progress photos',
  workout_set: 'set',
};

export function contextLabel(context: { type: CoachMessageContextType | null; date: string | null }): string | null {
  if (!context.type) return null;
  const noun = CONTEXT_NOUN[context.type];
  return context.date && isDateKeyStrict(context.date)
    ? `About your ${noun} · ${format(parseLocalDate(context.date), 'd MMM')}`
    : `About your ${noun}`;
}

type Param = string | string[] | undefined;
const first = (value: Param) => (Array.isArray(value) ? value[0] : value) || null;

export function parseContextParams(params: { contextType?: Param; contextId?: Param; contextDate?: Param }): MessageContext | null {
  const type = first(params.contextType);
  if (!type || !(COACH_MESSAGE_CONTEXTS as readonly string[]).includes(type)) return null;
  const date = first(params.contextDate);
  return { type: type as CoachMessageContextType, id: first(params.contextId), date: date && isDateKeyStrict(date) ? date : null };
}
```

- [ ] **Step 4: Run the test**
  Run: `npx jest src/features/coach/coach-messages.test.ts --runInBand`. Expected: PASS (5 tests).
- [ ] **Step 5: Commit**

```bash
git add src/features/coach/coach-messages.ts src/features/coach/coach-messages.test.ts
git commit -m "feat(mobile): add coach message model"
```

---

### Task 2.3: Thread hooks (query, send, mark read)

**Files:**
- Create: `src/features/coach/useCoachThread.ts`
- Test: `src/features/coach/useCoachThread.test.tsx`

**Interfaces:**
- Consumes: `CoachMessage`, `MessageContext` and `messageBodyError` from Task 2.2.
- Produces:
  - `coachMessagesKey(userId: string | undefined)`, which returns `['coachMessages', userId]`
  - `useCoachMessages(options?: { poll?: boolean })`: a React Query result whose `data` is `CoachMessage[]` sorted oldest → newest (latest 200)
  - `useSendCoachMessage()`: a mutation taking `{ body: string; context: MessageContext | null }`
  - `useMarkCoachMessagesRead()`: a mutation taking no variables and returning `number`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/coach/useCoachThread.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCoachMessages, useMarkCoachMessagesRead, useSendCoachMessage } from './useCoachThread';

const mockLimit = jest.fn();
const mockInsert = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'client-1' } }) }));
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args), rpc: (...args: unknown[]) => mockRpc(...args) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'order']) builder[method] = jest.fn(() => builder);
  builder.limit = mockLimit;
  builder.insert = mockInsert;
  mockFrom.mockReturnValue(builder);
  mockLimit.mockResolvedValue({ data: [
    { id: 'new', created_at: '2026-09-26T10:00:00Z' },
    { id: 'old', created_at: '2026-09-25T10:00:00Z' },
  ], error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ data: 2, error: null });
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it('returns the latest messages oldest-first', async () => {
  const view = await renderHook(() => useCoachMessages(), { wrapper });
  await waitFor(() => expect(view.result.current.data).toBeDefined());
  expect(mockFrom).toHaveBeenCalledWith('coach_messages');
  expect(view.result.current.data?.map((m) => m.id)).toEqual(['old', 'new']);
});

it('sends a trimmed message as the signed-in client with its context', async () => {
  const view = await renderHook(() => useSendCoachMessage(), { wrapper });
  await act(async () => {
    await view.result.current.mutateAsync({ body: '  Knee felt sore  ', context: { type: 'workout_log', id: 'log-1', date: '2026-09-26' } });
  });
  expect(mockInsert).toHaveBeenCalledWith({
    client_id: 'client-1', sender_id: 'client-1', body: 'Knee felt sore',
    context_type: 'workout_log', context_id: 'log-1', context_date: '2026-09-26',
  });
});

it('rejects a blank message without calling the database', async () => {
  const view = await renderHook(() => useSendCoachMessage(), { wrapper });
  await act(async () => {
    await expect(view.result.current.mutateAsync({ body: '   ', context: null })).rejects.toThrow('Write a message first.');
  });
  expect(mockInsert).not.toHaveBeenCalled();
});

it('marks coach messages read through the RPC', async () => {
  const view = await renderHook(() => useMarkCoachMessagesRead(), { wrapper });
  let count = 0;
  await act(async () => { count = await view.result.current.mutateAsync(); });
  expect(mockRpc).toHaveBeenCalledWith('mark_coach_messages_read', { p_client_id: 'client-1' });
  expect(count).toBe(2);
});
```

- [ ] **Step 2: Run it and confirm it fails**
  Run: `npx jest src/features/coach/useCoachThread.test.tsx --runInBand`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement**

```ts
// src/features/coach/useCoachThread.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import { messageBodyError, type CoachMessage, type MessageContext } from './coach-messages';

const THREAD_LIMIT = 200;

export const coachMessagesKey = (userId: string | undefined) => ['coachMessages', userId] as const;

/** Latest THREAD_LIMIT messages, oldest first. Polls only when asked (thread screen open). */
export function useCoachMessages(options: { poll?: boolean } = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: coachMessagesKey(userId),
    queryFn: async (): Promise<CoachMessage[]> => {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('client_id', userId!)
        .order('created_at', { ascending: false })
        .limit(THREAD_LIMIT);
      if (error) throw error;
      return ((data ?? []) as CoachMessage[]).reverse();
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    // ponytail: polling, not realtime. Add a Supabase channel if replies must appear instantly.
    refetchInterval: options.poll ? 60_000 : false,
    retry: false,
  });
}

export function useSendCoachMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, context }: { body: string; context: MessageContext | null }) => {
      const problem = messageBodyError(body);
      if (problem) throw new Error(problem);
      if (!user?.id) throw new Error('Sign in to message your coach.');
      const { error } = await supabase.from('coach_messages').insert({
        client_id: user.id,
        sender_id: user.id,
        body: body.trim(),
        context_type: context?.type ?? null,
        context_id: context?.id ?? null,
        context_date: context?.date ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachMessagesKey(user?.id) }),
  });
}

export function useMarkCoachMessagesRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      if (!user?.id) return 0;
      const { data, error } = await supabase.rpc('mark_coach_messages_read', { p_client_id: user.id });
      if (error) throw error;
      return Number(data) || 0;
    },
    onSuccess: (count) => {
      if (count > 0) void queryClient.invalidateQueries({ queryKey: coachMessagesKey(user?.id) });
    },
  });
}
```

- [ ] **Step 4: Run the test**
  Run: `npx jest src/features/coach/useCoachThread.test.tsx --runInBand`. Expected: PASS (4 tests).
- [ ] **Step 5: Commit**

```bash
git add src/features/coach/useCoachThread.ts src/features/coach/useCoachThread.test.tsx
git commit -m "feat(mobile): add coach thread hooks"
```

---

### Task 2.4: Coach screen and route

**Files:**
- Create: `src/features/coach/routes.ts`
- Create: `src/features/coach/CoachScreen.tsx`
- Create: `app/(app)/coach.tsx`
- Modify: `app/(app)/_layout.tsx:413` (the `nativeHeader` path list)
- Test: `src/features/coach/CoachScreen.test.tsx`

**Interfaces:**
- Consumes: Tasks 2.2 and 2.3, and `useCoach()` from `@/hooks/useCoach` (returns `{ data?: CoachLookup }`).
- Produces:
  - `COACH_PATHNAME: '/(app)/coach'` (Phase 7 changes this to `'/(app)/(tabs)/coach'`)
  - `coachHref(context?: MessageContext): Href`
  - `CoachScreen` (default export of the route)

- [ ] **Step 1: Write the failing test.** It covers Review Focus items 2 and 4.

```tsx
// src/features/coach/CoachScreen.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load primitives lazily. */
import { fireEvent, render } from '@testing-library/react-native';

import type { CoachMessage } from './coach-messages';
import { CoachScreen } from './CoachScreen';

const mockSend = jest.fn();
const mockMarkRead = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string> = {};
let mockCoach: { data?: unknown } = {};
let mockMessages: { data?: CoachMessage[]; isLoading: boolean; isError: boolean; refetch: jest.Mock } = { data: [], isLoading: false, isError: false, refetch: jest.fn() };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: mockSetParams, push: jest.fn() }),
  useFocusEffect: (effect: () => void) => { require('react').useEffect(effect, [effect]); },
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'client-1' } }) }));
jest.mock('@/hooks/useCoach', () => ({ useCoach: () => mockCoach }));
jest.mock('./useCoachThread', () => ({
  useCoachMessages: () => mockMessages,
  useSendCoachMessage: () => ({ mutate: mockSend, isPending: false }),
  useMarkCoachMessagesRead: () => ({ mutate: mockMarkRead }),
}));
jest.mock('lucide-react-native', () => ({ MessageSquareText: () => null, X: () => null }));
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').light }) }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text, TextInput, View } = require('react-native');
  const { forwardRef } = require('react');
  return {
    Text,
    Screen: forwardRef(({ children }: { children: React.ReactNode }, _ref: unknown) => <View>{children}</View>),
    SkeletonCard: () => <Text>Loading</Text>,
    EmptyState: ({ title, message }: { title: string; message?: string }) => <View><Text>{title}</Text>{message ? <Text>{message}</Text> : null}</View>,
    ErrorState: ({ title, onRetry }: { title: string; onRetry?: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={onRetry}><Text>{title}</Text></Pressable>,
    Input: ({ label, ...props }: { label: string }) => <TextInput accessibilityLabel={label} {...props} />,
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress}><Text>{label}</Text></Pressable>
    ),
  };
});

const assigned = { data: { kind: 'assigned', coach: { id: 'coach-1', full_name: 'Jamie Lee', avatar_url: null } } };
const message = (patch: Partial<CoachMessage>): CoachMessage => ({ id: 'm', client_id: 'client-1', sender_id: 'coach-1', body: 'Great week', context_type: null, context_id: null, context_date: null, created_at: '2026-09-26T08:00:00Z', read_at: null, ...patch });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockCoach = assigned;
  mockMessages = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
});

it('shows the unassigned state and hides the composer', async () => {
  mockCoach = { data: { kind: 'unassigned' } };
  const view = await render(<CoachScreen />);
  expect(view.getByText('No coach yet')).toBeTruthy();
  expect(view.queryByLabelText('Message')).toBeNull();
});

it('renders the thread and marks coach messages read when focused', async () => {
  mockMessages = { ...mockMessages, data: [message({ id: 'a', body: 'Great week' })] };
  const view = await render(<CoachScreen />);
  expect(view.getByText('Great week')).toBeTruthy();
  expect(mockMarkRead).toHaveBeenCalledTimes(1);
});

it('keeps the draft text when sending fails', async () => {
  mockSend.mockImplementation((_vars, callbacks) => callbacks.onError(new Error('offline')));
  const view = await render(<CoachScreen />);
  await fireEvent.changeText(view.getByLabelText('Message'), 'Hello coach');
  await fireEvent.press(view.getByRole('button', { name: 'Send' }));
  expect(mockSend).toHaveBeenCalledWith({ body: 'Hello coach', context: null }, expect.any(Object));
  expect(view.getByLabelText('Message').props.value).toBe('Hello coach');
  expect(view.getByText('Couldn’t send. Your message is still here. Try again.')).toBeTruthy();
});

it('sends with the route context and clears everything after success', async () => {
  mockParams = { contextType: 'daily_check_in', contextDate: '2026-09-15' };
  mockSend.mockImplementation((_vars, callbacks) => callbacks.onSuccess());
  const view = await render(<CoachScreen />);
  expect(view.getByText('About your check-in · 15 Sep')).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText('Message'), 'Slept badly');
  await fireEvent.press(view.getByRole('button', { name: 'Send' }));
  expect(mockSend).toHaveBeenCalledWith({ body: 'Slept badly', context: { type: 'daily_check_in', id: null, date: '2026-09-15' } }, expect.any(Object));
  expect(view.getByLabelText('Message').props.value).toBe('');
  expect(mockSetParams).toHaveBeenCalledWith({ contextType: undefined, contextId: undefined, contextDate: undefined });
});

it('shows a calm error with retry when messages cannot load', async () => {
  mockMessages = { ...mockMessages, data: undefined, isError: true };
  const view = await render(<CoachScreen />);
  expect(view.getByText('Messages aren’t available right now')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Retry' }));
  expect(mockMessages.refetch).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it and confirm it fails**
  Run: `npx jest src/features/coach/CoachScreen.test.tsx --runInBand`. Expected: FAIL (module not found).
- [ ] **Step 3: Create the route helper**

```ts
// src/features/coach/routes.ts
import type { Href } from 'expo-router';

import type { MessageContext } from './coach-messages';

/** The only place that knows where the coach thread lives. Phase 7 moves it into the tab bar. */
export const COACH_PATHNAME = '/(app)/coach';

export function coachHref(context?: MessageContext): Href {
  if (!context) return COACH_PATHNAME as Href;
  return {
    pathname: COACH_PATHNAME,
    params: { contextType: context.type, contextId: context.id ?? '', contextDate: context.date ?? '' },
  } as Href;
}
```

- [ ] **Step 4: Implement the screen**

```tsx
// src/features/coach/CoachScreen.tsx
import { format } from 'date-fns';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquareText, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View, type ScrollView } from 'react-native';

import { Button, EmptyState, ErrorState, Input, Screen, SkeletonCard, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCoach } from '@/hooks/useCoach';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

import { contextLabel, isFromCoach, messageBodyError, MESSAGE_MAX_LENGTH, parseContextParams, unreadFromCoach, type CoachMessage, type MessageContext } from './coach-messages';
import { useCoachMessages, useMarkCoachMessagesRead, useSendCoachMessage } from './useCoachThread';

const SEND_FAILED = 'Couldn’t send. Your message is still here. Try again.';

export function CoachScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ contextType?: string; contextId?: string; contextDate?: string }>();
  const coach = useCoach();
  const messages = useCoachMessages({ poll: true });
  const send = useSendCoachMessage();
  const markRead = useMarkCoachMessagesRead();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [context, setContext] = useState<MessageContext | null>(() => parseContextParams(params));
  const scrollRef = useRef<ScrollView>(null);
  const clientId = user?.id ?? '';
  const thread = messages.data ?? [];
  const unread = unreadFromCoach(thread, clientId).length;
  const lookup = coach.data;
  const coachName = lookup?.kind === 'assigned' ? lookup.coach.full_name?.trim() || 'your coach' : 'your coach';

  useEffect(() => { setContext(parseContextParams(params)); }, [params.contextType, params.contextId, params.contextDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const { mutate: markThreadRead } = markRead;
  useFocusEffect(useCallback(() => { if (unread > 0) markThreadRead(); }, [unread, markThreadRead]));
  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [thread.length]);

  const clearContext = () => {
    setContext(null);
    router.setParams({ contextType: undefined, contextId: undefined, contextDate: undefined });
  };
  const submit = () => {
    if (messageBodyError(draft) || send.isPending) return;
    setSendError(null);
    send.mutate({ body: draft, context }, {
      onSuccess: () => { setDraft(''); clearContext(); },
      onError: () => setSendError(SEND_FAILED),
    });
  };

  if (!lookup) return <Screen archetype="root"><Text variant="h1">Coach</Text><SkeletonCard lines={3} /></Screen>;
  if (lookup.kind === 'unassigned') {
    return <Screen archetype="root">
      <Text variant="h1">Coach</Text>
      <EmptyState icon={MessageSquareText} title="No coach yet" message="When a coach is assigned, you can message them here." />
    </Screen>;
  }

  const label = context ? contextLabel(context) : null;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen ref={scrollRef} archetype="root" testID="coach-screen">
      <View style={{ gap: spacing.lg }}>
        <Text variant="h1" accessibilityRole="header">{coachName === 'your coach' ? 'Coach' : coachName}</Text>
        {messages.isError && !messages.data ? (
          <ErrorState title="Messages aren’t available right now" message="Your coach can still see your check-ins and workouts." onRetry={() => { void messages.refetch(); }} />
        ) : messages.isLoading ? <SkeletonCard lines={3} /> : thread.length === 0 ? (
          <EmptyState icon={MessageSquareText} title={`Say hello to ${coachName}`} message="Questions about your plan, a hard day, a win. Your coach reads everything here." />
        ) : (
          <View style={{ gap: spacing.md }}>
            {thread.map((item) => <MessageBubble key={item.id} message={item} mine={!isFromCoach(item, clientId)} coachName={coachName} />)}
          </View>
        )}

        {!(messages.isError && !messages.data) ? <View style={{ gap: spacing.sm }}>
          {label ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', paddingLeft: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
            <Text variant="caption" tone="primary">{label}</Text>
            <Pressable onPress={clearContext} accessibilityRole="button" accessibilityLabel="Remove topic" style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}>
              <X size={iconSize.sm} color={colors.primary} accessible={false} />
            </Pressable>
          </View> : null}
          <Input label="Message" value={draft} onChangeText={(value) => { setDraft(value); if (sendError) setSendError(null); }}
            placeholder={`Message ${coachName}`} multiline maxLength={MESSAGE_MAX_LENGTH} inputStyle={{ minHeight: 88, textAlignVertical: 'top' }} />
          {sendError ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{sendError}</Text> : null}
          <Button label="Send" onPress={submit} disabled={Boolean(messageBodyError(draft))} loading={send.isPending} />
        </View> : null}
      </View>
    </Screen>
  </KeyboardAvoidingView>;
}

function MessageBubble({ message, mine, coachName }: { message: CoachMessage; mine: boolean; coachName: string }) {
  const { colors } = useTheme();
  const label = contextLabel({ type: message.context_type, date: message.context_date });
  const time = format(new Date(message.created_at), 'd MMM, HH:mm');
  return <View accessible accessibilityLabel={`${mine ? 'You' : coachName}: ${message.body}. ${time}`}
    style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', gap: spacing.xs, padding: spacing.md, borderRadius: radius.card,
      backgroundColor: mine ? colors.primarySoft : colors.card }}>
    {label ? <Text variant="caption" tone="muted">{label}</Text> : null}
    <Text variant="body" selectable>{message.body}</Text>
    <Text variant="caption" tone="muted">{mine ? 'You' : coachName} · {time}</Text>
  </View>;
}
```

- [ ] **Step 5: Create the route**

```tsx
// app/(app)/coach.tsx
export { CoachScreen as default } from '@/features/coach/CoachScreen';
```

- [ ] **Step 6: Leave this route's header to `CoachScreen`.** Do **not** add `/coach` to the `nativeHeader` list in `app/(app)/_layout.tsx:413`. The screen draws its own title, which matches the tab it becomes in Phase 7. Leave the file unchanged.
- [ ] **Step 7: Run the tests and type-check**
  Run: `npx jest src/features/coach --runInBand`. Expected: PASS (all coach suites).
  Run: `npm run typecheck`. Expected: PASS.
  If typecheck reports that `'/(app)/coach'` is not a known route, regenerate typed routes: run `npx expo start --offline`, wait until Metro prints "Waiting on", stop it with Ctrl+C, then re-run typecheck.
- [ ] **Step 8: Commit**

```bash
git add src/features/coach/routes.ts src/features/coach/CoachScreen.tsx src/features/coach/CoachScreen.test.tsx "app/(app)/coach.tsx"
git commit -m "feat(mobile): add coach message thread screen"
```

---

### Task 2.5: Entry points: Home card, "Ask your coach", You row

**Files:**
- Create: `src/features/coach/AskCoachButton.tsx`
- Create: `src/features/coach/CoachMessageCard.tsx`
- Modify: `app/(app)/(tabs)/index.tsx` (imports, and one card inside `TodayBrief` children, directly after the `pending` block that ends near line 106)
- Modify: `app/(app)/(tabs)/more.tsx` (`COACHING_ROWS`)
- Modify: `src/features/checkin/components/CheckInCompletion.tsx` (add the button under the receipt)
- Modify: `src/components/logger/WorkoutSummary.tsx` (new optional prop `onAskCoach`)
- Modify: `app/(app)/logger.tsx:202` (pass `onAskCoach`)
- Test: `src/features/coach/AskCoachButton.test.tsx`
- Update existing tests: every test that renders Home (`grep -rln "(tabs)/index'" src`) gets the mock from Step 5.

**Interfaces:**
- Consumes: `coachHref`, `unreadFromCoach`, `contextLabel` and `useCoachMessages`.
- Produces:
  - `AskCoachButton({ context, label? }: { context: MessageContext; label?: string })`
  - `CoachMessageCard({ message, coachName, onOpen })`
  - `WorkoutSummary` prop `onAskCoach?: () => void`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/coach/AskCoachButton.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';

import { AskCoachButton } from './AskCoachButton';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text } = require('react-native');
  return { Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable> };
});

it('opens the coach thread with the record as context', async () => {
  const view = await render(<AskCoachButton context={{ type: 'workout_log', id: 'log-9', date: '2026-09-26' }} />);
  await fireEvent.press(view.getByRole('button', { name: 'Ask your coach about this' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/coach', params: { contextType: 'workout_log', contextId: 'log-9', contextDate: '2026-09-26' } });
});
```

- [ ] **Step 2: Run it.** `npx jest src/features/coach/AskCoachButton.test.tsx --runInBand`. Expected: FAIL.
- [ ] **Step 3: Implement both components**

```tsx
// src/features/coach/AskCoachButton.tsx
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui';

import type { MessageContext } from './coach-messages';
import { coachHref } from './routes';

export function AskCoachButton({ context, label = 'Ask your coach about this' }: { context: MessageContext; label?: string }) {
  const router = useRouter();
  return <Button label={label} variant="ghost" onPress={() => router.push(coachHref(context))} />;
}
```

```tsx
// src/features/coach/CoachMessageCard.tsx
import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

import { contextLabel, type CoachMessage } from './coach-messages';

export function CoachMessageCard({ message, coachName, onOpen }: { message: CoachMessage; coachName: string; onOpen: () => void }) {
  const { colors } = useTheme();
  const label = contextLabel({ type: message.context_type, date: message.context_date });
  return <Pressable onPress={onOpen} testID="home-coach-message" accessibilityRole="button"
    accessibilityLabel={`New message from ${coachName}: ${message.body}`} accessibilityHint="Opens your coach messages"
    style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, padding: spacing.content, gap: spacing.xs, borderRadius: radius.card, backgroundColor: pressed ? colors.pressed : colors.card })}>
    <Text variant="overline" tone="primary">From {coachName}</Text>
    <Text variant="body" numberOfLines={3}>{message.body}</Text>
    {label ? <Text variant="caption" tone="muted">{label}</Text> : null}
  </Pressable>;
}
```

- [ ] **Step 4: Wire Home** (`app/(app)/(tabs)/index.tsx`).
  1. Add imports:

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { CoachMessageCard } from '@/features/coach/CoachMessageCard';
import { unreadFromCoach } from '@/features/coach/coach-messages';
import { coachHref } from '@/features/coach/routes';
import { useCoachMessages } from '@/features/coach/useCoachThread';
```
  2. Inside `HomeScreen`, after `const local = useHomeLocal(today);`:

```tsx
  const { user } = useAuth();
  const coachMessages = useCoachMessages();
  const latestCoachMessage = unreadFromCoach(coachMessages.data ?? [], user?.id ?? '').at(-1) ?? null;
  const coachName = data.coach.state === 'ready' && data.coach.data.kind === 'assigned' ? data.coach.data.coach.full_name?.trim() || 'your coach' : 'your coach';
```
  3. Inside `<TodayBrief …>` children, directly after the `{pending.length ? (…) : null}` block:

```tsx
        {latestCoachMessage ? <CoachMessageCard message={latestCoachMessage} coachName={coachName} onOpen={() => router.push(coachHref())} /> : null}
```
  Check the actual shape of `data.coach` in `src/features/home/useHomeData.ts`. If it differs from `{ state: 'ready'; data: CoachLookup }`, adapt only the `coachName` line to read the coach's `full_name`.
- [ ] **Step 5: Keep the existing Home tests green.** In every test file that renders the Home screen, add:

```tsx
jest.mock('@/features/coach/useCoachThread', () => ({ useCoachMessages: () => ({ data: [] }) }));
```
  If a file already mocks `@/contexts/AuthContext`, keep that mock. Otherwise add `jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));`.
- [ ] **Step 6: Wire the You tab.** In `app/(app)/(tabs)/more.tsx`, add a first entry to `COACHING_ROWS` and add `MessageCircle` to the lucide import:

```tsx
  { icon: MessageCircle, label: 'Messages', href: '/(app)/coach', hint: 'Talk to your coach' },
```
  Update `src/screens/__tests__/tabs/more.test.tsx`: add `MessageCircle: () => null` to its lucide mock, and add an assertion that pressing `row-Messages` calls `mockPush('/(app)/coach')`.
- [ ] **Step 7: Check-in receipt.** In `src/features/checkin/components/CheckInCompletion.tsx`, below the existing action buttons, render the button with the receipt's date. The component reads its props as `props.receipt`:

```tsx
      <AskCoachButton context={{ type: 'daily_check_in', id: null, date: props.receipt.date }} />
```
  Import from `@/features/coach/AskCoachButton`. In `CheckInCompletion.test.tsx`, add `jest.mock('@/features/coach/AskCoachButton', () => ({ AskCoachButton: () => null }));`.
- [ ] **Step 8: Workout summary.** In `src/components/logger/WorkoutSummary.tsx`:
  1. Add `onAskCoach?: () => void` to `Props`.
  2. Render it only when the workout is synced, directly below the "Done" button:

```tsx
      {syncStatus === 'synced' && onAskCoach ? <Button label="Ask your coach about this workout" variant="ghost" onPress={onAskCoach} style={{ minHeight: 48 }} /> : null}
```
  3. In `app/(app)/logger.tsx:202`, pass:

```tsx
onAskCoach={state.existingLogId ? () => router.push(coachHref({ type: 'workout_log', id: state.existingLogId, date })) : undefined}
```
     Import `coachHref` from `@/features/coach/routes`.
  4. Add a test to `WorkoutSummary.test.tsx`: when `syncStatus="synced"` and `onAskCoach` is given, pressing "Ask your coach about this workout" calls it. When `syncStatus="review"`, the button is absent.
- [ ] **Step 9: Run affected tests and verify**
  Run: `npx jest src/features/coach src/components/logger/WorkoutSummary.test.tsx src/features/checkin src/screens --runInBand`. Expected: PASS.
  Run: `npm run typecheck && npm run lint`. Expected: PASS.
- [ ] **Step 10: Commit**

```bash
git add src/features/coach/AskCoachButton.tsx src/features/coach/AskCoachButton.test.tsx src/features/coach/CoachMessageCard.tsx "app/(app)/(tabs)/index.tsx" "app/(app)/(tabs)/more.tsx" src/features/checkin/components/CheckInCompletion.tsx src/features/checkin/components/CheckInCompletion.test.tsx src/components/logger/WorkoutSummary.tsx src/components/logger/WorkoutSummary.test.tsx "app/(app)/logger.tsx" src/screens
git commit -m "feat(mobile): add coach entry points on Home, receipts and You"
```

---

### Task 2.6: Coach replies shown against weekly feedback

**Files:**
- Modify: `src/features/weekly/WeeklyFeedbackHistoryCard.tsx`
- Modify: `app/(app)/weekly-feedback.tsx` (the place that renders `WeeklyFeedbackHistoryCard`)
- Test: `src/features/weekly/WeeklyFeedbackHistoryCard.test.tsx` (create)

**Interfaces:**
- Consumes: `repliesFor` and `useCoachMessages` (Tasks 2.2–2.3), and `AskCoachButton` (Task 2.5).
- Produces: `WeeklyFeedbackHistoryCard` props `{ item; weekNumber; replies?: CoachMessage[]; coachName?: string; clientId?: string }`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/weekly/WeeklyFeedbackHistoryCard.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import { render } from '@testing-library/react-native';

import { WeeklyFeedbackHistoryCard } from './WeeklyFeedbackHistoryCard';

jest.mock('@/features/coach/AskCoachButton', () => ({ AskCoachButton: () => null }));
jest.mock('@/components/ui', () => {
  const { Text, View } = require('react-native');
  return { Text, Card: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});

const item = { id: 'w1', user_id: 'client-1', created_at: '2026-09-21T10:00:00Z', overall_feeling: 'Good' } as never;

it('shows the coach reply pinned to this week', async () => {
  const replies = [{ id: 'r1', client_id: 'client-1', sender_id: 'coach-1', body: 'Add 5 kg to squats next week', context_type: 'weekly_check_in', context_id: 'w1', context_date: null, created_at: '2026-09-22T09:00:00Z', read_at: null }] as never;
  const view = await render(<WeeklyFeedbackHistoryCard item={item} weekNumber={3} replies={replies} coachName="Jamie Lee" clientId="client-1" />);
  expect(view.getByText('Jamie Lee replied')).toBeTruthy();
  expect(view.getByText('Add 5 kg to squats next week')).toBeTruthy();
});

it('says the reply is pending when there is none', async () => {
  const view = await render(<WeeklyFeedbackHistoryCard item={item} weekNumber={3} replies={[]} coachName="Jamie Lee" clientId="client-1" />);
  expect(view.getByText('Waiting for Jamie Lee’s reply')).toBeTruthy();
});
```

- [ ] **Step 2: Run it.** Expected: FAIL (the text doesn't exist).
- [ ] **Step 3: Implement.** In `WeeklyFeedbackHistoryCard.tsx`:
  - Extend the props type to `{ item: WeeklyCheckIn; weekNumber: number; replies?: CoachMessage[]; coachName?: string; clientId?: string }`.
  - After `<WeeklyFeedbackAnswers answers={item} />`, add the block below.
  - Import `type CoachMessage` and `isFromCoach` from `@/features/coach/coach-messages`, and `AskCoachButton` from `@/features/coach/AskCoachButton`.
  - `WeeklyCheckIn` already has `id: string`.

```tsx
      {replies ? (() => {
        const fromCoach = replies.filter((reply) => isFromCoach(reply, clientId ?? ''));
        const name = coachName ?? 'your coach';
        return <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
          {fromCoach.length ? <>
            <Text variant="label" tone="primary">{name} replied</Text>
            {fromCoach.map((reply) => <Text key={reply.id} variant="bodySm" selectable>{reply.body}</Text>)}
          </> : <Text variant="bodySm" tone="muted">Waiting for {name}’s reply</Text>}
          <AskCoachButton label={fromCoach.length ? 'Reply' : 'Add a note for your coach'} context={{ type: 'weekly_check_in', id: item.id, date: null }} />
        </View>;
      })() : null}
```

- [ ] **Step 4: Pass replies from the parent.** In `app/(app)/weekly-feedback.tsx`, where history cards are rendered:
  - Call `const coachMessages = useCoachMessages();` and `const { user } = useAuth();`.
  - Get the coach name from `useCoach()` the same way as Task 2.5 Step 4.
  - Pass:

```tsx
replies={repliesFor(coachMessages.data ?? [], 'weekly_check_in', item.id)} coachName={coachName} clientId={user?.id}
```
  - Only pass `replies` when `coachMessages.data` is defined. Otherwise leave it `undefined` so nothing renders while loading or when the table is missing.
  - Update that screen's existing tests with the `useCoachThread` mock from Task 2.5 Step 5.
- [ ] **Step 5: Run tests.** `npx jest src/features/weekly src/screens --runInBand`. Expected: PASS.
- [ ] **Step 6: Commit**

```bash
git add src/features/weekly/WeeklyFeedbackHistoryCard.tsx src/features/weekly/WeeklyFeedbackHistoryCard.test.tsx "app/(app)/weekly-feedback.tsx" src/lib/weekly-feedback.ts src/screens
git commit -m "feat(mobile): show coach replies on weekly feedback"
```

---

### Task 2.7: Coach-side web inbox and reply push, spec only 🔒 OWNER GATE (`client/`, Supabase Edge Functions)

Nothing in this task is implemented in `mobile/`. When the owner approves, write a **separate plan** (`docs/superpowers/plans/<date>-coach-web-inbox.md`) that covers these requirements:

1. **Coach inbox (web)** on the coach's client detail page:
   - Show the thread from `coach_messages` for that client, newest last.
   - Include a composer that inserts `{ client_id, sender_id: coach, body, context_type/id/date }`.
   - Call `mark_coach_messages_read(client_id)` on open.
2. **Reply from context.** On the web weekly check-in view, add a "Reply" button that opens the composer with `context_type='weekly_check_in', context_id=<weekly_check_ins.id>`. Add the same on the daily check-in and workout log views.
3. **Unread count.** The coach dashboard badge counts client messages where `read_at is null`.
4. **Push (later).** Add a Database Webhook on `coach_messages` INSERT → an Edge Function → the Expo Push API for the client's device. The mobile app needs to register an Expo push token and store it (a new `push_tokens` table). This is a third plan. Until then the client sees replies on the next app open (Home card) or within 60 seconds on the Coach screen.

- [ ] **Step 1:** Ask the owner whether to write the web inbox plan now. Record the answer in this file under a new heading `## Owner decision`.

**Phase 2 exit:** `npm run verify` passes. With the SQL applied (owner), a test client can send a message, see a coach reply inserted from the SQL editor, and see it on Home and in weekly history.
