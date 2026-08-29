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
  primaryFill: '#D93A31', //      white label 4.57:1
  onPrimary: '#FFFFFF',
  success: '#00D26A', //          9.15:1 on card
  gold: '#F6C85A', //            11.70:1 on card
  orange: '#E8853B',
  destructive: '#F04E45',

  border: '#1F1F23', //           1.12:1 — decorative only
  borderStrong: '#5E6268', //     3.00:1 — interactive boundaries
  focusRing: '#F04E45',

  chart1: '#F44A3E', //           5.17:1
  chart2: '#00D66B', //           9.51:1
  chart3: '#FACE57', //          12.32:1
  chart4: '#4799EB', //           6.17:1
};

export const light: ColorScheme = {
  // Grey background + white card: the web's #FAFAFA/#F5F5F5 pair measured
  // 1.03:1, so cards were invisible without shadows. Inverted to the native
  // pattern; separation comes from elevation (see tokens.shadow).
  background: '#F2F2F5',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.45)',

  foreground: '#17171A', //       17.89:1 on card
  mutedForeground: '#5C5C63', //   6.63:1 on card

  primary: '#C0362C', //           5.52:1 on card  (#F04E45 was 3.28 — failed)
  primaryFill: '#D93A31', //       white label 4.57:1
  onPrimary: '#FFFFFF',
  success: '#0F7A43', //           5.41:1 on card  (was 2.56 — failed)
  gold: '#7D5E00', //              6.05:1 on card  (was 3.28 — failed)
  orange: '#A85A00',
  destructive: '#C0362C',

  border: '#E4E4E9', //            decorative only
  borderStrong: '#8E8E96', //      3.25:1 — interactive boundaries
  focusRing: '#C0362C',

  chart1: '#E0392E', //            4.38:1   (light chart values were 1.37–2.74)
  chart2: '#00994D', //            3.71:1
  chart3: '#A87C05', //            3.78:1
  chart4: '#2E86E0', //            3.75:1
};

export const palettes = { light, dark };
