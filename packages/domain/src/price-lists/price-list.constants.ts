export const PRICE_LIST_STATUS_VALUES = ['draft', 'active', 'archived'] as const;

export const PRICE_LIST_ITEM_GROUP_VALUES = ['material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash', 'admin'] as const;

export const PRICE_LIST_CHARGE_METHOD_VALUES = ['square_foot', 'linear_foot', 'each'] as const;

export const PRICE_LIST_MEASUREMENT_BASIS_VALUES = [
  'countertop_sqft',
  'backsplash_sqft',
  'combined_sqft',
  'finished_edge_linft',
  'splash_sqft',
  'sink_count',
  'faucet_hole_count',
  'each',
] as const;
