"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { components } from "@stoneboyz/api-client";
import { ArrowDown, ArrowUp, Save, SlidersHorizontal, X } from "lucide-react";
import type { AssigneeOption } from "@/components/assignee-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import {
  buildScheduleHref,
  type ScheduleAppointmentType,
} from "@/lib/schedule-links";
import { updateCalendarViewAction } from "./_view-actions";
import type { CalendarViewOption } from "./ViewSelector";

type CalendarViewConfig = components["schemas"]["CalendarViewConfig"];
type CalendarDisplayField = CalendarViewConfig["displayFields"][number];
type ScheduledEventType = components["schemas"]["ScheduledEventType"];
type ScheduledEventStatus = components["schemas"]["ScheduledEventStatus"];
type ActivityType = components["schemas"]["ActivityType"];

const EVENT_TYPES: ScheduledEventType[] = ["appointment", "shop_job"];
const STATUSES: ScheduledEventStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];
const DISPLAY_FIELDS: CalendarDisplayField[] = [
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
];

const labelize = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const moveField = (
  fields: CalendarDisplayField[],
  field: CalendarDisplayField,
  direction: -1 | 1,
) => {
  const index = fields.indexOf(field);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= fields.length) {
    return fields;
  }

  const next = [...fields];
  const currentField = next[index];
  const targetField = next[nextIndex];
  if (!currentField || !targetField) {
    return fields;
  }

  next[index] = targetField;
  next[nextIndex] = currentField;
  return next;
};

