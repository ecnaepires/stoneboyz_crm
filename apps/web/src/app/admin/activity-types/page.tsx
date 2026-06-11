import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiClientWithAuth } from "@/lib/api";
import {
  archiveActivityTypeAction,
  createActivityTypeAction,
  updateActivityTypeAction,
} from "./_actions";

const pipelineStages = [
  "new",
  "deposit",
  "template",
  "material",
  "fabrication",
  "install",
  "invoice",
  "done",
] as const;

const colorPresets = [
  { value: "#00ff4c", label: "Template" },
  { value: "#ff0000", label: "Deposit" },
  { value: "#ff00dd", label: "Material" },
  { value: "#fecaca", label: "Cut" },
  { value: "#fde68a", label: "Fabrication" },
  { value: "#bfdbfe", label: "Install" },
  { value: "#cbd5e1", label: "Invoice" },
  { value: "#fbcfe8", label: "Repair" },
  { value: "#d4d4d8", label: "Other" },
] as const;

const flagLabel = (enabled: boolean, label: string) => (
  <span
    className={`rounded px-2 py-0.5 text-xs ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
  >
    {label}
  </span>
);

function ActivityTypeFields({
  activityType,
}: {
  activityType?: {
    name: string;
    color: string;
    pipelineStage: string | null;
    countsSquareFootage: boolean;
    autoscheduleEligible: boolean;
    usesTemplateKind: boolean;
    defaultDurationMinutes: number;
    sortOrder: number;
  };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(180px,1.2fr)_minmax(220px,1.4fr)_minmax(180px,1fr)_150px_130px]">
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Name</span>
        <Input
          name="name"
          placeholder="Name"
          defaultValue={activityType?.name}
          required
        />
      </label>

      <fieldset className="space-y-1 text-sm">
        <legend className="text-xs font-medium text-muted-foreground">
          Color
        </legend>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((color) => (
            <label
              key={color.value}
              className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-input"
              title={color.label}
              style={{ backgroundColor: color.value }}
            >
              <input
                className="sr-only peer"
                name="color"
                type="radio"
                value={color.value}
                defaultChecked={
                  (activityType?.color ?? "#d4d4d8") === color.value
                }
                required
              />
              <span className="hidden h-4 w-4 rounded-full border-2 border-white bg-black/30 peer-checked:block" />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          Pipeline Stage
        </span>
        <Select
          name="pipelineStage"
          defaultValue={activityType?.pipelineStage ?? ""}
        >
          <option value="">No pipeline stage</option>
          {pipelineStages.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          Default Duration (minutes)
        </span>
        <Input
          className="w-full"
          name="defaultDurationMinutes"
          type="number"
          min={1}
          defaultValue={activityType?.defaultDurationMinutes ?? 60}
          required
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          Display Order
        </span>
        <Input
          className="w-full"
          name="sortOrder"
          type="number"
          min={1}
          defaultValue={activityType?.sortOrder}
          placeholder="Display Order"
        />
      </label>

      <label className="flex items-center gap-2 text-sm md:col-start-2">
        <input
          name="countsSquareFootage"
          type="checkbox"
          defaultChecked={activityType?.countsSquareFootage ?? false}
        />
        Counts Square Footage
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="autoscheduleEligible"
          type="checkbox"
          defaultChecked={activityType?.autoscheduleEligible ?? false}
        />
        Autoschedule Eligible
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="usesTemplateKind"
          type="checkbox"
          defaultChecked={activityType?.usesTemplateKind ?? false}
        />
        Uses Template Kind
      </label>
    </div>
  );
}

export default async function AdminActivityTypesPage() {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET("/activity-types", {
    params: { query: { includeArchived: true } },
  });

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load activity types: {JSON.stringify(error)}
      </div>
    );
  }

  const activityTypes = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activity Types</h2>
        <p className="text-sm text-muted-foreground">
          Manage schedule catalog colors, pipeline flags, duration, and
          autoschedule behavior.
        </p>
      </div>

      <form
        action={createActivityTypeAction}
        className="space-y-3 rounded-md border bg-white p-4"
      >
        <h3 className="font-semibold">Create Activity Type</h3>
        <ActivityTypeFields />
        <Button type="submit">Create</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Display Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[420px]">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activityTypes.map((activityType) => (
            <TableRow key={activityType.id}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  <span
                    className="h-4 w-4 rounded border"
                    style={{ backgroundColor: activityType.color }}
                  />
                  {activityType.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activityType.seedSlug ?? "Custom"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {flagLabel(activityType.countsSquareFootage, "Sqft")}
                  {flagLabel(activityType.autoscheduleEligible, "Autoschedule")}
                  {flagLabel(activityType.usesTemplateKind, "Template kind")}
                  {activityType.pipelineStage
                    ? flagLabel(true, activityType.pipelineStage)
                    : null}
                </div>
              </TableCell>
              <TableCell>{activityType.defaultDurationMinutes} min</TableCell>
              <TableCell>{activityType.sortOrder}</TableCell>
              <TableCell>
                {activityType.archivedAt ? "Archived" : "Active"}
              </TableCell>
              <TableCell>
                <details className="space-y-3">
                  <summary className="cursor-pointer text-sm font-medium text-accent">
                    Edit
                  </summary>
                  <form
                    action={updateActivityTypeAction.bind(
                      null,
                      activityType.id,
                    )}
                    className="space-y-3 pt-3"
                  >
                    <ActivityTypeFields activityType={activityType} />
                    <div className="flex gap-2">
                      <Button type="submit" variant="outline">
                        Save
                      </Button>
                    </div>
                  </form>
                  {!activityType.archivedAt ? (
                    <form
                      action={archiveActivityTypeAction.bind(
                        null,
                        activityType.id,
                      )}
                    >
                      <Button type="submit" variant="outline">
                        Archive
                      </Button>
                    </form>
                  ) : null}
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
