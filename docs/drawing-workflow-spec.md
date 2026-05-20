# Drawing Workflow Spec

This drawing workflow follows the LT-2D3D-style tablet replacement model: users draw and edit countertop geometry manually, with cabinet and wall references preserved as visible context.

## Tool Rules

### Offset

- User clicks one real line.
- User clicks the side where the new counter edge should appear.
- The old line remains as a dashed reference line.
- The new geometry is only the overhang strip between the old line and the new line.
- Offset must work even when the direction click lands inside the piece.
- Offset must not silently resize or move the original line.

### Connect

- User clicks the first edge.
- User clicks the second edge.
- The system connects from the first clicked edge to the second clicked edge.
- Connect output must stay orthogonal: horizontal and vertical lines only.
- For rectangle-close cases, the result becomes one rectangular chain segment.
- Deleted/reference lines for that connected piece can be cleared when the connection replaces them.

### Delete Line

- User clicks any visible counter edge or reference line.
- Counter edge deletion leaves the piece visually open.
- Reference line deletion removes that dashed line.
- Deleted counter lines persist in layout so save/refresh does not bring them back.

## Measurement Rules

- Show dimensions where they explain visible geometry.
- Do not show duplicate interior dimensions when top/bottom or left/right already show matching size.
- Rectangular results should show actual outside edge dimensions only.
- Notch/L-shaped results can show one interior depth/span if that span is otherwise unclear.

## Line Styles

- Counter edge: solid green.
- Selected/hovered active edge: orange.
- Cabinet/reference line: dashed gray.
- Future wall/reference variants should reuse persisted `referenceLines.kind` and `referenceLines.color`.

## Harness Rules

Geometry behavior must be covered in pure tests before UI wiring changes:

- Offset strip creation.
- Reference line preservation.
- Inward-side offset clicks.
- Deleted-line matching regardless of direction.
- Two-edge rectangle connect.
