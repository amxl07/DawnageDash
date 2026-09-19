import { useResponsiveLayout } from './useResponsiveLayout';

const mockedUseWindowDimensions = jest.spyOn(
  jest.requireActual<typeof import('react-native')>('react-native'),
  'useWindowDimensions',
);

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
