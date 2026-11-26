import React, { type ReactElement } from 'react';
import vm from 'node:vm';
import * as swiftUI from '@expo/ui/swift-ui';
import * as modifiers from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import { CheckInWidget, TrainingWidget, WorkoutActivity } from './layouts.ios';

jest.mock('@expo/ui/swift-ui', () => ({ Text: 'Text', Image: 'Image', VStack: 'VStack', HStack: 'HStack', Spacer: 'Spacer' }));
// The Expo Babel plugin serializes 'widget' functions. Evaluate that actual
// output in an isolated context with only Expo UI/JSX globals, as the extension
// does, so an accidental reference to app state fails this test.
function renderLayout<T extends (...args: any[]) => any>(layout: T, ...args: Parameters<T>): ReturnType<T> {
  const jsx = (type: any, props: any) => React.createElement(type, props);
  const render = typeof layout === 'string' ? vm.runInNewContext(`(${layout})`, { ...swiftUI, ...modifiers, _jsx: jsx, _jsxs: jsx, Date }) : layout;
  return render(...args);
}
function nodes(value: unknown): ReactElement<any>[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  if ('props' in value) { const element = value as ReactElement<any>; return [element, ...nodes(element.props.children)]; }
  return Object.values(value).flatMap(nodes);
}
const environment = { widgetFamily: 'systemSmall', colorScheme: 'light', date: new Date(), configuration: undefined } as WidgetEnvironment;
it.each([CheckInWidget, TrainingWidget])('renders empty WidgetKit placeholders without a production link', (layout) => {
  const tree = renderLayout(layout, {}, environment);
  expect(nodes(tree).some((node) => node.props.modifiers?.some((modifier: any) => modifier.$type === 'widgetURL'))).toBe(false);
  expect(tree.props.modifiers).toContainEqual({ $type: 'containerBackground', style: { type: 'material', material: 'regular' }, container: 'widget' });
});
it.each([CheckInWidget, TrainingWidget])('adopts the system container background for accented Home Screen widgets', (layout) => {
  const palette = { foreground: 'navy', muted: 'gray', accent: 'red', background: 'white' };
  const tree = renderLayout(layout, { palettes: { light: palette, dark: palette } }, { ...environment, widgetRenderingMode: 'accented' });
  expect(tree.props.modifiers).toContainEqual({ $type: 'containerBackground', style: { type: 'material', material: 'regular' }, container: 'widget' });
  expect(nodes(tree).flatMap((node) => node.props.modifiers ?? [])).toContainEqual({ $type: 'foregroundStyle', style: { type: 'hierarchical', hierarchical: 'primary' } });
});
it.each(['systemSmall', 'accessoryCircular', 'accessoryInline', 'accessoryRectangular'] as const)('has a single root destination for %s', (widgetFamily) => {
  const tree = renderLayout(TrainingWidget, { url: 'dawnage-preview:///plans' }, { ...environment, widgetFamily });
  expect(tree.props.modifiers).toContainEqual({ $type: 'widgetURL', url: 'dawnage-preview:///plans' });
  expect(nodes(tree).flatMap((node) => node.props.modifiers ?? []).filter((modifier: any) => modifier.$type === 'widgetURL')).toHaveLength(1);
});
it('uses environment appearance instead of retaining the app’s last open theme', () => {
  const palettes = { light: { foreground: 'navy', muted: 'gray', accent: 'red', background: 'white' }, dark: { foreground: 'white', muted: 'gray', accent: 'coral', background: 'black' } };
  const tree = renderLayout(CheckInWidget, { palettes }, { ...environment, colorScheme: 'dark' });
  expect(nodes(tree).flatMap((node) => node.props.modifiers ?? [])).toContainEqual({ $type: 'foregroundStyle', style: { type: 'color', color: 'white' } });
});
it('uses a clamped native timestamp interval and replaces stale claims in every presentation', () => {
  const props = { exercise: 2, exerciseCount: 4, completedSets: 3, totalSets: 12, restEndsAt: 91_000, restStartedAt: 1_000, pausedRemainingMs: null };
  const live = nodes(renderLayout(WorkoutActivity, props, { colorScheme: 'dark', isStale: false }));
  const timer = live.find((node) => node.props.timerInterval)!;
  expect(timer.props).toMatchObject({ timerInterval: { lower: new Date(1_000), upper: new Date(91_000) }, countsDown: true });
  expect(live.some((node) => node.props.dateStyle === 'timer')).toBe(false);
  const stale = nodes(renderLayout(WorkoutActivity, props, { colorScheme: 'light', isStale: true }));
  expect(stale.some((node) => node.props.timerInterval)).toBe(false);
  expect(stale.some((node) => node.props.children === 'Open Dawnage to continue')).toBe(true);
});
