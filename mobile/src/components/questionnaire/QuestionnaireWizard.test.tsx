/* eslint-disable @typescript-eslint/no-require-imports */
import * as React from 'react';

import { act, create } from 'react-test-renderer';
import { QuestionnaireWizard } from './QuestionnaireWizard';

const mockScrollTo = jest.fn();
const mockInsert = jest.fn(async () => ({ error: null as Error | null }));
const mockQuestionnaireRead = jest.fn(async () => ({
  data: null as Record<string, unknown> | null,
  error: null as Error | null,
}));
const mockUpdateEq = jest.fn(async () => ({ error: null as Error | null }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
let mockMotionEnabled = false;
const mockPositionRead = jest.fn(async () => null as string | null);
const mockPositionWrite = jest.fn(async () => undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: (...args: unknown[]) => mockPositionRead(...args as []), setItem: (...args: unknown[]) => mockPositionWrite(...args as []) }));
jest.mock('expo-router/react-navigation', () => ({ useNavigation: () => ({ dispatch: jest.fn() }), usePreventRemove: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/lib/questionnaire-data', () => ({
  questionnaireSections: [
    {
      id: 'identity',
      title: 'Identity',
      description: 'First section',
      questions: [{ id: 'q14', text: 'Goal', type: 'text', required: true }],
    },
    {
      id: 'goals',
      title: 'Goals',
      description: 'Second section',
      questions: [],
    },
  ],
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockQuestionnaireRead }),
      }),
      insert: mockInsert,
      update: mockUpdate,
    }),
  },
}));

jest.mock('@/theme', () => ({
  spacing: { xs: 4, sm: 8, base: 16, lg: 24 },
  useMotion: () => ({ enabled: mockMotionEnabled }),
}));

jest.mock('@/components/ui/MotionReveal', () => {
  const { View } = require('react-native');
  return {
    MotionReveal: ({ children, ...props }: React.ComponentProps<typeof View>) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text: NativeText, View } = require('react-native');
  const Screen = React.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.ForwardedRef<unknown>) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return <View>{children}</View>;
    },
  );
  Screen.displayName = 'MockScreen';

  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable accessibilityLabel={label} onPress={onPress} />
    ),
    Card: View,
    OptionRow: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityLabel={label} onPress={onPress} />,
    Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <View>{children}</View> : null,
    SheetScrollView: View,
    ErrorState: () => null,
    ProgressBar: () => null,
    Screen,
    SkeletonCard: () => null,
    Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
      <NativeText {...props}>{children}</NativeText>
    ),
  };
});

jest.mock('./QuestionField', () => {
  const { Pressable } = require('react-native');
  return {
    QuestionField: ({ onChange }: { onChange: (value: string) => void }) => (
      <Pressable accessibilityLabel="Answer name" onPress={() => onChange('Maya')} />
    ),
  };
});

jest.mock('./QuestionnaireSummary', () => ({ QuestionnaireSummary: () => null }));

