"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { components } from "@stoneboyz/api-client";
import { Copy, Save, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  buildScheduleHref,
  type ScheduleAppointmentType,
} from "@/lib/schedule-links";
import {
  createCalendarViewAction,
  deleteCalendarViewAction,
  setDefaultCalendarViewAction,
  updateCalendarViewAction,
} from "./_view-actions";

type CalendarViewConfig = components["schemas"]["CalendarViewConfig"];

export type CalendarViewOption = {
  id: string;
  name: string;
  ownerUserId: string | null;
  isShared: boolean;
  isDefault: boolean;
  config: CalendarViewConfig;
};

export function ViewSelector({
  views,
  selectedViewId,
  date,
  customerId,
  projectId,
  appointmentType,
}: {
  views: CalendarViewOption[];
  selectedViewId: string;
  date: string;
  customerId: string;
  projectId: string;
  appointmentType?: ScheduleAppointmentType | undefined;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [saveAsShared, setSaveAsShared] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const myViews = views.filter((view) => !view.isShared);
  const sharedViews = views.filter((view) => view.isShared);
  const selectedView =
    views.find((view) => view.id === selectedViewId) ?? views[0] ?? null;

  const pushSelectedView = (viewId: string) => {
    router.push(
      buildScheduleHref({
        date,
        customerId,
        projectId,
        appointmentType,
        view: viewId,
      }),
    );
  };

  const saveCurrentView = () => {
    if (selectedView === null) {
      return;
    }

    startTransition(async () => {
      const result = await updateCalendarViewAction({
        viewId: selectedView.id,
        name: selectedView.name,
        isShared: selectedView.isShared,
        config: selectedView.config,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("View saved.");
      router.refresh();
    });
  };

  const createViewCopy = () => {
    if (selectedView === null) {
      return;
    }

    startTransition(async () => {
      const result = await createCalendarViewAction({
        name: saveAsName,
        isShared: saveAsShared,
        config: selectedView.config,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("View saved.");
      setIsSavingAs(false);
      setSaveAsName("");
      setSaveAsShared(false);
      pushSelectedView(result.view.id);
      router.refresh();
    });
  };

  const setDefaultView = () => {
    if (selectedView === null) {
      return;
    }

    startTransition(async () => {
      const result = await setDefaultCalendarViewAction({
        viewId: selectedView.id,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("Default view saved.");
      router.refresh();
    });
  };

  const deleteView = () => {
    if (selectedView === null) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCalendarViewAction({
        viewId: selectedView.id,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("View deleted.");
      const nextView = views.find((view) => view.id !== selectedView.id);
      pushSelectedView(nextView?.id ?? "");
      router.refresh();
    });
  };

  return (
    <div className="min-w-[280px] max-w-xl space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-64 space-y-1">
          <Label htmlFor="calendar-view">View</Label>
          <Select
            id="calendar-view"
            value={selectedViewId}
            onChange={(event) => pushSelectedView(event.currentTarget.value)}
          >
            {myViews.length > 0 ? (
              <optgroup label="My Views">
                {myViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                    {view.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {sharedViews.length > 0 ? (
              <optgroup label="Shared Views">
                {sharedViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                    {view.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={saveCurrentView}
          disabled={selectedView === null || isPending}
          title="Save view"
        >
          <Save className="mr-1 size-4" aria-hidden="true" />
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setMessage(null);
            setSaveAsName(selectedView ? `${selectedView.name} Copy` : "");
            setIsSavingAs(true);
          }}
          disabled={selectedView === null || isPending}
          title="Save view as"
        >
          <Copy className="mr-1 size-4" aria-hidden="true" />
          Save As
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={setDefaultView}
          disabled={selectedView === null || selectedView.isDefault || isPending}
          title="Set default view"
        >
          <Star className="mr-1 size-4" aria-hidden="true" />
          Default
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={deleteView}
          disabled={selectedView === null || isPending}
          title="Delete view"
        >
          <Trash2 className="mr-1 size-4" aria-hidden="true" />
          Delete
        </Button>
      </div>
      {isSavingAs ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-white p-3">
          <div className="w-64 space-y-1">
            <Label htmlFor="save-as-view-name">Name</Label>
            <Input
              id="save-as-view-name"
              value={saveAsName}
              onChange={(event) => setSaveAsName(event.currentTarget.value)}
              disabled={isPending}
            />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={saveAsShared}
              onChange={(event) => setSaveAsShared(event.currentTarget.checked)}
              disabled={isPending}
              className="size-4"
            />
            Shared
          </label>
          <Button
            type="button"
            size="sm"
            onClick={createViewCopy}
            disabled={selectedView === null || isPending}
          >
            <Save className="mr-1 size-4" aria-hidden="true" />
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsSavingAs(false)}
            disabled={isPending}
            title="Cancel"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <div className="min-h-5 text-xs text-muted-foreground">
        {isPending ? "Saving view..." : message}
      </div>
    </div>
  );
}
