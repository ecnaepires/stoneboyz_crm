# Drawing CAD Rules

The drawing workspace should behave like a lightweight CAD tool. Treat visible lines as selectable construction entities, not as a one-shot rectangle wizard.

- Offset creates a new solid wall/granite edge and turns only the source edge into a dashed gray cabinet reference.
- Existing solid wall/granite edges stay solid after later operations.
- Fillet connects only the two selected edges for that interaction.
- Fillet should not infer or complete the rest of the box.
- Parallel selected edges create only the strip between those two edges.
- Perpendicular selected edges create only the local corner patch between the nearest endpoints.
- Uneven offsets are valid. A 10 inch offset on one side and a 20 inch offset on another side should connect according to the clicked geometry, not a fixed square rule.
- Reference lines remain available after fillet so the user can continue building the shape side by side.