async function renderWizard(props: React.ComponentProps<typeof QuestionnaireWizard> = {}) {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<QuestionnaireWizard {...props} />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

describe('QuestionnaireWizard motion preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMotionEnabled = false;
    mockPositionRead.mockResolvedValue(null);
    mockQuestionnaireRead.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('uses non-animated validation and section scrolling with Reduced Motion', async () => {
    const renderer = await renderWizard();

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save & continue' }).props.onPress();
    });
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Answer name' }).props.onPress());
    mockScrollTo.mockClear();
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save & continue' }).props.onPress();
      await Promise.resolve();
    });

    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
  });

  it('remembers the destination of clean overview navigation on this account', async () => {
    mockQuestionnaireRead.mockResolvedValue({ data: { id: 'assessment-1', answers: '{}', completed_sections: '[]', status: 'in_progress' }, error: null });
    const renderer = await renderWizard();
    await act(async () => renderer.root.findByProps({ accessibilityLabel: '0 of 2 sections complete · View sections' }).props.onPress());
    await act(async () => { renderer.root.findByProps({ accessibilityLabel: 'Goals · Not completed' }).props.onPress(); await Promise.resolve(); });
    expect(mockPositionWrite).toHaveBeenLastCalledWith('assessment-section:user-1', 'goals');
    mockPositionRead.mockResolvedValue('goals');
    await act(async () => renderer.unmount());
    const reopened = await renderWizard();
    expect(reopened.root.findByProps({ accessibilityLabel: 'Finish' })).toBeTruthy();
  });

  it('stores the destination after saving a dirty section before navigation', async () => {
    const renderer = await renderWizard();
    await act(async () => renderer.root.findByProps({ accessibilityLabel: 'Answer name' }).props.onPress());
    await act(async () => renderer.root.findByProps({ accessibilityLabel: '0 of 2 sections complete · View sections' }).props.onPress());
    await act(async () => renderer.root.findByProps({ accessibilityLabel: 'Goals · Not completed' }).props.onPress());
    await act(async () => { renderer.root.findByProps({ accessibilityLabel: 'Save draft & leave' }).props.onPress(); await Promise.resolve(); await Promise.resolve(); });
    expect(mockPositionWrite).toHaveBeenLastCalledWith('assessment-section:user-1', 'goals');
    mockPositionRead.mockResolvedValue('goals');
    mockQuestionnaireRead.mockResolvedValue({ data: { id: 'assessment-1', answers: '{"q14":"Maya"}', completed_sections: '[]', status: 'in_progress' }, error: null });
    await act(async () => renderer.unmount());
    const reopened = await renderWizard();
    expect(reopened.root.findByProps({ accessibilityLabel: 'Finish' })).toBeTruthy();
  });

  it('keeps an unsaved assessment open when leaving and the draft save fails', async () => {
    let guard: ((exit: () => void) => void) | null = null;
    const exit = jest.fn();
    const renderer = await renderWizard({ onGuardChange: (next) => { guard = next; } });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Answer name' }).props.onPress());
    act(() => guard?.(exit));
    expect(exit).not.toHaveBeenCalled();
    mockQuestionnaireRead.mockResolvedValueOnce({ data: null, error: new Error('unavailable') });
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: 'Save draft & leave' }).props.onPress();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(exit).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Keep editing' })).toBeTruthy();
  });

  it('lets deliberate discard leave without sending the edited answers', async () => {
    let guard: ((exit: () => void) => void) | null = null;
    const exit = jest.fn();
    const renderer = await renderWizard({ onGuardChange: (next) => { guard = next; } });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Answer name' }).props.onPress());
    act(() => guard?.(exit));
    await act(async () => renderer.root.findByProps({ accessibilityLabel: 'Discard changes' }).props.onPress());
    expect(exit).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('fails closed when the latest assessment read fails instead of inserting a duplicate', async () => {
    mockQuestionnaireRead
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('offline') });
    const renderer = await renderWizard();

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Answer name' }).props.onPress());
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save & continue' }).props.onPress();
    });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(require('react-native').Text)
        .some((node: { props: { children?: React.ReactNode } }) =>
          String(node.props.children).includes("Couldn't save your answers"),
        ),
    ).toBe(true);
  });

  it('keeps a newer Profile answer and completed sections when another section saves', async () => {
    mockQuestionnaireRead
      .mockResolvedValueOnce({
        data: {
          id: 'assessment-1',
          answers: JSON.stringify({ q14: 'stale local value' }),
          completed_sections: JSON.stringify(['identity']),
          status: 'in_progress',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'assessment-1',
          answers: JSON.stringify({ q14: 'latest Profile value', q77: 'keep me' }),
          completed_sections: JSON.stringify(['identity']),
          status: 'in_progress',
        },
        error: null,
      });
    const renderer = await renderWizard();

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Finish' }).props.onPress();
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      user_id: 'user-1',
      answers: JSON.stringify({ q14: 'latest Profile value', q77: 'keep me' }),
      completed_sections: JSON.stringify(['identity', 'goals']),
      status: 'completed',
    });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'assessment-1');
  });
});
