import { describe, expect, it } from 'vitest';

import {
  isForward,
  PIPELINE_STAGE_VALUES,
  STAGE_ORDER,
  statusFromStage
} from './project.pipeline.js';

describe('project pipeline stages', () => {
  it('defines the ordered pipeline stages and their indexes', () => {
    expect(PIPELINE_STAGE_VALUES).toEqual([
      'new',
      'deposit',
      'template',
      'material',
      'fabrication',
      'install',
      'invoice',
      'done'
    ]);

    expect(STAGE_ORDER).toEqual({
      new: 0,
      deposit: 1,
      template: 2,
      material: 3,
      fabrication: 4,
      install: 5,
      invoice: 6,
      done: 7
    });
  });

  it('derives project status from pipeline stage', () => {
    expect(statusFromStage('new')).toBe('draft');
    expect(statusFromStage('deposit')).toBe('active');
    expect(statusFromStage('template')).toBe('active');
    expect(statusFromStage('material')).toBe('active');
    expect(statusFromStage('fabrication')).toBe('active');
    expect(statusFromStage('install')).toBe('active');
    expect(statusFromStage('invoice')).toBe('active');
    expect(statusFromStage('done')).toBe('completed');
  });

  it('detects forward stage moves', () => {
    expect(isForward('new', 'deposit')).toBe(true);
    expect(isForward('invoice', 'material')).toBe(false);
    expect(isForward('template', 'template')).toBe(false);
  });
});
