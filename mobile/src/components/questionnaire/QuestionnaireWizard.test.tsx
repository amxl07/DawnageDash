/* eslint-disable @typescript-eslint/no-require-imports */
import * as React from 'react';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

const mockScrollTo = jest.fn();
const mockInsert = jest.fn(async () => ({ error: null }));
let mockMotionEnabled = false;

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
      questions: [{ id: 'name', text: 'Name', type: 'text', required: true }],
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
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      insert: mockInsert,
    }),
  },
}));

jest.mock('@/theme', () => ({
  spacing: { xs: 4, sm: 8, base: 16, lg: 24 },
  useMotion: () => ({ enabled: mockMotionEnabled }),
}));

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

import { QuestionnaireWizard } from './QuestionnaireWizard';

async function renderWizard() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<QuestionnaireWizard />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

describe('QuestionnaireWizard motion preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMotionEnabled = false;
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
});
