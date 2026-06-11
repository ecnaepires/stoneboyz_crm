"use client";

import type { CSSProperties } from "react";
import type { components } from "@stoneboyz/api-client";
import type { CalendarEvent } from "./ScheduleCalendar";

type CalendarViewConfig = components["schemas"]["CalendarViewConfig"];
type CalendarDisplayField = CalendarViewConfig["displayFields"][number];
type CalendarColorBy = CalendarViewConfig["colorBy"];

type EventColor = {
  background: string;
  border: string;
  text: string;
  chipBackground: string;
};

const DEFAULT_TASK_COLOR = {
  background: "#f4f4f5",
  border: "#d4d4d8",
  text: "#3f3f46",
  chipBackground: "#e4e4e7",
} satisfies EventColor;

const STATUS_COLOR_PALETTE = {
  scheduled: {
    background: "#f8fafc",
    border: "#94a3b8",
    text: "#334155",
    chipBackground: "#e2e8f0",
  },
  confirmed: {
    background: "#eff6ff",
    border: "#60a5fa",
    text: "#1d4ed8",
    chipBackground: "#dbeafe",
  },
  in_progress: {
    background: "#fffbeb",
    border: "#f59e0b",
    text: "#92400e",
    chipBackground: "#fef3c7",
  },
  completed: {
    background: "#ecfdf5",
    border: "#34d399",
    text: "#047857",
    chipBackground: "#d1fae5",
  },
  cancelled: {
    background: "#fef2f2",
    border: "#f87171",
    text: "#b91c1c",
    chipBackground: "#fee2e2",
  },
} satisfies Record<CalendarEvent["status"], EventColor>;

const ASSIGNEE_COLOR_PALETTE: EventColor[] = [
  { background: "#eef2ff", border: "#818cf8", text: "#3730a3", chipBackground: "#e0e7ff" },
  { background: "#ecfeff", border: "#22d3ee", text: "#0e7490", chipBackground: "#cffafe" },
  { background: "#f0fdf4", border: "#4ade80", text: "#166534", chipBackground: "#dcfce7" },
  { background: "#fdf4ff", border: "#e879f9", text: "#86198f", chipBackground: "#fae8ff" },
  { background: "#fff7ed", border: "#fb923c", text: "#9a3412", chipBackground: "#ffedd5" },
  { background: "#f5f3ff", border: "#a78bfa", text: "#5b21b6", chipBackground: "#ede9fe" },
  { background: "#f0fdfa", border: "#2dd4bf", text: "#0f766e", chipBackground: "#ccfbf1" },
  { background: "#fefce8", border: "#facc15", text: "#854d0e", chipBackground: "#fef9c3" },
  { background: "#fff1f2", border: "#fb7185", text: "#9f1239", chipBackground: "#ffe4e6" },
  { background: "#f4f4f5", border: "#a1a1aa", text: "#3f3f46", chipBackground: "#e4e4e7" },
];

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const taskColorForEvent = (event: CalendarEvent): EventColor => {
  const border = event.activityTypeColor ?? DEFAULT_TASK_COLOR.border;
  return {
    background: `${border}18`,
    border,
    text: DEFAULT_TASK_COLOR.text,
    chipBackground: `${border}18`,
  };
};

const colorForEvent = (
  event: CalendarEvent,
  colorBy: CalendarColorBy,
): EventColor => {
  if (colorBy === "status") {
    return STATUS_COLOR_PALETTE[event.status];
  }

  if (colorBy === "assignee") {
    const assigneeId = event.assigneeIds[0];
    if (!assigneeId) {
      return DEFAULT_TASK_COLOR;
    }
    return (
      ASSIGNEE_COLOR_PALETTE[
        hashString(assigneeId) % ASSIGNEE_COLOR_PALETTE.length
      ] ?? DEFAULT_TASK_COLOR
    );
  }

  return taskColorForEvent(event);
};

export const eventCardStyle = (
  event: CalendarEvent,
  colorBy: CalendarColorBy,
): CSSProperties => {
  const color = colorForEvent(event, colorBy);

  return {
    backgroundColor: color.background,
    borderColor: color.border,
    color: color.text,
    borderTopWidth: 6,
  };
};

const titleForField = (
  field: CalendarDisplayField,
  event: CalendarEvent,
  assigneeLabel: string,
) => {
  if (field === "projectTitle") {
    return event.projectTitle ?? event.title;
  }
  if (field === "customerName") {
    return event.customerName;
  }
  if (field === "address") {
    return event.address;
  }
  if (field === "activityTitle") {
    return event.title;
  }
  if (field === "duration") {
    return `${event.durationMinutes} min`;
  }
  if (field === "status") {
    return event.status.replace(/_/g, " ");
  }
  if (field === "assignees") {
    return assigneeLabel;
  }
  if (field === "notes" || field === "sqft") {
    return null;
  }
  return null;
};

export function EventCard({
  event,
  displayFields,
  wrapText,
  assigneeLabel,
  timeRange,
}: {
  event: CalendarEvent;
  displayFields: CalendarDisplayField[];
  wrapText: boolean;
  assigneeLabel: string;
  timeRange: string;
}) {
  return (
    <div
      className={`space-y-0.5 ${wrapText ? "whitespace-normal" : "truncate"}`}
    >
      {displayFields.map((field, index) => {
        const value =
          field === "time"
            ? timeRange
            : titleForField(field, event, assigneeLabel);

        if (!value) {
          return null;
        }

        return (
          <div
            key={`${field}-${index}`}
            className={`${index === 0 ? "font-bold" : ""} ${
              field === "status" ? "capitalize" : ""
            } ${wrapText ? "" : "truncate"}`}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}
