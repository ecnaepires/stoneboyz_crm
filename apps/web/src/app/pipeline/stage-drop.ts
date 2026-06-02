import { isForward, type PipelineStage } from '@stoneboyz/domain';

export type StageDrop =
  | { kind: 'noop' }
  | { kind: 'forward' }
  | { kind: 'backward' };

export function resolveStageDrop(from: PipelineStage, to: PipelineStage): StageDrop {
  if (from === to) {
    return { kind: 'noop' };
  }

  return isForward(from, to) ? { kind: 'forward' } : { kind: 'backward' };
}
