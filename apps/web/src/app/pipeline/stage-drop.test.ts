import { describe, expect, it } from 'vitest';
import { resolveStageDrop } from './stage-drop';

describe('resolveStageDrop', () => {
  it('returns noop when the stage is unchanged', () => {
    expect(resolveStageDrop('template', 'template')).toEqual({ kind: 'noop' });
  });

  it('returns forward when moving to a later stage', () => {
    expect(resolveStageDrop('new', 'deposit')).toEqual({ kind: 'forward' });
    expect(resolveStageDrop('deposit', 'install')).toEqual({ kind: 'forward' });
  });

  it('returns backward when moving to an earlier stage', () => {
    expect(resolveStageDrop('install', 'deposit')).toEqual({ kind: 'backward' });
    expect(resolveStageDrop('done', 'new')).toEqual({ kind: 'backward' });
  });
});
