import { ToolbarActionFallback } from './ToolbarActionFallback';
import type { ToolbarActionProps } from './ToolbarAction.types';

export function ToolbarAction(props: ToolbarActionProps) {
  return <ToolbarActionFallback {...props} />;
}

export type { ToolbarActionProps } from './ToolbarAction.types';
