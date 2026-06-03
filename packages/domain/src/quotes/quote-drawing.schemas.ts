import { z } from "zod";

const canvasPieceShapeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("l"),
    legX: z.number(),
    legY: z.number(),
    legWidthIn: z.number().positive(),
    legLengthIn: z.number().positive(),
  }),
  z.object({
    type: z.literal("z"),
    legX: z.number(),
    legY: z.number(),
    legWidthIn: z.number().positive(),
    legLengthIn: z.number().positive(),
    tailX: z.number(),
    tailY: z.number(),
    tailLengthIn: z.number().positive(),
    tailWidthIn: z.number().positive(),
  }),
  z.object({
    type: z.literal("chain"),
    segments: z
      .array(
        z.object({
          x: z.number(),
          y: z.number(),
          w: z.number().positive(),
          h: z.number().positive(),
          lengthIn: z.number().positive(),
          widthIn: z.number().positive(),
          orientation: z.enum(["horizontal", "vertical"]),
        }),
      )
      .min(2),
  }),
]);

const canvasPieceLayoutSchema = z.object({
  pieceId: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  kind: z.enum(["countertop", "backsplash"]).default("countertop"),
  groupId: z.string().uuid().nullable().optional(),
  shape: canvasPieceShapeSchema.nullable().optional(),
});

const canvasSinkLayoutSchema = z.object({
  sinkId: z.string().uuid(),
  pieceId: z.string().uuid().nullable().default(null),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  quantity: z.number().int().positive().default(1),
  faucetHoleCount: z.number().int().min(0).default(0),
});

const canvasCornerLayoutSchema = z.object({
  pieceId: z.string().uuid(),
  corner: z.enum(["topLeft", "topRight", "bottomRight", "bottomLeft"]),
  treatment: z.enum(["none", "radius", "clip", "bumpOut", "notch"]),
  valueIn: z.number().positive().nullable().default(null),
});

const canvasEdgeLayoutSchema = z.object({
  pieceId: z.string().uuid(),
  edge: z.enum(["top", "right", "bottom", "left"]),
  treatment: z.enum([
    "finished",
    "appliance",
    "mitered",
    "waterfall",
    "splash",
    "unfinished",
    "additionalFinished",
  ]),
  splashHeightIn: z.number().positive().nullable().default(null),
  label: z.string().trim().max(8).nullable().default(null),
  color: z.string().trim().max(32).optional(),
});

const canvasPaintedEdgeLayoutSchema = z.object({
  id: z.string(),
  pieceId: z.string().uuid(),
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  color: z.string().trim().max(32),
});

const canvasReferenceLineLayoutSchema = z.object({
  id: z.string(),
  pieceId: z.string().uuid(),
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  kind: z.enum(["cabinet", "wall", "centerline", "dimension"]).default("cabinet"),
  color: z.string().trim().max(32).default("#6b7280"),
  dash: z.boolean().optional(),
});

const canvasDeletedLineLayoutSchema = z.object({
  id: z.string(),
  pieceId: z.string().uuid(),
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
});

export const canvasLayoutSchema = z.object({
  pieces: z.array(canvasPieceLayoutSchema).default([]),
  sinks: z.array(canvasSinkLayoutSchema).default([]),
  corners: z.array(canvasCornerLayoutSchema).default([]),
  edges: z.array(canvasEdgeLayoutSchema).default([]),
  paintedEdges: z.array(canvasPaintedEdgeLayoutSchema).default([]),
  referenceLines: z.array(canvasReferenceLineLayoutSchema).default([]),
  deletedLines: z.array(canvasDeletedLineLayoutSchema).default([]),
});

export const saveDrawingRevisionSchema = z.object({
  layout: canvasLayoutSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});
