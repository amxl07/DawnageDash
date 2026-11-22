import type { LucideIcon } from 'lucide-react-native';

export type Segment<T extends string> = { value: T; label: string; icon?: LucideIcon };

export type SegmentedControlProps<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Stack as a wrapping grid of big targets rather than a compact row. */
  large?: boolean;
  /** Keep the group label for accessibility while allowing a parent to present it visibly. */
  showLabel?: boolean;
};
