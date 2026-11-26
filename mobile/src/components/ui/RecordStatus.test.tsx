import { fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { RecordStatus } from './RecordStatus';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    CheckCircle2: View,
    CircleAlert: View,
    Clock3: View,
    FilePenLine: View,
    LoaderCircle: View,
  };
});

jest.mock('@/theme', () => ({
  iconSize: { sm: 16 },
  radius: { md: 12 },
  spacing: { xs: 4, sm: 8, md: 12 },
  useTheme: () => ({
    colors: {
      border: '#dddddd',
      card: '#ffffff',
      destructive: '#aa0000',
      foreground: '#111111',
      mutedForeground: '#666666',
      primary: '#bb3300',
      success: '#007744',
    },
  }),
}));

jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));

describe('RecordStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers retry without describing a blocked save as synced', async () => {
    const retry = jest.fn();
    const view = await render(<RecordStatus value="blocked" onRetry={retry} />);

    expect(view.queryByText('Saved')).toBeNull();
    expect(view.getByRole('status')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Retry save' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('announces meaningful status transitions but stays quiet on first render', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
    const view = await render(<RecordStatus value="queued" />);

    expect(announce).not.toHaveBeenCalled();
    await view.rerender(<RecordStatus value="synced" />);

    expect(announce).toHaveBeenCalledWith('Saved');
  });
});
