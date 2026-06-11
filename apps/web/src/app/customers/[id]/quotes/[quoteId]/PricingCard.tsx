import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiClientWithAuth } from "@/lib/api";
import type { PriceListItemGroup } from "@stoneboyz/domain";
import type { QuoteAreaWithMeasurementTotals } from "./MeasurementsCard";
import { PricingAccordion } from "./PricingAccordion";
import type {
  AccordionArea,
  AccordionGroup,
  AccordionItem,
  AreaSelection,
  GeneratedLine,
} from "./PricingAccordion";

type GeneratedPriceLine = GeneratedLine & { quoteAreaId: string };
type MaterialSlab = {
  id: string;
  stoneType: string;
  lengthIn: number;
  widthIn: number;
  status: "available" | "negotiating" | "reserved" | "cut" | "remnant";
  lotNumber?: string | null;
  bundleNumber?: string | null;
  warehouseLocation?: string | null;
};

type CatalogPriceList = {
  id: string;
  name: string;
  status: string;
  items?: CatalogPriceListItem[];
};

type CatalogPriceListItem = {
  id: string;
  itemGroup: PriceListItemGroup;
  name: string;
  chargeMethod: AccordionItem["chargeMethod"];
  measurementBasis: AccordionItem["measurementBasis"];
  priceCents: number;
  sortOrder: number;
  hideOnQuote: boolean;
};

type QuoteAreaSelectionRow = AreaSelection & { areaId: string };
type QuotePricingSelection = { areas: QuoteAreaSelectionRow[] };

type PricingReadClient = {
  GET: <T>(
    path: string,
    options?: {
      params?: {
        path?: Record<string, string>;
        query?: Record<string, unknown>;
      };
    },
  ) => Promise<{ data?: T; error?: unknown }>;
};

interface PricingCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
  isDraft: boolean;
}

const ACCORDION_GROUPS: AccordionGroup[] = [
  "material",
  "edge",
  "fabrication",
  "splash",
  "sink",
  "faucet_hole",
];

const emptySelection: AreaSelection = {
  materialItemId: null,
  materialSource: "external",
  materialSlabId: null,
  externalMaterialNote: null,
  edgeItemId: null,
  fabricationItemId: null,
  splashItemId: null,
  sinkItemId: null,
  faucetHoleItemId: null,
};

async function getAreaPricingLines(
  customerId: string,
  quoteId: string,
  areaId: string,
) {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const { data, error } = await client.GET<GeneratedPriceLine>(
    "/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pricing",
    { params: { path: { customerId, quoteId, areaId } } },
  );
  if (error) throw new Error("Failed to load generated pricing");
  return (data as { data?: GeneratedPriceLine[] } | undefined)?.data ?? [];
}

async function getPricingSelection(customerId: string, quoteId: string) {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const { data, error } = await client.GET<QuotePricingSelection>(
    "/customers/{customerId}/quotes/{quoteId}/pricing-selections",
    { params: { path: { customerId, quoteId } } },
  );
  if (error) throw new Error("Failed to load pricing selections");
  return data ?? { areas: [] };
}

