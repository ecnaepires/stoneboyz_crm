"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { components } from "@stoneboyz/api-client";
import { ChevronLeft, ChevronRight, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildScheduleHref,
  type ScheduleAppointmentType,
} from "@/lib/schedule-links";
import { googleMapsDirectionsHref } from "@/lib/map-links";
import type { AssigneeOption } from "@/components/assignee-select";
import {
  confirmScheduleEventMoveAction,
  prepareScheduleEventMoveAction,
} from "./_actions";
import { CustomizePanel } from "./CustomizePanel";
import { EventCard, eventCardStyle } from "./EventCard";
import { PrintButton } from "./PrintButton";
import { ViewSelector, type CalendarViewOption } from "./ViewSelector";

type CalendarViewConfig = components["schemas"]["CalendarViewConfig"];

export type CalendarEvent = {
  id: string;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectTitle: string | null;
  jobActivityId: string | null;
  eventType: "appointment" | "shop_job";
  appointmentType: string | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  assigneeIds: string[];
  address: string | null;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
};

type CalendarDay = {
  key: string;
  isSelected: boolean;
};

interface ScheduleCalendarProps {
  assignees: AssigneeOption[];
  events: CalendarEvent[];
  days: CalendarDay[];
  selectedDateLabel: string;
  weekRangeLabel: string;
  previousMonthDateKey: string;
  nextMonthDateKey: string;
  todayDateKey: string;
  selectedCustomerId: string;
  initialProjectId: string;
  initialAppointmentType: ScheduleAppointmentType;
  views: CalendarViewOption[];
  selectedViewId: string;
  calendarConfig: CalendarViewConfig;
}

const dateKeyForEvent = (event: CalendarEvent) =>
  event.scheduledAt.slice(0, 10);

const timeLabel = (isoDate: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));

const eventEndLabel = (event: CalendarEvent) =>
  timeLabel(
    new Date(
      new Date(event.scheduledAt).getTime() + event.durationMinutes * 60_000,
    ).toISOString(),
  );

const weekdayLabel = (dateKey: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(`${dateKey}T12:00:00`),
  );

const shortDateLabel = (dateKey: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));

const totalHours = (events: CalendarEvent[]) =>
  events.reduce((sum, event) => sum + event.durationMinutes / 60, 0);

