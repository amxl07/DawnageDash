import { useWindowDimensions } from 'react-native';

import { useResponsiveLayout } from './useResponsiveLayout';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  useWindowDimensions: jest.fn(),
}));

const mockedUseWindowDimensions = jest.mocked(useWindowDimensions);

describe('useResponsiveLayout', () => {
  it('returns a consistent wide-layout contract for the current window', () => {
    mockedUseWindowDimensions.mockReturnValue({
      width: 768,
      height: 1024,
      scale: 2,
      fontScale: 1,
    });

    const result = useResponsiveLayout();

    expect(result).toEqual({
      width: 768,
      height: 1024,
      fontScale: 1,
      mode: 'wide',
      isCompact: false,
      isWide: true,
      horizontal: 24,
      maxContentWidth: 720,
    });
  });
});