async function getCatalogItems() {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const priceLists: CatalogPriceList[] = [];
  let cursor: string | null = null;
  do {
    const result: {
      data?: {
        data: CatalogPriceList[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };
      error?: unknown;
    } = await client.GET("/price-lists", {
      params: {
        query: cursor === null
          ? { limit: 100, includeArchived: false }
          : { limit: 100, includeArchived: false, cursor },
      },
    });
    if (result.error) throw new Error("Failed to load price lists");
    priceLists.push(...(result.data?.data ?? []));
    cursor = result.data?.nextCursor ?? null;
  } while (cursor !== null);

  const details = await Promise.all(
    priceLists.map(async (priceList) => {
      const result = await client.GET<CatalogPriceList>(
        "/price-lists/{priceListId}",
        {
          params: { path: { priceListId: priceList.id } },
        },
      );
      if (result.error) throw new Error("Failed to load price list items");
      return result.data;
    }),
  );
  return details
    .flatMap((priceList) => priceList?.items ?? [])
    .filter((item) => !item.hideOnQuote)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

async function getMaterialSlabs(selectedSlabIds: string[]) {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const [availableResult, remnantResult, selectedResults] = await Promise.all([
    client.GET<{ data: MaterialSlab[] }>("/inventory/slabs", {
      params: { query: { status: "available", limit: 100 } },
    }),
    client.GET<{ data: MaterialSlab[] }>("/inventory/slabs", {
      params: { query: { status: "remnant", limit: 100 } },
    }),
    Promise.all(
      selectedSlabIds.map((slabId) =>
        client
          .GET<MaterialSlab>("/inventory/slabs/{slabId}", {
            params: { path: { slabId } },
          })
          .then((result) => ({ slabId, result })),
      ),
    ),
  ]);

  if (availableResult.error || remnantResult.error) {
    throw new Error("Failed to load material slabs");
  }

  const slabsById = new Map<string, MaterialSlab>();
  for (const slab of [...(availableResult.data?.data ?? []), ...(remnantResult.data?.data ?? [])]) {
    slabsById.set(slab.id, slab);
  }
  const missingSlabIds: string[] = [];
  for (const { slabId, result } of selectedResults) {
    if (result.error || !result.data) {
      missingSlabIds.push(slabId);
      console.error("Failed to load selected material slab", { slabId, error: result.error });
    } else {
      slabsById.set(result.data.id, result.data);
    }
  }

  return {
    slabs: Array.from(slabsById.values()).sort(
      (a, b) => a.stoneType.localeCompare(b.stoneType) || a.id.localeCompare(b.id),
    ),
    missingSlabIds,
  };
}

export async function PricingCard({
  customerId,
  quoteId,
  areas,
  isDraft,
}: PricingCardProps) {
  const [catalogItems, selection, lineEntries] = await Promise.all([
    getCatalogItems(),
    getPricingSelection(customerId, quoteId),
    Promise.all(
      areas.map(
        async (area) =>
          [
            area.id,
            await getAreaPricingLines(customerId, quoteId, area.id),
          ] as const,
      ),
    ),
  ]);
  const materialSlabsResult = await getMaterialSlabs(
    Array.from(
      new Set(
        selection.areas
          .map((areaSelection) => areaSelection.materialSlabId)
          .filter((slabId): slabId is string => slabId !== null),
      ),
    ),
  );
  const materialSlabs = materialSlabsResult.slabs;

  const linesByArea = new Map(lineEntries);
  const selectionByArea = new Map(
    selection.areas.map((row) => [row.areaId, row]),
  );

  const itemsByGroup = Object.fromEntries(
    ACCORDION_GROUPS.map((group) => [
      group,
      catalogItems
        .filter((item) => item.itemGroup === group)
        .map<AccordionItem>((item) => ({
          id: item.id,
          name: item.name,
          priceCents: item.priceCents,
          chargeMethod: item.chargeMethod,
          measurementBasis: item.measurementBasis,
        })),
    ]),
  ) as Record<AccordionGroup, AccordionItem[]>;

  const accordionAreas: AccordionArea[] = areas.map((area) => {
    const row = selectionByArea.get(area.id);
    const selectionForArea: AreaSelection = row
      ? {
          materialItemId: row.materialItemId,
          materialSource: row.materialSource ?? "external",
          materialSlabId: row.materialSlabId ?? null,
          externalMaterialNote: row.externalMaterialNote ?? null,
          edgeItemId: row.edgeItemId,
          fabricationItemId: row.fabricationItemId,
          splashItemId: row.splashItemId,
          sinkItemId: row.sinkItemId,
          faucetHoleItemId: row.faucetHoleItemId,
        }
      : emptySelection;
    return {
      id: area.id,
      name: area.name,
      measurementTotals: area.measurementTotals,
      selection: selectionForArea,
      lines: linesByArea.get(area.id) ?? [],
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <PricingAccordion
          customerId={customerId}
          quoteId={quoteId}
          isDraft={isDraft}
          areas={accordionAreas}
          itemsByGroup={itemsByGroup}
          materialSlabs={materialSlabs}
          missingSlabIds={materialSlabsResult.missingSlabIds}
        />
      </CardContent>
    </Card>
  );
}
