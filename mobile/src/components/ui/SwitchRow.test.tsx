import { fireEvent, render } from '@testing-library/react-native';
import { SwitchRow } from './SwitchRow';
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').light }) }));
it('offers a named native switch without making its text a second toggle', async () => {
  const onValueChange = jest.fn();
  const view = await render(<SwitchRow label="Auto-start after a set" value={false} onValueChange={onValueChange} />);
  await fireEvent(view.getByRole('switch', { name: 'Auto-start after a set' }), 'valueChange', true);
  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange).toHaveBeenCalledWith(true);
});
