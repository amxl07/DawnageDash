import { SegmentedControlFallback } from './SegmentedControlFallback';
import type { SegmentedControlProps } from './SegmentedControl.types';

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  return <SegmentedControlFallback {...props} />;
}

export type { Segment, SegmentedControlProps } from './SegmentedControl.types';
