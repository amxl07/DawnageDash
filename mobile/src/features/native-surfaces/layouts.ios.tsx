import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { accessibilityLabel, containerBackground, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, WidgetEnvironment } from 'expo-widgets';
import type { ActivityProps } from './model';

type SurfacePalette = { foreground: string; muted: string; accent: string; background: string };
export type ShortcutProps = { url?: string; palettes?: { light: SurfacePalette; dark: SurfacePalette } };

export function CheckInWidget(props: ShortcutProps, environment: WidgetEnvironment) {
  'widget';
  const palette = props.palettes?.[environment.colorScheme === 'dark' ? 'dark' : 'light'];
  const small = environment.widgetFamily === 'systemSmall';
  const fullColor = small && (!environment.widgetRenderingMode || environment.widgetRenderingMode === 'fullColor');
  const main = foregroundStyle(fullColor && palette ? palette.foreground : { type: 'hierarchical', style: 'primary' });
  const secondary = foregroundStyle(fullColor && palette ? palette.muted : { type: 'hierarchical', style: 'secondary' });
  const root = [...(props.url ? [widgetURL(props.url)] : []), accessibilityLabel('Open Dawnage daily check-in'), ...(small ? [containerBackground(fullColor && palette ? palette.background : { type: 'material', material: 'regular' }, 'widget')] : [])];
  if (environment.widgetFamily === 'accessoryCircular') return <VStack modifiers={root}><Image systemName="checklist" modifiers={[main, font({ textStyle: 'title2' })]} /></VStack>;
  if (environment.widgetFamily === 'accessoryInline') return <HStack modifiers={root}><Image systemName="checklist" /><Text>Daily check-in</Text></HStack>;
  return <VStack alignment="leading" spacing={small ? 10 : 3} modifiers={root}>
    <Image systemName="checklist" modifiers={[font({ textStyle: small ? 'title2' : 'body' }), foregroundStyle(fullColor && palette ? palette.accent : { type: 'hierarchical', style: 'primary' })]} />
    {small ? <Spacer /> : null}
    <Text modifiers={[font({ textStyle: 'headline' }), main, lineLimit(2)]}>Daily check-in</Text>
    <Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(1)]}>Open Dawnage</Text>
  </VStack>;
}

export function TrainingWidget(props: ShortcutProps, environment: WidgetEnvironment) {
  'widget';
  const palette = props.palettes?.[environment.colorScheme === 'dark' ? 'dark' : 'light'];
  const small = environment.widgetFamily === 'systemSmall';
  const fullColor = small && (!environment.widgetRenderingMode || environment.widgetRenderingMode === 'fullColor');
  const main = foregroundStyle(fullColor && palette ? palette.foreground : { type: 'hierarchical', style: 'primary' });
  const secondary = foregroundStyle(fullColor && palette ? palette.muted : { type: 'hierarchical', style: 'secondary' });
  const root = [...(props.url ? [widgetURL(props.url)] : []), accessibilityLabel('Open Dawnage training'), ...(small ? [containerBackground(fullColor && palette ? palette.background : { type: 'material', material: 'regular' }, 'widget')] : [])];
  if (environment.widgetFamily === 'accessoryCircular') return <VStack modifiers={root}><Image systemName="dumbbell" modifiers={[main, font({ textStyle: 'title2' })]} /></VStack>;
  if (environment.widgetFamily === 'accessoryInline') return <HStack modifiers={root}><Image systemName="dumbbell" /><Text>Training</Text></HStack>;
  return <VStack alignment="leading" spacing={small ? 10 : 3} modifiers={root}>
    <Image systemName="dumbbell" modifiers={[font({ textStyle: small ? 'title2' : 'body' }), foregroundStyle(fullColor && palette ? palette.accent : { type: 'hierarchical', style: 'primary' })]} />
    {small ? <Spacer /> : null}
    <Text modifiers={[font({ textStyle: 'headline' }), main, lineLimit(2)]}>Training</Text>
    <Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(1)]}>Open Dawnage</Text>
  </VStack>;
}

