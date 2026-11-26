import { act, create } from 'react-test-renderer';

import LogsAlias from '../../../../app/(app)/logs';

const mockParams = {
  date: '2026-09-10',
  logId: 'log-7',
  outboxId: 'user-1:2026-09-10',
};

jest.mock('expo-router', () => {
  const native = jest.requireActual('react-native');
  return {
    Redirect: ({ href }: { href: unknown }) => <native.View testID="logs-redirect" redirectHref={href} />,
    useLocalSearchParams: () => mockParams,
  };
});
jest.mock('@/features/training/workout-history', () => ({
  LocalWorkoutCard: () => null,
  LogCard: () => null,
}));

it('keeps the legacy Logs route as a Training History alias', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<LogsAlias />); });
  expect(renderer.root.findByProps({ testID: 'logs-redirect' }).props.redirectHref).toEqual({
    pathname: '/(app)/(tabs)/plans',
    params: { view: 'history', ...mockParams },
  });
});
