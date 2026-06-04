"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getApiClientWithAuth } from "@/lib/api";
import type { CanvasLayout } from "@stoneboyz/domain";

const toOptionalString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === "string" ? value.trim() : "";
  return stringValue ? stringValue : undefined;
};

const toOptionalNullableString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === "string" ? value.trim() : "";
  return stringValue ? stringValue : null;
};

const toCents = (value: FormDataEntryValue | null) => {
  const numericValue = Number(value || 0);
  return Math.round(numericValue * 100);
};

const toOptionalNumber = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === "string" ? value.trim() : "";
  return stringValue ? Number(stringValue) : undefined;
};

const toOptionalNullableNumber = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === "string" ? value.trim() : "";
  return stringValue ? Number(stringValue) : null;
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type EdgeTreatment =
  | "unfinished"
  | "finished"
  | "appliance"
  | "mitered"
  | "waterfall";
type SinkType = "undermount" | "drop_in" | "farm";
type SinkShape =
  | "rectangle"
  | "oval"
  | "double"
  | "60_40"
  | "40_60"
  | "70_30"
  | "30_70";
type SinkCenterline = "none" | "left" | "right" | "center";
type MeasurementMutationClient = {
  POST: (
    path: string,
    options: {
      params: { path: Record<string, string> };
      body: Record<string, unknown>;
    },
  ) => Promise<{ data?: unknown; error?: unknown }>;
  PATCH: (
    path: string,
    options: {
      params: { path: Record<string, string> };
      body: Record<string, unknown>;
    },
  ) => Promise<{ error?: unknown }>;
  DELETE: (
    path: string,
    options: {
      params: { path: Record<string, string> };
      body: Record<string, unknown>;
    },
  ) => Promise<{ error?: unknown }>;
};

const unwrapApiData = (value: unknown) => {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data?: unknown }).data;
  }

  return value;
};

type PricingMutationClient = {
  POST: (
    path: string,
    options: { params: { path: Record<string, string> } },
  ) => Promise<{ error?: unknown }>;
  PATCH: (
    path: string,
    options: {
      params: { path: Record<string, string> };
      body: Record<string, unknown>;
    },
  ) => Promise<{ error?: unknown }>;
};

export async function createQuoteAction(
  customerId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const title = formData.get("title") as string;
  const projectId = toOptionalString(formData.get("projectId"));
  const priceListId = toOptionalNullableString(formData.get("priceListId"));
  const validUntil = toOptionalString(formData.get("validUntil"));
  const notes = toOptionalString(formData.get("notes"));
  const termsAndConditions = toOptionalString(
    formData.get("termsAndConditions"),
  );

  const { data, error } = await client.POST("/customers/{customerId}/quotes", {
    params: { path: { customerId } },
    body: {
      title,
      discountCents: toCents(formData.get("discount")),
      taxRateBps: Number(formData.get("taxRateBps") || 0),
      ...(projectId ? { projectId } : {}),
      priceListId,
      ...(validUntil ? { validUntil } : {}),
      ...(notes ? { notes } : {}),
      ...(termsAndConditions ? { termsAndConditions } : {}),
    },
  });

  if (error) {
    throw new Error("Failed to create quote");
  }

  redirect(`/customers/${customerId}/quotes/${data.id}`);
}

