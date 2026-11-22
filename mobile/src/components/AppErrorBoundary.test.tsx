import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { reportScreenError } from '@/lib/telemetry';
import { ThemeProvider } from '@/theme';
import { AppErrorBoundary } from './AppErrorBoundary';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/lib/telemetry', () => ({ reportScreenError: jest.fn() }));

it('offers retry after a screen failure and renders recovered content', async () => {
  const error = new Error('private-answer');
  let fail = true;
  function Screen() { if (fail) throw error; return <Text>Recovered screen</Text>; }
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await render(<ThemeProvider><AppErrorBoundary><Screen /></AppErrorBoundary></ThemeProvider>);
    expect(screen.getByText('Let’s try that again')).toBeTruthy();
    expect(screen.queryByText('private-answer')).toBeNull();
    expect(reportScreenError).toHaveBeenCalledWith(error);
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered screen')).toBeTruthy();
  } finally { consoleError.mockRestore(); }
});
