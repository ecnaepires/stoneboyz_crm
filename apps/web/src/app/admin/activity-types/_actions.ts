'use server';

import type { components } from '@stoneboyz/api-client';
import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

type PipelineStage = NonNullable<components['schemas']['ActivityType']['pipelineStage']>;

const pipelineStages = ['new', 'deposit', 'template', 'material', 'fabrication', 'install', 'invoice', 'done'] as const;

const textValue = (formData: FormData, key: string): string => String(formData.get(key) ?? '').trim();

const optionalPipelineStage = (formData: FormData): PipelineStage | null => {
  const value = textValue(formData, 'pipelineStage');
  return pipelineStages.includes(value as PipelineStage) ? (value as PipelineStage) : null;
};

const positiveInteger = (formData: FormData, key: string): number | undefined => {
  const value = Number(textValue(formData, key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
};

const boolValue = (formData: FormData, key: string): boolean => formData.get(key) === 'on';

const activityTypeBody = (formData: FormData) => {
  const sortOrder = positiveInteger(formData, 'sortOrder');
  return {
    name: textValue(formData, 'name'),
    color: textValue(formData, 'color'),
    pipelineStage: optionalPipelineStage(formData),
    countsSquareFootage: boolValue(formData, 'countsSquareFootage'),
    autoscheduleEligible: boolValue(formData, 'autoscheduleEligible'),
    usesTemplateKind: boolValue(formData, 'usesTemplateKind'),
    defaultDurationMinutes: positiveInteger(formData, 'defaultDurationMinutes') ?? 60,
    ...(sortOrder !== undefined ? { sortOrder } : {}),
  };
};

export async function createActivityTypeAction(formData: FormData) {
  const client = await getApiClientWithAuth();
  const { error } = await client.POST('/activity-types', {
    body: activityTypeBody(formData),
  });

  if (error) {
    throw new Error('Failed to create activity type: ' + JSON.stringify(error));
  }

  revalidatePath('/admin/activity-types');
  revalidatePath('/schedule');
}

export async function updateActivityTypeAction(activityTypeId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const { error } = await client.PATCH('/activity-types/{activityTypeId}', {
    params: { path: { activityTypeId } },
    body: activityTypeBody(formData),
  });

  if (error) {
    throw new Error('Failed to update activity type: ' + JSON.stringify(error));
  }

  revalidatePath('/admin/activity-types');
  revalidatePath('/schedule');
}

export async function archiveActivityTypeAction(activityTypeId: string) {
  const client = await getApiClientWithAuth();
  const { error } = await client.POST('/activity-types/{activityTypeId}/archive', {
    params: { path: { activityTypeId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to archive activity type: ' + JSON.stringify(error));
  }

  revalidatePath('/admin/activity-types');
  revalidatePath('/schedule');
}
