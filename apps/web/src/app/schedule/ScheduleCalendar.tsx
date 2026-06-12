"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { components } from "@stoneboyz/api-client";
import { daySubtotal } from "@stoneboyz/domain";
import {
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Search,
} from "lucide-react";
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
import { NewAppointmentButton } from "./NewAppointmentButton";
import { PrintButton } from "./PrintButton";
import { ScheduleEventEditor } from "./ScheduleEventEditor";
import { ViewSelector, type CalendarViewOption } from "./ViewSelector";

type CalendarViewConfig = components["schemas"]["CalendarViewConfig"];
type ActivityType = components["schemas"]["ActivityType"];
type Customer = components["schemas"]["Customer"];
type Project = components["schemas"]["Project"];

export type CalendarEvent = {
  id: string;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectTitle: string | null;
  jobActivityId: string | null;
  eventType: "appointment" | "shop_job";
  activityTypeId: string | null;
  activityTypeName: string | null;
  activityTypeColor: string | null;
  appointmentType: string | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  assigneeIds: string[];
  address: string | null;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  sqft: number | null;
  sqftIsEstimate: boolean;
};

type CalendarDay = {
  key: string;
  isSelected: boolean;
};

interface ScheduleCalendarProps {
  customers: Customer[];
  projects: Project[];
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
  activityTypes: ActivityType[];
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

const hoursLabel = (hours: number) => {
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${rounded} ${hours === 1 ? "hour" : "hours"}`;
};

const sqftLabel = (sqft: number) => {
  const rounded = Number.isInteger(sqft) ? String(sqft) : sqft.toFixed(1);
  return `${rounded} sqft`;
};

const searchHref = (target: string, query: string) => {
  const encoded = encodeURIComponent(query);
  if (target === "accounts") return `/customers?search=${encoded}`;
  if (target === "jobs") return `/projects?search=${encoded}`;
  if (target === "leads") return `/pipeline?search=${encoded}`;
  if (target === "quotes") return `/customers?search=${encoded}`;
  return `/projects?search=${encoded}`;
};

// Change this hex value to adjust empty-day gray tone.
const EMPTY_DAY_BACKGROUND_COLOR = "#e6e9ec";
const DAY_BORDER_WIDTH_CLASS = "border";

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
  customers,
  projects,
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
  activityTypes,
}: ScheduleCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedEvent, setDraggedEvent] = useState<DraggedEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [topbarTarget, setTopbarTarget] = useState<HTMLElement | null>(null);
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

  useEffect(() => {
    setTopbarTarget(document.getElementById("app-topbar-actions"));
  }, []);

  const topbarContent = (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <form
        className="flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const query = String(formData.get("q") ?? "").trim();
          if (!query) return;
          router.push(searchHref(String(formData.get("target") ?? "accounts"), query));
        }}
      >
        <select
          name="target"
          aria-label="Search type"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          defaultValue="accounts"
        >
          <option value="accounts">Accounts</option>
          <option value="jobs">Jobs</option>
          <option value="leads">Leads</option>
          <option value="quotes">Quotes</option>
          <option value="orders">Orders</option>
        </select>
        <input
          name="q"
          type="search"
          placeholder="Search..."
          className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm"
        />
        <Button type="submit" variant="outline" size="sm" title="Search">
          <Search className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <ViewSelector
        compact
        views={views}
        selectedViewId={selectedViewId}
        date={days.find((day) => day.isSelected)?.key ?? todayDateKey}
        customerId={selectedCustomerId}
        projectId={initialProjectId}
        appointmentType={initialProjectId ? initialAppointmentType : undefined}
      />
      <CustomizePanel
        selectedView={selectedView}
        config={calendarConfig}
        date={days.find((day) => day.isSelected)?.key ?? todayDateKey}
        customerId={selectedCustomerId}
        projectId={initialProjectId}
        appointmentType={initialProjectId ? initialAppointmentType : undefined}
        assignees={assignees}
        activityTypes={activityTypes}
      />
      <PrintButton />
      <NewAppointmentButton
        customers={customers}
        projects={projects}
        activityTypes={activityTypes}
        assignees={assignees}
        selectedCustomerId={selectedCustomerId}
        selectedProjectId={initialProjectId}
        date={days.find((day) => day.isSelected)?.key ?? todayDateKey}
      />
    </div>
  );

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
      {topbarTarget ? createPortal(topbarContent, topbarTarget) : null}
      {editingEvent ? (
        <ScheduleEventEditor
          assignees={assignees}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={() => router.refresh()}
        />
      ) : null}
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
              <p className="text-sm text-muted-foreground">{weekRangeLabel}</p>
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
                const hasActivities = dayEvents.length > 0;
                const subtotal = daySubtotal(dayEvents);
                const totalSqft = subtotal.byType.reduce(
                  (sum, item) => sum + item.sqft,
                  0,
                );
                const hasSqft = subtotal.byType.length > 0;
                const sqftIsEstimate = subtotal.byType.some(
                  (item) => item.isEstimate,
                );
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
                        {shortDateLabel(day.key)}
                        {hasActivities
                          ? ` (${hoursLabel(subtotal.totalHours)})`
                          : null}
                      </div>
                      <div className="mt-1 space-y-0.5 text-muted-foreground">
                        <div>Activities: {dayEvents.length}</div>
                        {hasActivities ? (
                          <>
                            <div>
                              Scheduled hours: {hoursLabel(subtotal.totalHours)}
                            </div>
                            {hasSqft ? (
                              <div>
                                Square footage: {sqftLabel(totalSqft)}
                                {sqftIsEstimate ? " est." : ""}
                              </div>
                            ) : null}
                            {calendarConfig.showDaySubtotals && subtotal.byType.length > 0 ? (
                              <div className="text-xs">
                                {subtotal.byType
                                  .map(
                                    (t) =>
                                      `${t.name} ${t.isEstimate ? "~" : ""}${Math.round(t.sqft)}`,
                                  )
                                  .join(" · ")}
                              </div>
                            ) : null}
                          </>
                        ) : null}
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
                            <button
                              key={event.id}
                              type="button"
                              draggable={canMove}
                              onClick={() => setEditingEvent(event)}
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
                              className={`block w-full border bg-white px-2 py-2 text-left text-[11px] leading-4 shadow-sm transition-colors hover:bg-muted/40 ${
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
                            </button>
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
