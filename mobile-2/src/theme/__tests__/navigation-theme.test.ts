import { lightColors } from '@/theme/colors';
import { createNavigationTheme } from '@/theme/theme';

describe('createNavigationTheme', () => {
  it('maps semantic application colors onto navigation surfaces', () => {
    expect(createNavigationTheme(lightColors, false)).toMatchObject({
      dark: false,
      colors: {
        background: lightColors.background,
        border: lightColors.border,
        card: lightColors.surface,
        notification: lightColors.danger,
        primary: lightColors.accent,
        text: lightColors.text,
      },
    });
  });
});
