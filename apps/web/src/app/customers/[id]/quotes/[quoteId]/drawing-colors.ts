export const DRAWING_MARKUP_COLORS = [
  { id: "wall", name: "Wall", color: "#dc2626" },
  { id: "edge", name: "Edge", color: "#2563eb" },
  { id: "stove", name: "Stove", color: "#f1ee00" },
  { id: "fridge", name: "Fridge", color: "#ec0eec" },
  { id: "window", name: "Window", color: "#52ee09" },
  { id: "default", name: "Default", color: "#2b2b2c" },
] as const;

export const DEFAULT_DRAWING_MARKUP_COLOR =
  DRAWING_MARKUP_COLORS[0]?.color ?? "#2b2b2c";
