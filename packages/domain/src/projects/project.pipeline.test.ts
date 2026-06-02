import { describe, expect, it } from 'vitest';

import {
  isForward,
  PIPELINE_STAGE_VALUES,
  stageFromAppointmentType,
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

  it('maps stage appointment types to pipeline stages', () => {
    expect(stageFromAppointmentType('deposit')).toBe('deposit');
    expect(stageFromAppointmentType('template')).toBe('template');
    expect(stageFromAppointmentType('material')).toBe('material');
    expect(stageFromAppointmentType('fabrication')).toBe('fabrication');
    expect(stageFromAppointmentType('install')).toBe('install');
    expect(stageFromAppointmentType('invoice')).toBe('invoice');
  });

  it('returns null for non-stage appointment types', () => {
    expect(stageFromAppointmentType('repair')).toBeNull();
    expect(stageFromAppointmentType('other')).toBeNull();
    expect(stageFromAppointmentType('cut')).toBeNull();
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
