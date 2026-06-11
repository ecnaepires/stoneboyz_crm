'use server';

import { revalidatePath } from 'next/cache';
import type { components } from '@stoneboyz/api-client';
import { getApiClientWithAuth } from '@/lib/api';

type CalendarView = components['schemas']['CalendarView'];
type CalendarViewConfig = components['schemas']['CalendarViewConfig'];

type ViewActionResult =
  | { ok: true; view: CalendarView }
  | { ok: false; message: string };

const errorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
};

const revalidateSchedule = () => {
  revalidatePath('/schedule');
};

export async function createCalendarViewAction(input: {
  name: string;
  isShared: boolean;
  config: CalendarViewConfig;
}): Promise<ViewActionResult> {
  const client = await getApiClientWithAuth();
  const name = input.name.trim();

  if (!name) {
    return { ok: false, message: 'View name is required.' };
  }

  const { data, error } = await client.POST('/calendar-views', {
    body: {
      name,
      viewKind: 'calendar',
      isShared: input.isShared,
      config: input.config,
    },
  });

  if (error || !data) {
    return {
      ok: false,
      message: errorMessage(error, 'Calendar view could not be saved.'),
    };
  }

  revalidateSchedule();
  return { ok: true, view: data };
}

export async function updateCalendarViewAction(input: {
  viewId: string;
  name?: string;
  isShared?: boolean;
  config?: CalendarViewConfig;
}): Promise<ViewActionResult> {
  const client = await getApiClientWithAuth();
  const body: {
    name?: string;
    isShared?: boolean;
    config?: CalendarViewConfig;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, message: 'View name is required.' };
    }
    body.name = name;
  }

  if (input.isShared !== undefined) {
    body.isShared = input.isShared;
  }

  if (input.config !== undefined) {
    body.config = input.config;
  }

  const { data, error } = await client.PATCH('/calendar-views/{viewId}', {
    params: { path: { viewId: input.viewId } },
    body,
  });

  if (error || !data) {
    return {
      ok: false,
      message: errorMessage(error, 'Calendar view could not be updated.'),
    };
  }

  revalidateSchedule();
  return { ok: true, view: data };
}

export async function setDefaultCalendarViewAction(input: {
  viewId: string;
}): Promise<ViewActionResult> {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.POST(
    '/calendar-views/{viewId}/make-default',
    {
      params: { path: { viewId: input.viewId } },
    },
  );

  if (error || !data) {
    return {
      ok: false,
      message: errorMessage(error, 'Default calendar view could not be changed.'),
    };
  }

  revalidateSchedule();
  return { ok: true, view: data };
}

export async function deleteCalendarViewAction(input: {
  viewId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = await getApiClientWithAuth();
  const { error } = await client.DELETE('/calendar-views/{viewId}', {
    params: { path: { viewId: input.viewId } },
  });

  if (error) {
    return {
      ok: false,
      message: errorMessage(error, 'Calendar view could not be deleted.'),
    };
  }

  revalidateSchedule();
  return { ok: true };
}
