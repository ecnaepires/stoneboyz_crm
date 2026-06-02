import { describe, expect, it } from 'vitest';
import {
  buildScheduleHref,
  isScheduleAppointmentType,
  nextAppointmentTypeForPipelineStage,
} from './schedule-links';

describe('schedule links', () => {
  it('builds calendar hrefs with pipeline context', () => {
    expect(
      buildScheduleHref({
        date: '2026-06-02',
        customerId: 'customer-1',
        projectId: 'project-1',
        appointmentType: 'install',
      }),
    ).toBe('/schedule?date=2026-06-02&customerId=customer-1&projectId=project-1&appointmentType=install');
  });

  it('maps pipeline stage to next schedulable appointment', () => {
    expect(nextAppointmentTypeForPipelineStage('new')).toBe('deposit');
    expect(nextAppointmentTypeForPipelineStage('deposit')).toBe('template');
    expect(nextAppointmentTypeForPipelineStage('template')).toBe('material');
    expect(nextAppointmentTypeForPipelineStage('material')).toBe('fabrication');
    expect(nextAppointmentTypeForPipelineStage('fabrication')).toBe('install');
    expect(nextAppointmentTypeForPipelineStage('install')).toBe('invoice');
    expect(nextAppointmentTypeForPipelineStage('invoice')).toBeNull();
    expect(nextAppointmentTypeForPipelineStage('done')).toBeNull();
  });

  it('accepts only supported appointment types', () => {
    expect(isScheduleAppointmentType('cut')).toBe(true);
    expect(isScheduleAppointmentType('done')).toBe(false);
    expect(isScheduleAppointmentType(undefined)).toBe(false);
  });
});
