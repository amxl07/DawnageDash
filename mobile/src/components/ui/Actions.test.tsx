import { fireEvent, render } from '@testing-library/react-native';

import { InlineAction } from './InlineAction';
import { ToolbarActionFallback as ToolbarAction } from './ToolbarActionFallback';

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { sm: 16, md: 20 },
  spacing: { xs: 4, sm: 8, md: 12 },
  useTheme: () => ({ colors: { destructive: '#aa0000', mutedForeground: '#666666', primary: '#bb3300', pressed: '#eeeeee' } }),
}));

jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));
jest.mock('./AppSymbol', () => ({
  AppSymbol: ({ accessibilityLabel, testID }: any) => {
    const { View } = jest.requireActual('react-native');
    return <View accessibilityLabel={accessibilityLabel} testID={testID} />;
  },
}));

describe('quiet actions', () => {
  it('InlineAction keeps a readable label and suppresses disabled activation', async () => {
    const onPress = jest.fn();
    const view = await render(<InlineAction label="View history" onPress={onPress} disabled />);
    const action = view.getByRole('button', { name: 'View history' });

    expect(view.getByText('View history')).toBeTruthy();
    expect(action.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(action);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ToolbarAction uses a semantic icon and an accessible action name', async () => {
    const onPress = jest.fn();
    const view = await render(<ToolbarAction label="Close" symbol="close" onPress={onPress} testID="close-action" />);

    fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('close-action-symbol')).toBeTruthy();
  });
});
