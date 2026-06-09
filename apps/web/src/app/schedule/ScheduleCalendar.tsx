"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  buildScheduleHref,
  SCHEDULE_APPOINTMENT_TYPES,
  type ScheduleAppointmentType,
} from "@/lib/schedule-links";
import { createScheduleEventAction } from "./_actions";

type CustomerOption = {
  id: string;
  name: string;
};

type ProjectOption = {
  id: string;
  title: string;
  customerId: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
};

export type CalendarEvent = {
  id: string;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectTitle: string | null;
  eventType: "appointment" | "shop_job";
  appointmentType: string | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  assigneeUserIds: string[];
  address: string | null;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
};

type CalendarDay = {
  key: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

interface ScheduleCalendarProps {
  customers: CustomerOption[];
  projects: ProjectOption[];
  users: UserOption[];
  events: CalendarEvent[];
  days: CalendarDay[];
  selectedDateKey: string;
  monthLabel: string;
  previousMonthDateKey: string;
  nextMonthDateKey: string;
  todayDateKey: string;
  selectedCustomerId: string;
  initialProjectId: string;
  initialAppointmentType: ScheduleAppointmentType;
}

const appointmentLabels = {
  template: "Template",
  deposit: "Deposit",
  material: "Material",
  cut: "Cut",
  fabrication: "Fabrication",
  install: "Install",
  invoice: "Invoice",
  repair: "Repair",
  other: "Other",
} satisfies Record<ScheduleAppointmentType, string>;

const activityTitle = (
  eventType: "appointment" | "shop_job",
  appointmentType: ScheduleAppointmentType,
) =>
  eventType === "shop_job" ? "Shop Job" : appointmentLabels[appointmentType];

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const agendaHours = Array.from({ length: 12 }, (_, index) => index + 7);

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

const labelize = (value: string | null) =>
  value ? value.replace(/_/g, " ") : "Shop";

type TaskColor = {
  background: string;
  border: string;
  text: string;
  chipBackground: string;
};

// Change these hex values to update schedule task colors and the preview legend.
const TASK_COLOR_PALETTE = {
  template: {
    background: "#f5f3ff",
    border: "#ddd6fe",
    text: "#4c1d95",
    chipBackground: "#ede9fe",
  },
  deposit: {
    background: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    chipBackground: "#d1fae5",
  },
  material: {
    background: "#fff7ed",
    border: "#fed7aa",
    text: "#9a3412",
    chipBackground: "#ffedd5",
  },
  cut: {
    background: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    chipBackground: "#fee2e2",
  },
  fabrication: {
    background: "#fffbeb",
    border: "#fde68a",
    text: "#78350f",
    chipBackground: "#fef3c7",
  },
  install: {
    background: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e3a8a",
    chipBackground: "#dbeafe",
  },
  invoice: {
    background: "#f8fafc",
    border: "#cbd5e1",
    text: "#334155",
    chipBackground: "#e2e8f0",
  },
  repair: {
    background: "#fdf2f8",
    border: "#fbcfe8",
    text: "#9d174d",
    chipBackground: "#fce7f3",
  },
  other: {
    background: "#f4f4f5",
    border: "#d4d4d8",
    text: "#3f3f46",
    chipBackground: "#e4e4e7",
  },
} satisfies Record<ScheduleAppointmentType, TaskColor>;

const taskStyle = (
  taskType: ScheduleAppointmentType,
  variant: "event" | "chip" = "event",
): CSSProperties => {
  const color = TASK_COLOR_PALETTE[taskType];

  return {
    backgroundColor:
      variant === "chip" ? color.chipBackground : color.background,
    borderColor: color.border,
    color: color.text,
  };
};

const taskColorKey = (event: CalendarEvent): ScheduleAppointmentType =>
  SCHEDULE_APPOINTMENT_TYPES.includes(
    event.appointmentType as ScheduleAppointmentType,
  )
    ? (event.appointmentType as ScheduleAppointmentType)
    : "other";

const eventMinuteOfDay = (event: CalendarEvent) => {
  const date = new Date(event.scheduledAt);
  return date.getHours() * 60 + date.getMinutes();
};

export function ScheduleCalendar({
  customers,
  projects,
  users,
  events,
  days,
  selectedDateKey,
  monthLabel,
  previousMonthDateKey,
  nextMonthDateKey,
  todayDateKey,
  selectedCustomerId,
  initialProjectId,
  initialAppointmentType,
}: ScheduleCalendarProps) {
  const initialCustomerId = selectedCustomerId || customers[0]?.id || "";
  const validInitialProjectId = projects.some(
    (project) =>
      project.id === initialProjectId &&
      project.customerId === initialCustomerId,
  )
    ? initialProjectId
    : "";
  const [formCustomerId, setFormCustomerId] = useState(initialCustomerId);
  const [formProjectId, setFormProjectId] = useState(validInitialProjectId);
  const [eventType, setEventType] = useState<"appointment" | "shop_job">(
    "appointment",
  );
  const [appointmentType, setAppointmentType] =
    useState<ScheduleAppointmentType>(initialAppointmentType);

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

  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];
  const filteredProjects = projects.filter(
    (project) => project.customerId === formCustomerId,
  );
  const selectedTaskColorKey =
    eventType === "shop_job" ? "other" : appointmentType;
  const baseScheduleParams = {
    customerId: selectedCustomerId,
    projectId: initialProjectId || undefined,
    appointmentType: initialProjectId ? initialAppointmentType : undefined,
  };

  return (
    <div className="grid min-h-[calc(100vh-7rem)] grid-cols-[minmax(0,1fr)_360px] gap-5">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-white text-muted-foreground">
              <CalendarDays className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Schedule</h2>
              <p className="text-sm text-muted-foreground">{monthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={buildScheduleHref({
                  ...baseScheduleParams,
                  date: previousMonthDateKey,
                })}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={buildScheduleHref({
                  ...baseScheduleParams,
                  date: todayDateKey,
                })}
              >
                Today
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={buildScheduleHref({
                  ...baseScheduleParams,
                  date: nextMonthDateKey,
                })}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border bg-white">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {dayNames.map((dayName) => (
              <div
                key={dayName}
                className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"
              >
                {dayName}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEvents = eventsByDate.get(day.key) ?? [];
              return (
                <Link
                  key={day.key}
                  href={buildScheduleHref({
                    ...baseScheduleParams,
                    date: day.key,
                  })}
                  className={`min-h-32 border-b border-r p-2 transition-colors hover:bg-muted/40 ${
                    day.isSelected
                      ? "bg-primary/5 ring-1 ring-inset ring-primary"
                      : ""
                  } ${day.inMonth ? "bg-white" : "bg-muted/20 text-muted-foreground"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`flex size-7 items-center justify-center rounded-full text-sm font-medium ${
                        day.isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayEvents.length > 3 ? (
                      <span className="text-[11px] text-muted-foreground">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 4).map((event) => (
                      <div
                        key={event.id}
                        className="truncate rounded border px-2 py-1 text-[11px] font-medium"
                        style={taskStyle(taskColorKey(event), "chip")}
                      >
                        {timeLabel(event.scheduledAt)} {event.title}
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-md border bg-white">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(new Date(`${selectedDateKey}T12:00:00`))}
            </h3>
          </div>
          <div className="relative h-[768px] overflow-hidden">
            {agendaHours.map((hour) => (
              <div
                key={hour}
                className="grid h-16 grid-cols-[4rem_minmax(0,1fr)] border-b text-xs text-muted-foreground"
              >
                <div className="border-r px-3 py-2">
                  {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                </div>
                <div />
              </div>
            ))}
            <div className="absolute left-16 right-2 top-0">
              {selectedEvents.map((event) => {
                const top = Math.max(
                  0,
                  ((eventMinuteOfDay(event) - 7 * 60) / 60) * 64,
                );
                const height = Math.max(30, (event.durationMinutes / 60) * 64);
                return (
                  <Link
                    key={event.id}
                    href={`/customers/${event.customerId}/events/${event.id}`}
                    className="absolute left-3 right-3 rounded-md border px-3 py-2 text-sm shadow-sm"
                    style={{
                      ...taskStyle(taskColorKey(event)),
                      top,
                      minHeight: height,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {event.title}
                        </div>
                        <div className="truncate text-xs">
                          {event.customerName}
                          {event.projectTitle ? ` / ${event.projectTitle}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs">
                        {timeLabel(event.scheduledAt)}-{eventEndLabel(event)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="min-w-0 space-y-4">
        <div className="rounded-md border bg-white">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-semibold">Add To Calendar</h3>
          </div>
          <form action={createScheduleEventAction} className="space-y-4 p-4">
            <input
              type="hidden"
              name="title"
              value={activityTitle(eventType, appointmentType)}
            />

            <div
              className="space-y-1 rounded-md border px-3 py-2"
              style={taskStyle(selectedTaskColorKey)}
            >
              <div className="text-xs font-medium text-muted-foreground">
                Activity
              </div>
              <div className="text-sm font-semibold">
                {activityTitle(eventType, appointmentType)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                id="customerId"
                name="customerId"
                required
                value={formCustomerId}
                onChange={(event) => {
                  const nextCustomerId = event.currentTarget.value;
                  setFormCustomerId(nextCustomerId);
                  setFormProjectId((currentProjectId) =>
                    projects.some(
                      (project) =>
                        project.id === currentProjectId &&
                        project.customerId === nextCustomerId,
                    )
                      ? currentProjectId
                      : "",
                  );
                }}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Job</Label>
              <Select
                id="projectId"
                name="projectId"
                value={formProjectId}
                onChange={(event) =>
                  setFormProjectId(event.currentTarget.value)
                }
              >
                <option value="">No job</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="eventType">Type *</Label>
                <Select
                  id="eventType"
                  name="eventType"
                  required
                  value={eventType}
                  onChange={(event) =>
                    setEventType(
                      event.currentTarget.value as "appointment" | "shop_job",
                    )
                  }
                >
                  <option value="appointment">Appointment</option>
                  <option value="shop_job">Shop Job</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentType">Task</Label>
                <Select
                  id="appointmentType"
                  name="appointmentType"
                  value={appointmentType}
                  onChange={(event) =>
                    setAppointmentType(
                      event.currentTarget.value as ScheduleAppointmentType,
                    )
                  }
                  disabled={eventType === "shop_job"}
                >
                  {SCHEDULE_APPOINTMENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {appointmentLabels[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date *</Label>
                <Input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="date"
                  defaultValue={selectedDateKey}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  defaultValue="08:00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Minutes *</Label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min="1"
                  defaultValue="60"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigneeUserIds">Assignees</Label>
              <Select
                id="assigneeUserIds"
                name="assigneeUserIds"
                multiple
                className="min-h-28"
                disabled={users.length === 0}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </Select>
            </div>

            <Button type="submit" className="w-full">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Save Event
            </Button>
          </form>
        </div>

        <div className="rounded-md border bg-white">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">Task Colors</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {SCHEDULE_APPOINTMENT_TYPES.map((taskType) => (
              <div
                key={taskType}
                className="rounded-md border px-2.5 py-2 text-xs font-semibold"
                style={taskStyle(taskType, "chip")}
              >
                {appointmentLabels[taskType]}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-white">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Clock
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="font-semibold">Agenda</h3>
          </div>
          <div className="divide-y">
            {selectedEvents.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No events scheduled.
              </p>
            ) : (
              selectedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/customers/${event.customerId}/events/${event.id}`}
                  className="block px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeLabel(event.scheduledAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{event.customerName}</span>
                    <span className="capitalize">
                      {labelize(event.appointmentType)}
                    </span>
                    <span className="capitalize">
                      {event.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
