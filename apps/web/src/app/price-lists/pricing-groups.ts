export type PriceListItemGroup = 'material' | 'fabrication' | 'edge' | 'sink' | 'faucet_hole' | 'splash' | 'admin';
export type ChargeMethod = 'square_foot' | 'linear_foot' | 'each';
export type MeasurementBasis =
  | 'countertop_sqft'
  | 'backsplash_sqft'
  | 'combined_sqft'
  | 'finished_edge_linft'
  | 'splash_sqft'
  | 'sink_count'
  | 'faucet_hole_count'
  | 'each';

export type GroupConfig = {
  value: PriceListItemGroup;
  segment: string;
  label: string;
  category: string;
  chargeMethod: ChargeMethod;
  measurementBasis: MeasurementBasis;
  rateLabel: string;
  ratePlaceholder: string;
  ruleLabel: string;
  advanced?: boolean;
};

export const GROUPS: GroupConfig[] = [
  {
    value: 'material',
    segment: 'materials',
    label: 'Materials',
    category: 'material',
    chargeMethod: 'square_foot',
    measurementBasis: 'combined_sqft',
    rateLabel: '$/sq ft',
    ratePlaceholder: 'Rate per sq ft',
    ruleLabel: 'Countertops + backsplash sq ft'
  },
  {
    value: 'fabrication',
    segment: 'fabrication',
    label: 'Fabrication',
    category: 'fabrication',
    chargeMethod: 'square_foot',
    measurementBasis: 'combined_sqft',
    rateLabel: '$/sq ft',
    ratePlaceholder: 'Rate per sq ft',
    ruleLabel: 'Countertops + backsplash sq ft'
  },
  {
    value: 'edge',
    segment: 'edges',
    label: 'Edges',
    category: 'finished_edge',
    chargeMethod: 'linear_foot',
    measurementBasis: 'finished_edge_linft',
    rateLabel: '$/lin ft',
    ratePlaceholder: 'Rate per lin ft',
    ruleLabel: 'Finished edge linear feet'
  },
  {
    value: 'sink',
    segment: 'sinks',
    label: 'Sinks',
    category: 'sink_item',
    chargeMethod: 'each',
    measurementBasis: 'sink_count',
    rateLabel: '$/each',
    ratePlaceholder: 'Rate each',
    ruleLabel: 'Sink count'
  },
  {
    value: 'faucet_hole',
    segment: 'faucet-holes',
    label: 'Faucet Holes',
    category: 'faucet_hole',
    chargeMethod: 'each',
    measurementBasis: 'faucet_hole_count',
    rateLabel: '$/each',
    ratePlaceholder: 'Rate each',
    ruleLabel: 'Faucet-hole count'
  },
  {
    value: 'splash',
    segment: 'splash',
    label: 'Splash',
    category: 'splash',
    chargeMethod: 'square_foot',
    measurementBasis: 'splash_sqft',
    rateLabel: '$/sq ft',
    ratePlaceholder: 'Rate per sq ft',
    ruleLabel: 'Special splash sq ft'
  },
  {
    value: 'admin',
    segment: 'admin-items',
    label: 'Admin Items',
    category: 'admin_item',
    chargeMethod: 'each',
    measurementBasis: 'each',
    rateLabel: 'Rate',
    ratePlaceholder: 'Rate',
    ruleLabel: 'Advanced charge setup',
    advanced: true
  },
];

export const CHARGE_METHODS: Array<{ value: ChargeMethod; label: string }> = [
  { value: 'square_foot', label: 'Square foot' },
  { value: 'linear_foot', label: 'Linear foot' },
  { value: 'each', label: 'Each / unit' },
];

export const MEASUREMENT_BASES: Array<{ value: MeasurementBasis; label: string }> = [
  { value: 'combined_sqft', label: 'Countertops + backsplash sq ft' },
  { value: 'countertop_sqft', label: 'Countertop sq ft' },
  { value: 'backsplash_sqft', label: 'Backsplash sq ft' },
  { value: 'finished_edge_linft', label: 'Finished-edge LF' },
  { value: 'splash_sqft', label: 'Splash sq ft' },
  { value: 'sink_count', label: 'Sink count' },
  { value: 'faucet_hole_count', label: 'Faucet-hole count' },
  { value: 'each', label: 'Each' },
];

export const groupHref = (priceListId: string, groupValue: PriceListItemGroup): string => {
  const group = GROUPS.find((candidate) => candidate.value === groupValue);
  return `/price-lists/${priceListId}/${group?.segment ?? groupValue}`;
};

export const getGroupBySegment = (segment: string): GroupConfig | null =>
  GROUPS.find((group) => group.segment === segment) ?? null;
