import { describe, expect, it } from "vitest";
import { listCalendarEventsSchema } from "./scheduled-event.schemas.js";

describe("listCalendarEventsSchema", () => {
  it("parses optional calendar filters from query-shaped input", () => {
    const parsed = listCalendarEventsSchema.parse({
      from: "2026-06-01",
      to: "2026-06-08",
      eventTypes: "appointment,shop_job",
      appointmentTypes: ["template", "install"],
      statuses: "scheduled",
      assigneeIds: "11111111-1111-4111-8111-111111111111",
      hideCompleted: "true",
    });

    expect(parsed).toMatchObject({
      eventTypes: ["appointment", "shop_job"],
      appointmentTypes: ["template", "install"],
      statuses: ["scheduled"],
      assigneeIds: ["11111111-1111-4111-8111-111111111111"],
      hideCompleted: true,
    });
  });
});
