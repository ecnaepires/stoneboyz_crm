import { redirect } from "next/navigation";
import type { components } from "@stoneboyz/api-client";
import { getApiClientWithAuth } from "@/lib/api";
import {
  isScheduleAppointmentType,
  SCHEDULE_APPOINTMENT_TYPES,
} from "@/lib/schedule-links";
import { ScheduleCalendar, type CalendarEvent } from "./ScheduleCalendar";

type CalendarEventItem = components["schemas"]["CalendarEventItem"];
type CalendarView = components["schemas"]["CalendarView"];
type CalendarViewConfig = components["schemas"]["CalendarViewConfig"];
type ActivityType = components["schemas"]["ActivityType"];
type Assignee = components["schemas"]["Assignee"];
type Customer = components["schemas"]["Customer"];
type Project = components["schemas"]["Project"];
type ScheduledEventType = components["schemas"]["ScheduledEventType"];
type ScheduledEventStatus = components["schemas"]["ScheduledEventStatus"];
type CalendarDisplayField = components["schemas"]["CalendarDisplayField"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_CALENDAR_CONFIG: CalendarViewConfig = {
  version: 2,
  displayType: "week",
  groupBy: "none",
  filters: {
    eventTypes: [],
    activityTypeIds: [],
    statuses: [],
    assigneeIds: [],
    hideCompleted: false,
  },
  displayFields: [
    "projectTitle",
    "customerName",
    "address",
    "activityTitle",
    "time",
    "status",
    "assignees",
  ],
  colorBy: "appointmentType",
  wrapText: true,
  autoRefreshSeconds: null,
  showDaySubtotals: false,
};

const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const selectedDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

const weekRangeLabel = (start: Date, end: Date) =>
  `${new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(start)} - ${new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(end)}`;

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * MS_PER_DAY);

const startOfWeek = (date: Date) => {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, otherwise go back to Monday
  return addDays(date, mondayOffset);
};

const buildWeekDays = (selectedDate: Date, todayKey: string) => {
  const weekStart = startOfWeek(selectedDate);
  const selectedDateKey = dateKey(selectedDate);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(weekStart, index);
    const key = dateKey(date);

    return {
      key,
      isSelected: key === selectedDateKey,
    };
  });
};

const buildCalendarDays = (
  selectedDate: Date,
  todayKey: string,
  config: CalendarViewConfig,
) => {
  const selectedDateKey = dateKey(selectedDate);

  if (config.displayType === "day") {
    return [{ key: selectedDateKey, isSelected: true }];
  }

  if (config.displayType === "range") {
    const days = config.rangeDays ?? 14;
    return Array.from({ length: days }).map((_, index) => {
      const date = addDays(selectedDate, index);
      const key = dateKey(date);

      return {
        key,
        isSelected: key === selectedDateKey,
      };
    });
  }

  return buildWeekDays(selectedDate, todayKey);
};

const calendarRangeStart = (
  selectedDate: Date,
  config: CalendarViewConfig,
) => {
  if (config.displayType === "week") {
    return startOfWeek(selectedDate);
  }

  return selectedDate;
};

const calendarRangeLength = (config: CalendarViewConfig) => {
  if (config.displayType === "day") {
    return 1;
  }

  if (config.displayType === "range") {
    return config.rangeDays ?? 14;
  }

  return 7;
};

const csvValues = (value: string | undefined) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const oneOf = <T extends string>(value: string, allowed: readonly T[]): value is T =>
  allowed.includes(value as T);

const eventTypesFromParam = (value: string | undefined): ScheduledEventType[] =>
  csvValues(value).filter((item): item is ScheduledEventType =>
    oneOf(item, ["appointment", "shop_job"] as const),
  );

const activityTypeIdsFromParam = (value: string | undefined): string[] =>
  csvValues(value).filter((item) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item),
  );

const legacyActivityTypeIdsFromParam = (
  value: string | undefined,
  activityTypes: ActivityType[],
): string[] => {
  const requested = csvValues(value).filter((item) =>
    oneOf(item, SCHEDULE_APPOINTMENT_TYPES),
  );
  if (requested.length === 0) {
    return [];
  }

  return activityTypes
    .filter((activityType) => activityType.seedSlug !== null && requested.includes(activityType.seedSlug))
    .map((activityType) => activityType.id);
};

