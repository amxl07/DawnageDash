/**
 * Canonical colour palette. Documented in DESIGN.md (keep in sync).
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
  // iOS grouped light: neutral #F2F2F7 canvas, white cards, near-black text,
  // no tinted greys. One coral hue: vivid fill for buttons, a deeper shade of
  // the same hue for text. Ratios measured against white / background / elevated.
  background: '#F2F2F7', //        iOS systemGroupedBackground
  card: '#FFFFFF',
  elevated: '#ECECF1', //          inset fills inside cards: inputs, tracks, chips
  scrim: 'rgba(0,0,0,0.32)',

  foreground: '#1D1D1F', //        16.83 / 15.08 / 14.29
  mutedForeground: '#66666B', //    5.71 / 5.12 / 4.85 (Apple's #8A8A8E secondary label fails AA)

  primary: '#C2302A', //            5.60 / 5.02 / 4.76, 4.99 on primarySoft
  primaryFill: '#D6362C', //       white label 4.75:1
  primarySoft: '#FCEFEE', //       primaryFill at 8% on white
  primaryPressed: '#B32A22', //    white label 6.42:1
  pressed: '#E5E5EA', //           iOS systemGray5; muted text 4.55:1
  onPrimary: '#FFFFFF',
  success: '#1B7A35', //            5.41 / 4.85 / 4.59
  gold: '#8F5E00', //               5.57 / 4.99 / 4.73
  orange: '#C23200', //             5.60 / 5.02 / 4.76
  destructive: '#D70015', //        iOS accessible red: 5.38 / 4.83 / 4.57

  border: '#E3E3E8', //            decorative hairlines only
  borderStrong: '#86868B', //       3.62 / 3.25 / 3.08 — interactive boundaries
  focusRing: '#C2302A',

  // Graphics need 3:1 against the card; colour is never the only cue.
  chart1: '#D6362C', //             4.75
  chart2: '#248A3D', //             4.40
  chart3: '#946200', //             5.24
  chart4: '#0071E3', //             4.70
};

export const palettes = { light, dark };
