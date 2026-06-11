import { z } from "zod";
import { pointInOutline } from "./lines.js";
import type { OutlineV2 } from "./types.js";
import { validateOutline } from "./validate.js";

const ptSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const rotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const cornerSchema = z
  .object({
    type: z.enum(["radius", "chamfer"]),
    valueIn: z.number().positive(),
    direction: z.enum(["out", "in"]),
  })
  .refine((c) => !(c.type === "chamfer" && c.direction === "in"), {
    message: "inward direction applies to radius corners only",
  });

const vertexSchema = z.object({
  vertexId: z.string().min(1),
  xIn: z.number().finite(),
  yIn: z.number().finite(),
  corner: cornerSchema.optional(),
  bulge: z.number().finite().optional(),
});

const outlineSchema = z
  .object({ vertices: z.array(vertexSchema).min(3) })
  .transform((outline, ctx): OutlineV2 => {
    const r = validateOutline(outline as unknown as OutlineV2);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.outline;
  });

const cutoutSchema = z.discriminatedUnion("shape", [
  z.object({ id: z.string().min(1), shape: z.literal("circle"), centerIn: ptSchema, diameterIn: z.number().positive() }),
  z.object({
    id: z.string().min(1),
    shape: z.literal("rect"),
    centerIn: ptSchema,
    wIn: z.number().positive(),
    hIn: z.number().positive(),
    rotationDeg: z.number(),
  }),
]);

const pieceSchema = z.object({
  pieceId: z.string().uuid(),
  kind: z.enum(["countertop", "backsplash"]),
  label: z.string().min(1),
  positionIn: ptSchema,
  rotationDeg: rotationSchema,
  outline: outlineSchema,
  edges: z.array(
    z.object({
      startVertexId: z.string().min(1),
      paintColor: hexColor.optional(),
      splash: z.object({ heightIn: z.number().positive(), offsetIn: z.number().min(0) }).optional(),
    }),
  ),
  cutouts: z.array(cutoutSchema),
});

const sinkSchema = z.object({
  sinkId: z.string().uuid(),
  pieceId: z.string().uuid(),
  type: z.enum(["sink", "cooktop"]),
  centerIn: ptSchema,
  rotationDeg: rotationSchema,
  showCenterline: z.enum(["left", "right"]),
  faucetHoles: z.array(z.object({ id: z.string().min(1), dxIn: z.number(), diameterIn: z.number().positive() })),
});

const annotationSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.enum(["wall", "cabinet"]), pieceId: z.string().uuid(), fromIn: ptSchema, toIn: ptSchema, dash: z.literal(true) }),
  z.object({ id: z.string().min(1), type: z.literal("segment"), pieceId: z.string().uuid(), fromIn: ptSchema, toIn: ptSchema }),
  z.object({ id: z.string().min(1), type: z.literal("centerline"), pieceId: z.string().uuid(), fromIn: ptSchema, toIn: ptSchema }),
  z.object({ id: z.string().min(1), type: z.literal("seam"), pieceId: z.string().uuid(), fromIn: ptSchema, toIn: ptSchema }),
  z.object({
    id: z.string().min(1),
    type: z.literal("label"),
    pieceId: z.string().uuid().optional(),
    atIn: ptSchema,
    text: z.string().min(1),
    color: hexColor,
    preset: z.enum(["cooktop", "dishwasher", "range", "custom"]).optional(),
  }),
]);

export const layoutV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    pieces: z.array(pieceSchema),
    sinks: z.array(sinkSchema),
    annotations: z.array(annotationSchema),
    legend: z.array(z.object({ color: hexColor, label: z.string().min(1), countsAsEdge: z.boolean().optional() })),
  })
  .superRefine((layout, ctx) => {
    const pieceById = new Map(layout.pieces.map((p) => [p.pieceId, p]));
    for (const sink of layout.sinks) {
      const piece = pieceById.get(sink.pieceId);
      if (!piece) {
        ctx.addIssue({ code: "custom", message: `sink ${sink.sinkId} references unknown piece` });
        continue;
      }
      if (!pointInOutline(piece.outline, sink.centerIn)) {
        ctx.addIssue({ code: "custom", message: `sink ${sink.sinkId} center is outside its piece` });
      }
    }
  });

export type LayoutV2Parsed = z.infer<typeof layoutV2Schema>;