const statusesFromParam = (
  value: string | undefined,
): ScheduledEventStatus[] =>
  csvValues(value).filter((item): item is ScheduledEventStatus =>
    oneOf(
      item,
      ["scheduled", "confirmed", "in_progress", "completed", "cancelled"] as const,
    ),
  );

const displayFieldsFromParam = (
  value: string | undefined,
): CalendarDisplayField[] =>
  csvValues(value).filter((item): item is CalendarDisplayField =>
    oneOf(
      item,
      [
        "projectTitle",
        "customerName",
        "address",
        "activityTitle",
        "time",
        "duration",
        "status",
        "assignees",
        "notes",
        "sqft",
      ] as const,
    ),
  );

const boolFromParam = (value: string | undefined) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
};

const numberInRange = (
  value: string | undefined,
  min: number,
  max: number,
) => {
  const numberValue = value ? Number(value) : Number.NaN;
  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    return undefined;
  }

  return numberValue;
};

const applyUrlConfigOverrides = (
  config: CalendarViewConfig,
  params: {
    displayType?: string | undefined;
    rangeDays?: string | undefined;
    eventTypes?: string | undefined;
    activityTypeIds?: string | undefined;
    appointmentTypes?: string | undefined;
    statuses?: string | undefined;
    assigneeIds?: string | undefined;
    hideCompleted?: string | undefined;
    displayFields?: string | undefined;
    colorBy?: string | undefined;
    wrapText?: string | undefined;
    autoRefreshSeconds?: string | undefined;
    showDaySubtotals?: string | undefined;
    activityTypes: ActivityType[];
  },
): CalendarViewConfig => {
  const requestedDisplayType = params.displayType;
  const displayType =
    requestedDisplayType &&
    oneOf(requestedDisplayType, ["day", "week", "range"] as const)
      ? requestedDisplayType
      : config.displayType;
  const rangeDays = numberInRange(params.rangeDays, 2, 31);
  const eventTypes = eventTypesFromParam(params.eventTypes);
  const directActivityTypeIds = activityTypeIdsFromParam(params.activityTypeIds);
  const legacyActivityTypeIds = legacyActivityTypeIdsFromParam(params.appointmentTypes, params.activityTypes);
  const activityTypeIds = directActivityTypeIds.length > 0 ? directActivityTypeIds : legacyActivityTypeIds;
  const statuses = statusesFromParam(params.statuses);
  const assigneeIds = csvValues(params.assigneeIds);
  const hideCompleted = boolFromParam(params.hideCompleted);
  const displayFields = displayFieldsFromParam(params.displayFields);
  const requestedColorBy = params.colorBy;
  const colorBy =
    requestedColorBy &&
    oneOf(requestedColorBy, ["appointmentType", "status", "assignee"] as const)
      ? requestedColorBy
      : config.colorBy;
  const wrapText = boolFromParam(params.wrapText);
  const autoRefreshSeconds = numberInRange(params.autoRefreshSeconds, 15, 600);
  const showDaySubtotals = boolFromParam(params.showDaySubtotals);

  const nextConfig: CalendarViewConfig = {
    ...config,
    displayType,
    groupBy: config.groupBy,
    filters: {
      ...config.filters,
      eventTypes: eventTypes.length > 0 ? eventTypes : config.filters.eventTypes,
      activityTypeIds:
        activityTypeIds.length > 0
          ? activityTypeIds
          : config.filters.activityTypeIds,
      statuses: statuses.length > 0 ? statuses : config.filters.statuses,
      assigneeIds:
        assigneeIds.length > 0 ? assigneeIds : config.filters.assigneeIds,
      hideCompleted: hideCompleted ?? config.filters.hideCompleted,
    },
    displayFields:
      displayFields.length > 0 ? displayFields : config.displayFields,
    colorBy,
    wrapText: wrapText ?? config.wrapText,
    autoRefreshSeconds:
      params.autoRefreshSeconds !== undefined
        ? (autoRefreshSeconds ?? null)
        : config.autoRefreshSeconds,
    showDaySubtotals: showDaySubtotals ?? config.showDaySubtotals,
  };

  if (rangeDays !== undefined) {
    nextConfig.rangeDays = rangeDays;
  } else if (config.rangeDays !== undefined) {
    nextConfig.rangeDays = config.rangeDays;
  }

  return nextConfig;
};

type CalendarEventWithSqft = CalendarEventItem & {
  sqft?: number | null;
  sqftIsEstimate?: boolean;
};

