# Universal Line Rules Design

## Context

The drawing workspace needs precise line tools for countertop development. Segment lines, centerlines, future seams, and copied edge references should not each invent their own behavior. They should share one rule set for placement, offset, and extension.

## Terms

Construction Line is the shared parent concept for straight, piece-attached drawing references. Segment Line and Centerline are kinds of Construction Line. Seam is future scope; it may reuse the same geometry rules, but it is not modeled in this slice.

## Rules

Construction Lines are stored relative to the countertop piece, not the screen. If the piece moves, rotates, or the canvas zooms, the line stays attached to the piece.

Directions are squared to the countertop piece. The 8-way direction picker means piece-local directions: along the piece top, back, front, left, right, or the 45-degree diagonals between those directions.

Segment placement is not freehand. The user clicks Segment, enters a length, chooses an arrow direction, then clicks a start point on the countertop piece. The app creates an exact Segment Line from those inputs.

Offset is shared. Segment Lines can be offset using the same behavior as Centerlines: exact distance plus side/direction, while keeping the result attached to the same piece.

Extend is universal. The user picks the target first, then the source. The source may be a Segment Line, Centerline, future Seam, reference line, or countertop edge. Extend preserves the source direction and lengthens it until it intersects the selected target.

Extend does not reshape countertops. If the source is an actual countertop edge, the operation creates or extends a Construction Line from that edge instead of changing material geometry or measurements.

## UX

Segment opens a compact popup with a length input and an 8-way arrow picker. After the user sets length and direction, the next click on a countertop piece places the line.

Extend has a two-step state: target selected, then source selected. The UI should visibly indicate the selected target before asking for the source.

If no valid intersection exists, the app should leave the drawing unchanged and explain that the selected source cannot reach the selected target while preserving its direction.

## Implementation Shape

Create one geometry helper for Construction Lines:

1. Convert a screen click into a piece-local anchor.
2. Resolve a piece-local direction vector from the chosen arrow.
3. Build a line from anchor, direction, and length.
4. Offset a line by distance and side.
5. Extend a source line to a target line by intersection.

Segment, Centerline, and Extend tools should call this helper rather than duplicating math in component handlers.

## Out Of Scope

Seam editing, physical slab cutting behavior, and countertop shape mutation are out of scope. They should reuse Construction Line rules later, but this slice only defines and builds shared line placement and extension behavior.

## Verification

Unit tests should cover piece-local direction, segment length, offset, target-first extension, no-intersection failure, and the countertop-edge source rule. UI tests should cover the Segment popup flow and the Extend target-then-source flow.