export function WorkoutActivity(props: Partial<ActivityProps>, environment: LiveActivityEnvironment) {
  'widget';
  const stale = environment.isStale === true;
  const main = foregroundStyle({ type: 'hierarchical', style: 'primary' });
  const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
  const runningRest = !stale && typeof props.restEndsAt === 'number' && typeof props.restStartedAt === 'number' && props.restEndsAt > props.restStartedAt;
  const paused = !stale && typeof props.pausedRemainingMs === 'number' && props.pausedRemainingMs > 0;
  const pausedSeconds = Math.max(0, Math.ceil((props.pausedRemainingMs ?? 0) / 1000));
  const pausedText = `${Math.floor(pausedSeconds / 60)}:${String(pausedSeconds % 60).padStart(2, '0')}`;
  const timer = runningRest ? <Text timerInterval={{ lower: new Date(props.restStartedAt!), upper: new Date(props.restEndsAt!) }} countsDown modifiers={[font({ textStyle: 'title2', weight: 'semibold' }), monospacedDigit(), main]} /> : null;
  const title = stale ? 'Open Dawnage to continue' : runningRest ? 'Rest' : paused ? 'Rest paused' : 'Workout';
  const detail = stale ? 'Progress needs a refresh' : `Exercise ${props.exercise ?? 0} of ${props.exerciseCount ?? 0}`;
  const counts = `${props.completedSets ?? 0} of ${props.totalSets ?? 0} sets`;
  const banner = <HStack spacing={16} modifiers={[padding({ all: 16 })]}>
    <Image systemName={stale ? 'arrow.clockwise' : 'dumbbell'} modifiers={[font({ textStyle: 'title2' }), main]} />
    <VStack alignment="leading" spacing={4}>
      <Text modifiers={[font({ textStyle: 'headline' }), main, lineLimit(2)]}>{title}</Text>
      <Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(1)]}>{detail}</Text>
      {!stale ? <Text modifiers={[font({ textStyle: 'caption' }), secondary]}>{counts}</Text> : null}
    </VStack>
    <Spacer />
    {timer ?? (paused ? <Text modifiers={[monospacedDigit(), main]}>{pausedText}</Text> : null)}
  </HStack>;
  const compactTimer = runningRest ? <Text timerInterval={{ lower: new Date(props.restStartedAt!), upper: new Date(props.restEndsAt!) }} countsDown modifiers={[monospacedDigit(), frame({ width: 48 }), font({ textStyle: 'caption' })]} /> : null;
  return {
    banner,
    bannerSmall: <VStack spacing={3}><Text modifiers={[font({ textStyle: 'caption' }), lineLimit(2)]}>{title}</Text>{timer}</VStack>,
    compactLeading: <Image systemName={stale ? 'arrow.clockwise' : 'dumbbell'} modifiers={[accessibilityLabel(stale ? 'Open Dawnage to continue' : 'Dawnage workout')]} />,
    compactTrailing: compactTimer ?? <Text modifiers={[font({ textStyle: 'caption' }), monospacedDigit()]}>{stale ? 'Open' : paused ? 'Paused' : `${props.completedSets ?? 0}/${props.totalSets ?? 0}`}</Text>,
    minimal: <Image systemName={stale ? 'arrow.clockwise' : runningRest ? 'timer' : 'dumbbell'} modifiers={[accessibilityLabel(title)]} />,
    expandedCenter: <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(2)]}>{title}</Text>,
    expandedLeading: <Image systemName="dumbbell" />,
    expandedTrailing: timer ?? <Text>{paused ? pausedText : ''}</Text>,
    expandedBottom: <Text modifiers={[font({ textStyle: 'caption' }), secondary]}>{stale ? 'Open Dawnage to continue' : `${detail} · ${counts}`}</Text>,
  };
}