const normalizeEvent = (event: CalendarEventItem): CalendarEvent => {
  const eventWithSqft = event as CalendarEventWithSqft;

  return {
    id: event.id,
    customerId: event.customerId,
    customerName: event.customerName,
    projectId: event.projectId ?? null,
    projectTitle: event.projectTitle,
    jobActivityId: event.jobActivityId ?? null,
    eventType: event.eventType,
    appointmentType: event.appointmentType ?? null,
    activityTypeId: event.activityTypeId ?? null,
    activityTypeName: event.activityTypeName ?? null,
    activityTypeColor: event.activityTypeColor ?? null,
    title: event.title,
    scheduledAt: event.scheduledAt,
    durationMinutes: event.durationMinutes,
    assigneeIds: event.assigneeIds,
    address: event.address ?? null,
    status: event.status,
    sqft: eventWithSqft.sqft ?? null,
    sqftIsEstimate: eventWithSqft.sqftIsEstimate ?? false,
  };
};

const viewMatchesEvent = (
  view: CalendarView | null,
  event: CalendarEventItem,
) => {
  if (view === null) {
    return true;
  }

  const filters = view.config.filters;

  if (filters.hideCompleted && event.status === "completed") {
    return false;
  }

  if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.eventType)) {
    return false;
  }

  if (
    filters.activityTypeIds.length > 0 &&
    (event.activityTypeId == null ||
      !filters.activityTypeIds.includes(event.activityTypeId))
  ) {
    return false;
  }

  if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
    return false;
  }

  if (
    filters.assigneeIds.length > 0 &&
    !event.assigneeIds.some((assigneeId) => filters.assigneeIds.includes(assigneeId))
  ) {
    return false;
  }

  if (filters.customerId && event.customerId !== filters.customerId) {
    return false;
  }

  if (filters.projectId && event.projectId !== filters.projectId) {
    return false;
  }

  return true;
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    customerId?: string;
    projectId?: string;
    appointmentType?: string;
    view?: string;
    displayType?: string;
    rangeDays?: string;
    eventTypes?: string;
    activityTypeIds?: string;
    appointmentTypes?: string;
    statuses?: string;
    assigneeIds?: string;
    hideCompleted?: string;
    displayFields?: string;
    colorBy?: string;
    wrapText?: string;
    autoRefreshSeconds?: string;
    showDaySubtotals?: string;
  }>;
}) {
  const {
    date,
    customerId: requestedCustomerId = "",
    projectId = "",
    appointmentType,
    view: requestedViewId = "",
    displayType,
    rangeDays,
    eventTypes,
    activityTypeIds,
    appointmentTypes,
    statuses,
    assigneeIds,
    hideCompleted,
    displayFields,
    colorBy,
    wrapText,
    autoRefreshSeconds,
    showDaySubtotals,
  } = await searchParams;
  const selectedDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? dateFromKey(date) : new Date();
  const todayKey = dateKey(new Date());
  const client = await getApiClientWithAuth();

  const [
    { data: customersRes, error: customersError },
    { data: projectsRes },
    { data: assigneesRes },
    { data: calendarViewsRes, error: calendarViewsError },
    { data: activityTypesRes, error: activityTypesError },
  ] = await Promise.all([
    client.GET("/customers", { params: { query: { limit: 100 } } }),
    client.GET("/projects", { params: { query: { limit: 100 } } }),
    client.GET("/assignees", {}),
    client.GET("/calendar-views", { params: { query: { viewKind: "calendar" } } }),
    client.GET("/activity-types", {}),
  ]);

  if (customersError) {
    if ("statusCode" in customersError && customersError.statusCode === 401) {
      redirect("/sign-in");
    }

    return (
      <div className="text-red-600">
        Failed to load calendar customers: {JSON.stringify(customersError)}
      </div>
    );
  }

  if (calendarViewsError) {
    return (
      <div className="text-red-600">
        Failed to load calendar views: {JSON.stringify(calendarViewsError)}
      </div>
    );
  }

  if (activityTypesError) {
    return (
      <div className="text-red-600">
        Failed to load activity types: {JSON.stringify(activityTypesError)}
      </div>
    );
  }

  const customers = (customersRes?.data ?? []) as Customer[];
  const projects = (projectsRes?.data ?? []) as Project[];
  const assignees = (assigneesRes ?? []) as Assignee[];
  const calendarViews = calendarViewsRes?.data ?? [];
  const activityTypes = activityTypesRes?.data ?? [];
  const selectedView =
    calendarViews.find((view) => view.id === requestedViewId) ??
    calendarViews.find((view) => view.isDefault) ??
    calendarViews[0] ??
    null;
  const effectiveConfig = selectedView
    ? applyUrlConfigOverrides(selectedView.config, {
        displayType,
        rangeDays,
        eventTypes,
        activityTypeIds,
        appointmentTypes,
        statuses,
        assigneeIds,
        hideCompleted,
        displayFields,
        colorBy,
        wrapText,
        autoRefreshSeconds,
        showDaySubtotals,
        activityTypes,
      })
    : null;
  const selectedViewId = selectedView?.id ?? "";
  const selectedProject = projectId
    ? (projects.find((project) => project.id === projectId) ?? null)
    : null;
  const selectedCustomerId = selectedProject?.customerId ?? requestedCustomerId;
  const selectedProjectId =
    selectedProject?.customerId === selectedCustomerId
      ? selectedProject.id
      : "";
  const selectedAppointmentType = isScheduleAppointmentType(appointmentType)
    ? appointmentType
    : "template";
  const rangeStart = effectiveConfig
    ? calendarRangeStart(selectedDate, effectiveConfig)
    : startOfWeek(selectedDate);
  const rangeLength = effectiveConfig ? calendarRangeLength(effectiveConfig) : 7;
  const rangeEnd = addDays(rangeStart, rangeLength);
  const rangeDisplayEnd = addDays(rangeStart, rangeLength - 1);
  const { data: eventsRes, error: eventsError } = await client.GET("/events", {
    params: {
      query: {
        from: dateKey(rangeStart),
        to: dateKey(rangeEnd),
        ...(effectiveConfig?.filters.eventTypes.length
          ? { eventTypes: effectiveConfig.filters.eventTypes }
          : {}),
        ...(effectiveConfig?.filters.activityTypeIds.length
          ? { activityTypeIds: effectiveConfig.filters.activityTypeIds }
          : {}),
        ...(effectiveConfig?.filters.statuses.length
          ? { statuses: effectiveConfig.filters.statuses }
          : {}),
        ...(effectiveConfig?.filters.assigneeIds.length
          ? { assigneeIds: effectiveConfig.filters.assigneeIds }
          : {}),
        ...(effectiveConfig?.filters.hideCompleted ? { hideCompleted: true } : {}),
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      },
    },
  });

  if (eventsError) {
    return (
      <div className="text-red-600">
        Failed to load calendar events: {JSON.stringify(eventsError)}
      </div>
    );
  }

  const events = (eventsRes?.data ?? [])
    .filter((event) =>
      effectiveConfig
        ? viewMatchesEvent({ ...selectedView!, config: effectiveConfig }, event)
        : true,
    )
    .filter((event) =>
      selectedCustomerId ? event.customerId === selectedCustomerId : true,
    )
    .filter((event) =>
      selectedProjectId ? event.projectId === selectedProjectId : true,
    )
    .map(normalizeEvent);

  events.sort(
    (left, right) =>
      new Date(left.scheduledAt).getTime() -
      new Date(right.scheduledAt).getTime(),
  );

  return (
    <ScheduleCalendar
      customers={customers}
      projects={projects}
      assignees={assignees.map((assignee) => ({
        id: assignee.id,
        name: assignee.name,
        assigneeType: assignee.assigneeType,
      }))}
      events={events}
      views={calendarViews.map((view) => ({
        id: view.id,
        name: view.name,
        ownerUserId: view.ownerUserId,
        isShared: view.isShared,
        isDefault: view.isDefault,
        config: view.config,
      }))}
      selectedViewId={selectedViewId}
      calendarConfig={effectiveConfig ?? DEFAULT_CALENDAR_CONFIG}
      days={
        effectiveConfig
          ? buildCalendarDays(selectedDate, todayKey, effectiveConfig)
          : buildWeekDays(selectedDate, todayKey)
      }
      selectedDateLabel={selectedDateLabel(selectedDate)}
      weekRangeLabel={weekRangeLabel(rangeStart, rangeDisplayEnd)}
      previousMonthDateKey={dateKey(addDays(selectedDate, -7))}
      nextMonthDateKey={dateKey(addDays(selectedDate, 7))}
      todayDateKey={todayKey}
      selectedCustomerId={selectedCustomerId}
      initialProjectId={selectedProjectId}
      initialAppointmentType={selectedAppointmentType}
      activityTypes={activityTypes}
    />
  );
}
