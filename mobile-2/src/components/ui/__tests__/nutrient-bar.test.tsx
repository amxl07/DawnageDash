import { render } from '@testing-library/react-native';

import { NutrientBar } from '@/components/ui/nutrient-bar';

describe('NutrientBar', () => {
  it('clamps visual progress at 100 percent while preserving the actual nutrient value', async () => {
    const screen = await render(
      <NutrientBar current={124} goal={100} label="Protein" unit="g" />,
    );

    expect(screen.getByTestId('nutrient-bar-fill-protein')).toHaveStyle({ width: '100%' });
    expect(screen.getByText('124 g / 100 g')).toBeTruthy();
  });
});
