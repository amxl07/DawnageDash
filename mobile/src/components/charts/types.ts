/** Shared chart contracts. Screens never import the charting lib directly. */

export type Series = {
  name: string;
  /** Theme token colour — never a hex literal from a screen. */
  color: string;
  data: { label: string; value: number }[];
  /**
   * Dash pattern. Multi-series charts MUST differentiate by line style as well
   * as colour (§03.A.6) — colour alone fails for colourblind users and washes
   * out on the light theme.
   */
  dash?: number[];
};

export type ChartProps = {
  /**
   * One-sentence text equivalent, rendered as accessibilityLabel.
   * REQUIRED — a chart with no text equivalent does not ship (§03.A.7).
   */
  summary: string;
  height?: number;
};
