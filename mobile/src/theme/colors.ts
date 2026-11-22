/**
 * Canonical colour palette. See plans/02-design-system.md.
 *
 * Every value here was WCAG-contrast measured, not eyeballed. The light values
 * in particular are NOT the web app's `index.css` values — several of those
 * measured between 1.37:1 and 3.28:1 against a light card and were unusable.
 * Do not "restore" them.
 *
 * This is the single source of colour truth: StyleSheet, Reanimated, charts,
 * the tab bar and StatusBar all read from here. No hex literals anywhere else.
 */

export type ColorScheme = {
  // surfaces
  background: string;
  card: string;
  elevated: string;
  scrim: string;
  // text
  foreground: string;
  mutedForeground: string;
  // brand / semantic — `primary` is for text+icons, `primaryFill` is for
  // surfaces that carry a white label (white on #F04E45 is only 3.57:1).
  primary: string;
  primaryFill: string;
  /** Tonal selection, pressed primary and neutral touch feedback surfaces. */
  primarySoft: string;
  primaryPressed: string;
  pressed: string;
  onPrimary: string;
  success: string;
  gold: string;
  orange: string;
  destructive: string;
  // borders — `border` is decorative, `borderStrong` is the >=3:1 outline
  // required when a control's boundary is its only affordance (WCAG 1.4.11).
  border: string;
  borderStrong: string;
  focusRing: string;
  // charts — differentiate by line style too, never colour alone
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
};

export const dark: ColorScheme = {
  background: '#0B0B0C',
  card: '#131416',
  elevated: '#1A1B1E',
  scrim: 'rgba(0,0,0,0.6)',

  foreground: '#FFFFFF', //      18.43:1 on card
  mutedForeground: '#A1A1A8', //  7.18:1 on card

  primary: '#F04E45', //          5.16:1 on card
  primaryFill: '#CF382F', //      white label 4.93:1
  primarySoft: '#30191B',
  primaryPressed: '#AE2D26',
  pressed: '#24262C',
  onPrimary: '#FFFFFF',
  success: '#00D26A', //          9.15:1 on card
  gold: '#F6C85A', //            11.70:1 on card
  orange: '#E8853B',
  destructive: '#F04E45',

  border: '#1F1F23', //           1.12:1 — decorative only
  borderStrong: '#6B6F76', //     3.41:1 on elevated — interactive boundaries
  focusRing: '#F04E45',

  chart1: '#F44A3E', //           5.17:1
  chart2: '#00D66B', //           9.51:1
  chart3: '#FACE57', //          12.32:1
  chart4: '#4799EB', //           6.17:1
};

export const light: ColorScheme = {
  // Cool pearl and slate, informed by SparkyFitness's light surface hierarchy.
  // Dawnage retains its own deep coral actions and accessible essential text.
  background: '#F3F6FA',
  card: '#FFFFFF',
  elevated: '#F7F9FC',
  scrim: 'rgba(15,23,42,0.38)',

  foreground: '#17243B', //       14.33:1 on background
  mutedForeground: '#53647C', //  5.56:1 on background

  primary: '#B63B32', //           4.92:1 on primarySoft
  primaryFill: '#C94136', //       white label 4.89:1
  primarySoft: '#FBEAE7',
  primaryPressed: '#A9322B', //    white label 6.61:1
  pressed: '#E7EDF5',
  onPrimary: '#FFFFFF',
  success: '#0F766E',
  gold: '#8A6508',
  orange: '#AD5B18',
  destructive: '#B53B3B',

  border: '#DEE5EE', //            decorative only
  borderStrong: '#7E8CA1', //      >=3:1 on all light surfaces — interactive boundaries
  focusRing: '#B63B32',

  chart1: '#B63B32',
  chart2: '#147D75',
  chart3: '#A27816',
  chart4: '#356FBB',
};

export const palettes = { light, dark };
