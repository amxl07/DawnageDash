import { createLiveActivity, createWidget } from 'expo-widgets';
import { dark, light } from '@/theme/colors';
import { CheckInWidget, TrainingWidget, WorkoutActivity } from './layouts.ios';
import type { NativeSurfaceAdapter } from './model';

const checkIn = createWidget('DawnageCheckIn', CheckInWidget);
const training = createWidget('DawnageTraining', TrainingWidget);
// ActivityKit is registered at runtime; config.widgets contains WidgetKit kinds only.
const workout = createLiveActivity('DawnageWorkout', WorkoutActivity);
const palette = (colors: typeof light) => ({ foreground: colors.foreground, muted: colors.mutedForeground, accent: colors.primary, background: colors.card });
const palettes = { light: palette(light), dark: palette(dark) };

export const nativeSurfaceAdapter: NativeSurfaceAdapter = {
  initialize: (links) => {
    checkIn.updateSnapshot({ url: links.checkIn, palettes });
    training.updateSnapshot({ url: links.training, palettes });
  },
  getInstances: () => workout.getInstances(),
  start: (props, url, staleDate) => workout.start(props, url, staleDate),
};