export async function updateQuoteAction(
  customerId: string,
  quoteId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}",
    {
      params: { path: { customerId, quoteId } },
      body: {
        title: formData.get("title") as string,
        projectId: toOptionalNullableString(formData.get("projectId")),
        priceListId: toOptionalNullableString(formData.get("priceListId")),
        validUntil: toOptionalNullableString(formData.get("validUntil")),
        discountCents: toCents(formData.get("discount")),
        taxRateBps: Number(formData.get("taxRateBps") || 0),
        notes: toOptionalNullableString(formData.get("notes")),
        termsAndConditions: toOptionalNullableString(
          formData.get("termsAndConditions"),
        ),
      },
    },
  );

  if (error) {
    throw new Error("Failed to update quote");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
  redirect(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function sendQuoteAction(customerId: string, quoteId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/send",
    {
      params: { path: { customerId, quoteId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to send quote");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function sendQuoteEmailAction(
  customerId: string,
  quoteId: string,
) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/send-email",
    {
      params: { path: { customerId, quoteId } },
    },
  );

  if (error) {
    throw new Error("Failed to email quote");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function acceptQuoteAction(customerId: string, quoteId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/accept",
    {
      params: { path: { customerId, quoteId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to accept quote");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function rejectQuoteAction(customerId: string, quoteId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/reject",
    {
      params: { path: { customerId, quoteId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to reject quote");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function archiveQuoteAction(customerId: string, quoteId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/archive",
    {
      params: { path: { customerId, quoteId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to archive quote");
  }

  redirect(`/customers/${customerId}/quotes`);
}

export async function addLineItemAction(
  customerId: string,
  quoteId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const quoteAreaId = toOptionalString(formData.get("quoteAreaId"));
  const slabId = toOptionalString(formData.get("slabId"));
  const lengthIn = toOptionalNumber(formData.get("lengthIn"));
  const widthIn = toOptionalNumber(formData.get("widthIn"));
  const thicknessCm = toOptionalNumber(formData.get("thicknessCm"));
  const edgeProfile = toOptionalString(formData.get("edgeProfile"));
  const notes = toOptionalString(formData.get("notes"));

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/line-items",
    {
      params: { path: { customerId, quoteId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        stoneType: formData.get("stoneType") as string,
        qty: Number(formData.get("qty") || 1),
        qtyUnit: formData.get("qtyUnit") as string,
        unitPriceCents: toCents(formData.get("unitPrice")),
        laborPriceCents: toCents(formData.get("laborPrice")),
        ...(quoteAreaId ? { quoteAreaId } : {}),
        ...(slabId ? { slabId } : {}),
        ...(lengthIn !== undefined ? { lengthIn } : {}),
        ...(widthIn !== undefined ? { widthIn } : {}),
        ...(thicknessCm !== undefined ? { thicknessCm } : {}),
        ...(edgeProfile ? { edgeProfile } : {}),
        ...(notes ? { notes } : {}),
      },
    },
  );

  if (error) {
    throw new Error("Failed to add line item");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function createAreaAction(
  customerId: string,
  quoteId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const material = toOptionalString(formData.get("material"));
  const color = toOptionalString(formData.get("color"));
  const edgeProfile = toOptionalString(formData.get("edgeProfile"));
  const notes = toOptionalString(formData.get("notes"));

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas",
    {
      params: { path: { customerId, quoteId } },
      body: {
        name: formData.get("name") as string,
        sortOrder: Number(formData.get("sortOrder") || 0),
        ...(material ? { material } : {}),
        ...(color ? { color } : {}),
        ...(edgeProfile ? { edgeProfile } : {}),
        ...(notes ? { notes } : {}),
      },
    },
  );

  if (error) {
    throw new Error("Failed to create area");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function updateAreaAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const material = toOptionalString(formData.get("material"));
  const color = toOptionalString(formData.get("color"));
  const edgeProfile = toOptionalString(formData.get("edgeProfile"));
  const notes = toOptionalString(formData.get("notes"));

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: {
        name: formData.get("name") as string,
        sortOrder: Number(formData.get("sortOrder") || 0),
        ...(material ? { material } : {}),
        ...(color ? { color } : {}),
        ...(edgeProfile ? { edgeProfile } : {}),
        ...(notes ? { notes } : {}),
      },
    },
  );

  if (error) {
    return { ok: false as const, error: "Failed to update area" };
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
  return { ok: true as const, data: undefined };
}

export async function deleteAreaAction(
  customerId: string,
  quoteId: string,
  areaId: string,
) {
  const client = await getApiClientWithAuth();

  const { error } = await client.DELETE(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to delete area");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function generatePricingAction(
  customerId: string,
  quoteId: string,
  areaId: string,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as PricingMutationClient;

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pricing/generate",
    {
      params: { path: { customerId, quoteId, areaId } },
    },
  );

  if (error) {
    throw new Error("Failed to generate pricing");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function savePricingSelectionsAction(
  customerId: string,
  quoteId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as PricingMutationClient;
  const areas = new Map<
    string,
    {
      areaId: string;
      materialItemId: string | null;
      edgeItemId: string | null;
      splashItemId: string | null;
      fabricationItemId: string | null;
    }
  >();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("area:") || typeof value !== "string") continue;

    const [, areaId, field] = key.split(":");
    if (
      !areaId ||
      !field ||
      ![
        "materialItemId",
        "edgeItemId",
        "splashItemId",
        "fabricationItemId",
      ].includes(field)
    ) {
      continue;
    }

    const current = areas.get(areaId) ?? {
      areaId,
      materialItemId: null,
      edgeItemId: null,
      splashItemId: null,
      fabricationItemId: null,
    };
    current[
      field as
        | "materialItemId"
        | "edgeItemId"
        | "splashItemId"
        | "fabricationItemId"
    ] =
      value.trim() ? value : null;
    areas.set(areaId, current);
  }

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/pricing-selections",
    {
      params: { path: { customerId, quoteId } },
      body: {
        defaultFabricationItemId: toOptionalNullableString(
          formData.get("defaultFabricationItemId"),
        ),
        sinkItemId: toOptionalNullableString(formData.get("sinkItemId")),
        faucetHoleItemId: toOptionalNullableString(
          formData.get("faucetHoleItemId"),
        ),
        areas: Array.from(areas.values()),
      },
    },
  );

  if (error) {
    throw new Error("Failed to save pricing selections");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function overridePricingLineAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  lineId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as PricingMutationClient;
  const overridePrice = toOptionalNullableNumber(formData.get("overridePrice"));

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pricing/{lineId}/override",
    {
      params: { path: { customerId, quoteId, areaId, lineId } },
      body: {
        overridePriceCents:
          overridePrice === null ? null : Math.round(overridePrice * 100),
        overrideReason: toOptionalNullableString(
          formData.get("overrideReason"),
        ),
      },
    },
  );

  if (error) {
    throw new Error("Failed to override pricing line");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function updateLineItemAction(
  customerId: string,
  quoteId: string,
  lineItemId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/line-items/{lineItemId}",
    {
      params: { path: { customerId, quoteId, lineItemId } },
      body: {
        slabId: toOptionalNullableString(formData.get("slabId")),
        sortOrder: Number(formData.get("sortOrder") || 0),
        stoneType: formData.get("stoneType") as string,
        lengthIn: toOptionalNullableNumber(formData.get("lengthIn")),
        widthIn: toOptionalNullableNumber(formData.get("widthIn")),
        thicknessCm: toOptionalNullableNumber(formData.get("thicknessCm")),
        edgeProfile: toOptionalNullableString(formData.get("edgeProfile")),
        qty: Number(formData.get("qty") || 1),
        qtyUnit: formData.get("qtyUnit") as string,
        unitPriceCents: toCents(formData.get("unitPrice")),
        laborPriceCents: toCents(formData.get("laborPrice")),
        notes: toOptionalNullableString(formData.get("notes")),
      },
    },
  );

  if (error) {
    throw new Error("Failed to update line item");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function deleteLineItemAction(
  customerId: string,
  quoteId: string,
  lineItemId: string,
) {
  const client = await getApiClientWithAuth();

  const { error } = await client.DELETE(
    "/customers/{customerId}/quotes/{quoteId}/line-items/{lineItemId}",
    {
      params: { path: { customerId, quoteId, lineItemId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to delete line item");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function createCounterPieceAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;
  const name = toOptionalString(formData.get("name"));

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        ...(name ? { name } : {}),
        lengthIn: Number(formData.get("lengthIn")),
        widthIn: Number(formData.get("widthIn")),
        quantity: Number(formData.get("quantity") || 1),
      },
    },
  );

  if (error) {
    throw new Error("Failed to add counter piece");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function createCounterPieceForCanvasAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;
  const name = toOptionalString(formData.get("name"));

  const { data, error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        ...(name ? { name } : {}),
        lengthIn: Number(formData.get("lengthIn")),
        widthIn: Number(formData.get("widthIn")),
        quantity: Number(formData.get("quantity") || 1),
        kind: (formData.get("kind") as "countertop" | "backsplash") || "countertop",
      },
    },
  );

  if (error) {
    return { ok: false as const, error: "Failed to add counter piece" };
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
  revalidatePath(`/customers/${customerId}/quotes/${quoteId}/drawing`);
  return { ok: true as const, data: unwrapApiData(data) };
}

export async function updateCounterPieceAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  pieceId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces/{id}",
    {
      params: { path: { customerId, quoteId, areaId, id: pieceId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        name: toOptionalNullableString(formData.get("name")),
        lengthIn: Number(formData.get("lengthIn")),
        widthIn: Number(formData.get("widthIn")),
        quantity: Number(formData.get("quantity") || 1),
      },
    },
  );

  if (error) {
    throw new Error("Failed to update counter piece");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function deleteCounterPieceAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  pieceId: string,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;

  const { error } = await client.DELETE(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces/{id}",
    {
      params: { path: { customerId, quoteId, areaId, id: pieceId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to delete counter piece");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function createEdgeSegmentAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;
  const splashHeightIn = toOptionalNumber(formData.get("splashHeightIn"));

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        lengthIn: Number(formData.get("lengthIn")),
        treatment: formData.get("treatment") as EdgeTreatment,
        ...(splashHeightIn !== undefined ? { splashHeightIn } : {}),
      },
    },
  );

  if (error) {
    throw new Error("Failed to add edge segment");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function updateEdgeSegmentAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  edgeId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges/{id}",
    {
      params: { path: { customerId, quoteId, areaId, id: edgeId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        lengthIn: Number(formData.get("lengthIn")),
        treatment: formData.get("treatment") as EdgeTreatment,
        splashHeightIn: toOptionalNullableNumber(
          formData.get("splashHeightIn"),
        ),
      },
    },
  );

  if (error) {
    throw new Error("Failed to update edge segment");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function deleteEdgeSegmentAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  edgeId: string,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;

  const { error } = await client.DELETE(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges/{id}",
    {
      params: { path: { customerId, quoteId, areaId, id: edgeId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to delete edge segment");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function createSinkCutoutAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;
  const model = toOptionalString(formData.get("model"));

  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        quantity: Number(formData.get("quantity") || 1),
        ...(model ? { model } : {}),
        sinkType: formData.get("sinkType") as SinkType,
        shape: formData.get("shape") as SinkShape,
        cutoutLengthIn: Number(formData.get("cutoutLengthIn")),
        cutoutWidthIn: Number(formData.get("cutoutWidthIn")),
        faucetHoleCount: Number(formData.get("faucetHoleCount") || 0),
        centerline: formData.get("centerline") as SinkCenterline,
      },
    },
  );

  if (error) {
    throw new Error("Failed to add sink cutout");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function updateSinkCutoutAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  sinkId: string,
  formData: FormData,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;

  const { error } = await client.PATCH(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks/{id}",
    {
      params: { path: { customerId, quoteId, areaId, id: sinkId } },
      body: {
        sortOrder: Number(formData.get("sortOrder") || 0),
        quantity: Number(formData.get("quantity") || 1),
        model: toOptionalNullableString(formData.get("model")),
        sinkType: formData.get("sinkType") as SinkType,
        shape: formData.get("shape") as SinkShape,
        cutoutLengthIn: Number(formData.get("cutoutLengthIn")),
        cutoutWidthIn: Number(formData.get("cutoutWidthIn")),
        faucetHoleCount: Number(formData.get("faucetHoleCount") || 0),
        centerline: formData.get("centerline") as SinkCenterline,
      },
    },
  );

  if (error) {
    throw new Error("Failed to update sink cutout");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

type DrawingMutationClient = {
  POST: (
    path: string,
    options: { params: { path: Record<string, string> }; body: unknown },
  ) => Promise<{ error?: unknown }>;
};

export async function saveDrawingAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  layout: CanvasLayout,
  notes?: string | null,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as DrawingMutationClient;
  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing",
    {
      params: { path: { customerId, quoteId, areaId } },
      body: { layout, notes: notes ?? null },
    },
  );

  if (error) {
    return { ok: false as const, error: "Failed to save drawing" };
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
  revalidatePath(`/customers/${customerId}/quotes/${quoteId}/drawing`);
  return { ok: true as const, data: undefined };
}

export async function revertDrawingRevisionAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  revisionId: string,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as DrawingMutationClient;
  const { error } = await client.POST(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing/revisions/{revisionId}/revert",
    {
      params: { path: { customerId, quoteId, areaId, revisionId } },
      body: {},
    },
  );

  if (error) {
    return { ok: false as const, error: "Failed to revert drawing revision" };
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
  revalidatePath(`/customers/${customerId}/quotes/${quoteId}/drawing`);
  return { ok: true as const, data: undefined };
}

export async function deleteSinkCutoutAction(
  customerId: string,
  quoteId: string,
  areaId: string,
  sinkId: string,
) {
  const client =
    (await getApiClientWithAuth()) as unknown as MeasurementMutationClient;

  const { error } = await client.DELETE(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks/{id}",
    {
      params: { path: { customerId, quoteId, areaId, id: sinkId } },
      body: {},
    },
  );

  if (error) {
    throw new Error("Failed to delete sink cutout");
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}