export function CustomizePanel({
  selectedView,
  config,
  date,
  customerId,
  projectId,
  appointmentType,
  assignees,
  activityTypes,
}: {
  selectedView: CalendarViewOption | null;
  config: CalendarViewConfig;
  date: string;
  customerId: string;
  projectId: string;
  appointmentType?: ScheduleAppointmentType | undefined;
  assignees: AssigneeOption[];
  activityTypes: ActivityType[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(config);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    if (!draft.autoRefreshSeconds) {
      return;
    }

    const interval = window.setInterval(
      () => router.refresh(),
      draft.autoRefreshSeconds * 1000,
    );
    return () => window.clearInterval(interval);
  }, [draft.autoRefreshSeconds, router]);

  const applyDraft = () => {
    router.push(
      buildScheduleHref({
        date,
        customerId,
        projectId,
        appointmentType,
        view: selectedView?.id,
        displayType: draft.displayType,
        rangeDays: draft.rangeDays,
        eventTypes: draft.filters.eventTypes,
        activityTypeIds: draft.filters.activityTypeIds,
        statuses: draft.filters.statuses,
        assigneeIds: draft.filters.assigneeIds,
        hideCompleted: draft.filters.hideCompleted,
        displayFields: draft.displayFields,
        colorBy: draft.colorBy,
        wrapText: draft.wrapText,
        autoRefreshSeconds: draft.autoRefreshSeconds,
      }),
    );
  };

  const saveDraftToView = () => {
    if (selectedView === null) {
      return;
    }

    startTransition(async () => {
      const result = await updateCalendarViewAction({
        viewId: selectedView.id,
        config: draft,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("View saved.");
      router.refresh();
    });
  };

  const setFilters = (filters: Partial<CalendarViewConfig["filters"]>) => {
    setDraft((current) => ({
      ...current,
      filters: {
        ...current.filters,
        ...filters,
      },
    }));
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((current) => !current)}
      >
        <SlidersHorizontal className="mr-1 size-4" aria-hidden="true" />
        Customize
      </Button>
      {isOpen ? (
        <div className="w-full max-w-5xl rounded-md border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Customize View</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="calendar-display-type">Display</Label>
                <Select
                  id="calendar-display-type"
                  value={draft.displayType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      displayType: event.currentTarget
                        .value as CalendarViewConfig["displayType"],
                    }))
                  }
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="range">N-day</option>
                </Select>
              </div>
              {draft.displayType === "range" ? (
                <div className="space-y-1">
                  <Label htmlFor="calendar-range-days">Days</Label>
                  <Input
                    id="calendar-range-days"
                    type="number"
                    min={2}
                    max={31}
                    value={draft.rangeDays ?? 14}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        rangeDays: Number(event.currentTarget.value),
                      }))
                    }
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="calendar-color-by">Color</Label>
                <Select
                  id="calendar-color-by"
                  value={draft.colorBy}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      colorBy: event.currentTarget
                        .value as CalendarViewConfig["colorBy"],
                    }))
                  }
                >
                  <option value="appointmentType">Activity Type</option>
                  <option value="status">Status</option>
                  <option value="assignee">Assignee</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.wrapText}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      wrapText: event.currentTarget.checked,
                    }))
                  }
                  className="size-4"
                />
                Wrap text
              </label>
              <div className="space-y-1">
                <Label htmlFor="calendar-refresh">Auto refresh</Label>
                <Select
                  id="calendar-refresh"
                  value={String(draft.autoRefreshSeconds ?? "")}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      autoRefreshSeconds: event.currentTarget.value
                        ? Number(event.currentTarget.value)
                        : null,
                    }))
                  }
                >
                  <option value="">Off</option>
                  <option value="30">30 sec</option>
                  <option value="60">60 sec</option>
                  <option value="300">5 min</option>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <MultiSelect
                id="calendar-event-types"
                label="Event Types"
                value={draft.filters.eventTypes}
                options={EVENT_TYPES.map((value) => ({
                  value,
                  label: labelize(value),
                }))}
                onChange={(eventTypes) =>
                  setFilters({ eventTypes: eventTypes as ScheduledEventType[] })
                }
              />
              <MultiSelect
                id="calendar-appointment-types"
                label="Activity Types"
                value={draft.filters.activityTypeIds}
                options={activityTypes.map((activityType) => ({
                  value: activityType.id,
                  label: activityType.name,
                }))}
                onChange={(activityTypeIds) =>
                  setFilters({
                    activityTypeIds,
                  })
                }
              />
              <MultiSelect
                id="calendar-statuses"
                label="Statuses"
                value={draft.filters.statuses}
                options={STATUSES.map((value) => ({
                  value,
                  label: labelize(value),
                }))}
                onChange={(statuses) =>
                  setFilters({ statuses: statuses as ScheduledEventStatus[] })
                }
              />
              <MultiSelect
                id="calendar-assignees"
                label="Assignees"
                value={draft.filters.assigneeIds}
                options={assignees.map((assignee) => ({
                  value: assignee.id,
                  label: assignee.name,
                }))}
                onChange={(assigneeIds) => setFilters({ assigneeIds })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.filters.hideCompleted}
                  onChange={(event) =>
                    setFilters({ hideCompleted: event.currentTarget.checked })
                  }
                  className="size-4"
                />
                Hide completed
              </label>
            </div>

            <div className="space-y-2">
              <Label>Display Fields</Label>
              <div className="space-y-1">
                {DISPLAY_FIELDS.map((field) => {
                  const isSelected = draft.displayFields.includes(field);
                  return (
                    <div
                      key={field}
                      className="flex items-center gap-2 rounded border px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setDraft((current) => ({
                            ...current,
                            displayFields: checked
                              ? [...current.displayFields, field]
                              : current.displayFields.filter(
                                  (currentField) => currentField !== field,
                                ),
                          }));
                        }}
                        className="size-4"
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        {labelize(field)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            displayFields: moveField(
                              current.displayFields,
                              field,
                              -1,
                            ),
                          }))
                        }
                        disabled={!isSelected}
                        title="Move up"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            displayFields: moveField(
                              current.displayFields,
                              field,
                              1,
                            ),
                          }))
                        }
                        disabled={!isSelected}
                        title="Move down"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={applyDraft} disabled={isPending}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={saveDraftToView}
              disabled={selectedView === null || isPending}
            >
              <Save className="mr-1 size-4" aria-hidden="true" />
              Save to View
            </Button>
            <div className="min-h-5 text-xs text-muted-foreground">
              {isPending ? "Saving view..." : message}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
