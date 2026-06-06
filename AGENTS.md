# Project Guidance for Countertop Measuring

Use the `countertop-measuring` skill when implementing or modifying countertop, stone fabrication, quoting, measurement, layout, or geometry logic.

Core project rules:

- Use inches for all linear countertop measurements.
- Use square inches for internal area calculations.
- Convert to square feet for reporting and pricing.
- Keep `gross_area`, `net_finished_area`, and `billable_area` separate.
- Do not automatically subtract radius corners, chamfers, notches, or cutouts from billable area unless shop settings enable that behavior.
- Treat example dimensions as examples only, not hardcoded rules.
- Use exact geometry for drawing, layout, cutting, and validation.
- Use configurable shop rules for billing and pricing behavior.