const hoursLabel = (hours: number) => {
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${rounded} ${hours === 1 ? "hour" : "hours"}`;
};

// Change this hex value to adjust empty-day gray tone.
const EMPTY_DAY_BACKGROUND_COLOR = "#e6e9ec";
const DAY_BORDER_WIDTH_CLASS = "border";

// Events created by scheduling a job activity open the activity editor;
// standalone events keep the event detail page.
const eventHref = (event: CalendarEvent) =>
  event.jobActivityId && event.projectId
    ? `/projects/${event.projectId}/activities/${event.jobActivityId}`
    : `/customers/${event.customerId}/events/${event.id}`;

type DraggedEvent = {
  id: string;
  customerId: string;
  projectId: string | null;
  jobActivityId: string | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  assigneeIds: string[];
  dateKey: string;
};

export function ScheduleCalendar({
  assignees,
  events,
  days,
  selectedDateLabel,
  weekRangeLabel,
  previousMonthDateKey,
  nextMonthDateKey,
  todayDateKey,
  selectedCustomerId,
  initialProjectId,
  initialAppointmentType,
  views,
  selectedViewId,
  calendarConfig,
}: ScheduleCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedEvent, setDraggedEvent] = useState<DraggedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = dateKeyForEvent(event);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    });
    grouped.forEach((dayEvents) =>
      dayEvents.sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() -
          new Date(right.scheduledAt).getTime(),
      ),
    );
    return grouped;
  }, [events]);

  const weekColumnTemplate = useMemo(
    () =>
      days
        .map((day) => {
          const dayEvents = eventsByDate.get(day.key) ?? [];
          return dayEvents.length > 0 ? "minmax(150px, 1fr)" : "96px";
        })
        .join(" "),
    [days, eventsByDate],
  );

  const assigneeNameById = useMemo(
    () => new Map(assignees.map((assignee) => [assignee.id, assignee.name])),
    [assignees],
  );

  const assigneeLabelForEvent = (event: CalendarEvent) => {
    const names = event.assigneeIds
      .map((id) => assigneeNameById.get(id))
      .filter((name): name is string => Boolean(name));

    return names.length > 0 ? names.join(", ") : "Unassigned";
  };

  const baseScheduleParams = {
    customerId: selectedCustomerId,
    projectId: initialProjectId || undefined,
    appointmentType: initialProjectId ? initialAppointmentType : undefined,
    view: selectedViewId || undefined,
  };
  const selectedView =
    views.find((view) => view.id === selectedViewId) ?? views[0] ?? null;

  const handleDrop = (dateKey: string) => {
    if (draggedEvent === null || draggedEvent.dateKey === dateKey) {
      setDraggedEvent(null);
      return;
    }

    const eventToMove = draggedEvent;
    setDraggedEvent(null);
    startTransition(async () => {
      const prepared = await prepareScheduleEventMoveAction({
        customerId: eventToMove.customerId,
        projectId: eventToMove.projectId,
        jobActivityId: eventToMove.jobActivityId,
      });

      if (!prepared.ok) {
        setError(prepared.message);
        return;
      }

      if (prepared.mode === "activity" && prepared.followers.length > 0) {
        const confirmed = window.confirm(
          `Moving ${eventToMove.title} also moves:\n${prepared.followers
            .map((follower) => `- ${follower.title}`)
            .join("\n")}`,
        );

        if (!confirmed) {
          return;
        }
      }

      const result = await confirmScheduleEventMoveAction({
        customerId: eventToMove.customerId,
        eventId: eventToMove.id,
        projectId: eventToMove.projectId,
        jobActivityId: eventToMove.jobActivityId,
        scheduledAt: eventToMove.scheduledAt,
        dateKey,
        durationMinutes: eventToMove.durationMinutes,
        assigneeIds: eventToMove.assigneeIds,
      });

      if (result.ok) {
        setError(null);
        router.refresh();
        return;
      }

      setError(result.message);
    });
  };

  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-start gap-3">
          <div data-print-hidden="true" className="contents">
          <ViewSelector
            views={views}
            selectedViewId={selectedViewId}
            date={days.find((day) => day.isSelected)?.key ?? todayDateKey}
            customerId={selectedCustomerId}
            projectId={initialProjectId}
            appointmentType={
              initialProjectId ? initialAppointmentType : undefined
            }
          />
          <CustomizePanel
            selectedView={selectedView}
            config={calendarConfig}
            date={days.find((day) => day.isSelected)?.key ?? todayDateKey}
            customerId={selectedCustomerId}
            projectId={initialProjectId}
            appointmentType={
              initialProjectId ? initialAppointmentType : undefined
            }
            assignees={assignees}
          />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildScheduleHref({
                      ...baseScheduleParams,
                      date: previousMonthDateKey,
                    })}
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{selectedDateLabel}</h2>
                  <p className="text-sm text-muted-foreground">
                    {weekRangeLabel}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildScheduleHref({
                      ...baseScheduleParams,
                      date: nextMonthDateKey,
                    })}
                    aria-label="Next week"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div data-print-hidden="true">
              <PrintButton />
            </div>
            <Button asChild variant="outline" size="sm">
              <Link
                href={buildScheduleHref({
                  ...baseScheduleParams,
                  date: todayDateKey,
                })}
              >
                Go to Today
              </Link>
            </Button>
          </div>
        </div>
        <div className="mb-3 min-h-5 text-sm text-muted-foreground">
          {isPending ? "Saving schedule move..." : null}
          {error ? <span className="text-red-600">{error}</span> : null}
        </div>

        <div className="overflow-x-auto rounded-md border bg-white">
          <div className="min-w-[1050px]">
            <div
              className="grid border-b bg-sky-600 text-white"
              style={{ gridTemplateColumns: weekColumnTemplate }}
            >
              {days.map((day) => (
                <div
                  key={day.key}
                  className="border-r border-sky-500 px-3 py-2 text-center text-xs font-semibold last:border-r-0"
                >
                  <div>{weekdayLabel(day.key)}</div>
                </div>
              ))}
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: weekColumnTemplate }}
            >
              {days.map((day) => {
                const dayEvents = eventsByDate.get(day.key) ?? [];
                const hours = totalHours(dayEvents);
                const hasActivities = dayEvents.length > 0;
                const mapHref = googleMapsDirectionsHref(
                  dayEvents
                    .map((event) => event.address)
                    .filter((address): address is string => Boolean(address)),
                );

                return (
                  <div
                    key={day.key}
                    className={`min-h-20 ${DAY_BORDER_WIDTH_CLASS} px-3 py-2 text-center text-xs hover:bg-sky-100 ${
                      hasActivities
                        ? "border-slate-400 bg-sky-50"
                        : "border-white text-muted-foreground"
                    } ${
                      day.isSelected
                        ? "bg-sky-100 ring-1 ring-inset ring-sky-500"
                        : ""
                    }`}
                    style={
                      hasActivities
                        ? undefined
                        : { backgroundColor: EMPTY_DAY_BACKGROUND_COLOR }
                    }
                  >
                    <Link
                      href={buildScheduleHref({
                        ...baseScheduleParams,
                        date: day.key,
                      })}
                      className="block"
                    >
                      <div
                        className={`font-medium ${hasActivities ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {shortDateLabel(day.key)} ({hoursLabel(hours)})
                      </div>
                      <div className="mt-1 space-y-0.5 text-muted-foreground">
                        <div>Activities: {dayEvents.length}</div>
                        <div>Scheduled hours: {hoursLabel(hours)}</div>
                      </div>
                    </Link>
                    {mapHref ? (
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 px-2 text-[11px]"
                        data-print-hidden="true"
                      >
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapIcon className="mr-1 size-3" aria-hidden="true" />
                          Map day
                        </a>
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: weekColumnTemplate }}
            >
              {days.map((day) => {
                const dayEvents = eventsByDate.get(day.key) ?? [];
                const hasActivities = dayEvents.length > 0;

                return (
                  <div
                    key={day.key}
                    onDragOver={(event) => {
                      if (draggedEvent !== null) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={() => handleDrop(day.key)}
                    className={`min-h-[620px] ${DAY_BORDER_WIDTH_CLASS} ${
                      hasActivities
                        ? "border-slate-400 bg-white"
                        : "border-white"
                    } ${
                      draggedEvent !== null && draggedEvent.dateKey !== day.key
                        ? "ring-2 ring-inset ring-sky-400"
                        : ""
                    }`}
                    style={
                      hasActivities
                        ? undefined
                        : { backgroundColor: EMPTY_DAY_BACKGROUND_COLOR }
                    }
                  >
                    <div className="space-y-0 p-0">
                      {dayEvents.length === 0 ? (
                        <div className="rounded border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                          No activities
                        </div>
                      ) : (
                        dayEvents.map((event) => {
                          const canMove =
                            event.status === "scheduled" ||
                            event.status === "confirmed";

                          return (
                            <Link
                              key={event.id}
                              href={eventHref(event)}
                              draggable={canMove}
                              onDragStart={(dragEvent) => {
                                if (!canMove) {
                                  dragEvent.preventDefault();
                                  return;
                                }

                                dragEvent.dataTransfer.effectAllowed = "move";
                                setError(null);
                                setDraggedEvent({
                                  id: event.id,
                                  customerId: event.customerId,
                                  projectId: event.projectId,
                                  jobActivityId: event.jobActivityId,
                                  title: event.title,
                                  scheduledAt: event.scheduledAt,
                                  durationMinutes: event.durationMinutes,
                                  assigneeIds: event.assigneeIds,
                                  dateKey: dateKeyForEvent(event),
                                });
                              }}
                              onDragEnd={() => setDraggedEvent(null)}
                              className={`block border bg-white px-2 py-2 text-[11px] leading-4 shadow-sm transition-colors hover:bg-muted/40 ${
                                canMove
                                  ? "cursor-grab active:cursor-grabbing"
                                  : "cursor-default"
                              }`}
                              style={eventCardStyle(
                                event,
                                calendarConfig.colorBy,
                              )}
                            >
                              <EventCard
                                event={event}
                                displayFields={calendarConfig.displayFields}
                                wrapText={calendarConfig.wrapText}
                                assigneeLabel={assigneeLabelForEvent(event)}
                                timeRange={`${timeLabel(event.scheduledAt)}-${eventEndLabel(event)}`}
                              />
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
