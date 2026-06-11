---
name: countertop-measuring
description: Use this skill when working on countertop or stone fabrication software in the United States. It teaches how to measure, calculate, and represent countertops and countertop features such as radius corners, chamfer corners, asymmetrical shapes, bump-outs, notches, cutouts, and gross, net, and billable area using inches and square feet.
---

# Countertop Measuring Skill

Canonical copy: `.agents/skills/countertop-measuring/SKILL.md`. The Claude-facing copy should remain a thin pointer to this file.

## Purpose

This skill teaches how to measure countertop shapes and features the way a countertop or stone fabrication company would think about them when templating, laying out, pricing, and cutting countertop pieces.

The goal is to separate three different concerns:

1. Physical measurement
2. Geometry calculation
3. Shop pricing or billing rules

The software should always understand the true countertop geometry, even when a shop bills using simplified or rounded rules.

---

## Units

Use United States countertop measurement conventions.

- Linear dimensions are stored in **inches**.
- Area calculations are performed in **square inches**.
- Area may be reported or priced in **square feet**.

Conversion:

```text
square_feet = square_inches / 144
```

---

## Core Area Definitions

The system should keep these area values separate.

```text
gross_area = area before optional deductions
net_finished_area = exact finished stone area after shape removals and cutouts
billable_area = pricing area based on shop rules
```

### Gross Area

`gross_area` is the starting area used before optional deductions.

Depending on the shape, it may come from:

- rectangle area
- polygon area
- bounding-box area
- base shape plus bump-outs
- shop-specific estimating method

### Net Finished Area

`net_finished_area` is the exact physical countertop area after the final geometry is applied.

It should account for:

- added bump-outs
- removed notches
- radius corner removals
- chamfer corner removals
- sink cutouts
- cooktop cutouts
- other internal openings

### Billable Area

`billable_area` is the area used for pricing.

Billable area is not always the same as exact geometry.

A shop may choose to:

- charge gross area
- charge net area
- ignore small cutout deductions
- ignore radius/chamfer deductions
- round up to the nearest square foot
- use minimum square footage charges
- charge cutouts separately instead of subtracting their area

Default billing behavior should be conservative:

```text
subtract_radius_corners_from_billable_area = false
subtract_chamfers_from_billable_area = false
subtract_notches_from_billable_area = false
subtract_cutouts_from_billable_area = false
round_billable_area_up = false
```

---

## General Measuring Rules

1. Measure the finished top-view outline of the countertop.
2. Include overhangs in the finished dimensions.
3. Use inches for all field measurements.
4. Use square inches for internal calculations.
5. Convert to square feet only for reporting or pricing.
6. Use exact geometry for layout and fabrication.
7. Apply billing rules separately from geometry rules.
8. Represent irregular or asymmetrical pieces as polygons.
9. Model features such as radius corners, chamfers, bump-outs, notches, and cutouts as geometry attached to the main shape.
10. Do not hardcode example dimensions as rules.

---

# Basic Shape Measurement

## Rectangle

A rectangle is used when the countertop piece has a consistent length and depth.

### How to Measure Physically

Measure:

- overall finished length
- overall finished depth

Include overhangs.

### Formula

```text
area_square_inches = length_inches * depth_inches
area_square_feet = area_square_inches / 144
```

### Data Example

```json
{
  "shape_type": "rectangle",
  "unit": "inches",
  "length_inches": 96,
  "depth_inches": 25.5
}
```

---

## Triangle

A triangle may be used for angled sections or when decomposing an irregular shape.

### How to Measure Physically

Measure:

- base
- perpendicular height

### Formula

```text
area_square_inches = (base_inches * height_inches) / 2
area_square_feet = area_square_inches / 144
```

---

## Polygon

Use a polygon for asymmetrical countertops or any shape that cannot be represented as a simple rectangle.

### How to Measure Physically

1. Pick a reference origin, often the back-left corner.
2. Measure each finished corner point.
3. Record points in order around the countertop.
4. Use clockwise or counterclockwise order consistently.
5. Measure diagonals when needed to confirm that the shape is not skewed or mirrored.

### Formula

Use the shoelace formula.

```text
area_square_inches = abs(sum(x_i * y_next) - sum(y_i * x_next)) / 2
area_square_feet = area_square_inches / 144
```

### Validation Rules

```text
polygon must have at least 3 points
points must be ordered clockwise or counterclockwise
polygon must not self-intersect
area must be greater than zero
```

### Data Example

```json
{
  "shape_type": "polygon",
  "unit": "inches",
  "vertices": [
    {"x": 0, "y": 0},
    {"x": 96, "y": 0},
    {"x": 96, "y": 27},
    {"x": 64, "y": 30},
    {"x": 0, "y": 25.5}
  ]
}
```

---

# Countertop Features

## Radius Corner

A radius corner is a rounded corner that replaces a theoretical sharp corner.

Do not hardcode a specific radius. The radius is a variable field measurement.

### How to Measure Physically

1. Identify the theoretical sharp corner where the two straight edges would meet.
2. Measure back from that corner along the first edge by the radius distance.
3. Measure back from that corner along the adjacent edge by the same radius distance.
4. The arc begins at those two tangent points.
5. The radius is the distance from the theoretical corner to either tangent point along the straight edge.

### Required Inputs

```text
radius_inches
corner_location
inside_or_outside_corner
included_angle_degrees
```

For a normal outside countertop corner:

```text
included_angle_degrees = 90
arc_type = quarter_circle
```

### 90-Degree Outside Corner Formula

Area removed from the original square corner:

```text
area_removed_square_inches = radius_inches^2 - ((pi * radius_inches^2) / 4)
```

Arc length:

```text
arc_length_inches = (pi * radius_inches) / 2
```

### Rule

- Radius corners affect exact geometry and `net_finished_area`.
- Radius corners should not automatically reduce `billable_area`.
- Whether radius deductions reduce billable area must be controlled by shop settings.

### Data Example

```json
{
  "feature_type": "radius_corner",
  "location": "front_right",
  "radius_inches": 2.0,
  "corner_type": "outside",
  "included_angle_degrees": 90,
  "subtract_from_billable_area": false
}
```

---

## Chamfer Corner

A chamfer corner is a straight clipped corner that replaces a theoretical sharp corner.

### How to Measure Physically

1. Identify the theoretical sharp corner.
2. Measure back along one edge to the first chamfer point.
3. Measure back along the adjacent edge to the second chamfer point.
4. Connect the two points with a straight cut line.

### Required Inputs

```text
setback_a_inches
setback_b_inches
corner_location
inside_or_outside_corner
```

If both setbacks are equal, the chamfer is commonly a 45-degree chamfer on a 90-degree corner.

### Formulas

Chamfer length:

```text
chamfer_length_inches = sqrt(setback_a_inches^2 + setback_b_inches^2)
```

Area removed:

```text
area_removed_square_inches = (setback_a_inches * setback_b_inches) / 2
```

### Rule

- A chamfer removes triangular area from exact finished geometry.
- Chamfer deductions should not automatically reduce `billable_area`.
- Billing behavior must be controlled by shop settings.

### Data Example

```json
{
  "feature_type": "chamfer_corner",
  "location": "front_left",
  "setback_a_inches": 2.0,
  "setback_b_inches": 2.0,
  "subtract_from_billable_area": false
}
```

---

## Bump-Out

A bump-out is an outward projection from the normal countertop run.

Examples:

- sink bump-out
- seating bump-out
- appliance-area projection
- decorative front projection
- island or peninsula extension

### How to Measure Physically

1. Establish the normal baseline edge.
2. Measure the offset from a reference point to where the bump-out starts.
3. Measure the bump-out width along the baseline.
4. Measure the bump-out projection outward from the normal edge.
5. Record the corner treatment:
   - square
   - radius
   - chamfer
   - custom

### Required Inputs

```text
baseline_edge
start_offset_inches
width_inches
projection_inches
corner_treatment
```

### Formula for Simple Rectangular Bump-Out

```text
area_added_square_inches = width_inches * projection_inches
```

### Edge-Length Effect

For a rectangular bump-out in the middle of a straight edge:

```text
extra_finished_edge_inches = 2 * projection_inches
```

### Rule

- A bump-out adds area to the countertop shape.
- If the bump-out has radius or chamfered corners, apply the radius or chamfer rules to those corners.
- Bump-out area normally affects both `gross_area` and `net_finished_area`.
- Billing treatment depends on shop settings.

### Data Example

```json
{
  "feature_type": "bump_out",
  "baseline_edge": "front",
  "start_offset_inches": 36,
  "width_inches": 30,
  "projection_inches": 3,
  "corner_treatment": "square"
}
```

---

## Notch

A notch is a removed section from the outer countertop perimeter.

Examples:

- wall notch
- cabinet notch
- post notch
- pipe notch
- appliance clearance notch

### How to Measure Physically

1. Identify the edge where the notch occurs.
2. Measure the offset to the start of the notch.
3. Measure the notch width.
4. Measure the notch depth.
5. Record the notch corner treatment if not square.

### Required Inputs

```text
edge_location
start_offset_inches
width_inches
depth_inches
corner_treatment
```

### Formula for Rectangular Notch

```text
area_removed_square_inches = width_inches * depth_inches
```

### Rule

- A notch removes area from exact finished geometry.
- Whether it reduces `billable_area` depends on shop settings.

---

## Cutout

A cutout is an internal opening inside the countertop.

Examples:

- sink cutout
- cooktop cutout
- faucet hole
- outlet opening
- trash chute
- custom appliance opening

### How to Measure Physically

1. Choose reference edges, usually back and left edges.
2. Measure the cutout position from those reference edges.
3. Measure cutout width and height for rectangular cutouts.
4. Measure diameter or radius for circular cutouts.
5. Record corner radius if the cutout has rounded corners.
6. Record whether the cutout is:
   - rectangular
   - circular
   - oval
   - rounded rectangle
   - custom polygon

### Formulas

Rectangular cutout:

```text
area_removed_square_inches = width_inches * height_inches
```

Circular cutout:

```text
area_removed_square_inches = pi * radius_inches^2
```

Rounded rectangle cutout:

```text
area_removed_square_inches =
  width_inches * height_inches
  - 4 * (corner_radius_inches^2 - (pi * corner_radius_inches^2 / 4))
```

Custom polygon cutout:

```text
area_removed_square_inches = polygon_area_square_inches
```

### Rule

- Cutouts remove area from `net_finished_area`.
- Cutouts should not automatically reduce `billable_area`.
- Many shops charge cutouts separately rather than deducting their area from material square footage.
- Billing treatment must be configurable.

### Data Example

```json
{
  "feature_type": "cutout",
  "cutout_type": "sink",
  "shape": "rounded_rectangle",
  "x_inches": 30,
  "y_inches": 6,
  "width_inches": 28,
  "height_inches": 16,
  "corner_radius_inches": 2,
  "subtract_from_billable_area": false
}
```

---

## Asymmetrical Countertop

An asymmetrical countertop is any countertop that is not a simple rectangle, square, or standard regular shape.

Examples:

- different depths on left and right
- non-parallel front and back edges
- angled sides
- irregular island shape
- uneven wall conditions
- multiple projections or cutbacks
- curved or segmented front edge

### How to Measure Physically

1. Measure the finished perimeter.
2. Record each corner point in sequence.
3. Use diagonals where needed to confirm geometry.
4. Represent the main outline as a polygon.
5. Attach features such as radius corners, chamfers, bump-outs, notches, and cutouts.

### Rule

- Use polygon geometry as the main source of truth.
- Do not force asymmetrical shapes into simple rectangle logic unless the shop intentionally bills by bounding boxes.
- Exact area and billable area should remain separate.

---

# Calculation Order

Use this order when calculating a countertop piece:

1. Build the base shape.
2. Calculate base area.
3. Add area-increasing features such as bump-outs.
4. Subtract area-reducing perimeter features such as notches, chamfers, and radius-corner removals.
5. Subtract internal cutouts to calculate `net_finished_area`.
6. Apply shop pricing settings to calculate `billable_area`.
7. Convert square inches to square feet for reporting.

---

# Recommended Data Model

## Countertop Piece

```json
{
  "piece_id": "string",
  "unit": "inches",
  "shape_type": "rectangle | polygon",
  "vertices": [],
  "features": [],
  "gross_area_square_inches": 0,
  "net_finished_area_square_inches": 0,
  "billable_area_square_inches": 0,
  "gross_area_square_feet": 0,
  "net_finished_area_square_feet": 0,
  "billable_area_square_feet": 0
}
```

## Feature

```json
{
  "feature_type": "radius_corner | chamfer_corner | bump_out | notch | cutout",
  "location": "string",
  "dimensions": {},
  "area_adjustment_square_inches": 0,
  "edge_adjustment_inches": 0,
  "subtract_from_billable_area": false
}
```

## Shop Settings

```json
{
  "linear_unit": "inches",
  "area_unit": "square_feet",
  "subtract_radius_corners_from_billable_area": false,
  "subtract_chamfers_from_billable_area": false,
  "subtract_notches_from_billable_area": false,
  "subtract_cutouts_from_billable_area": false,
  "round_billable_area_up": false,
  "billable_area_rounding_increment_square_feet": null,
  "minimum_billable_area_square_feet": null
}
```

---

# Summary Formulas

## Square Feet

```text
square_feet = square_inches / 144
```

## Rectangle

```text
area = length * depth
```

## Triangle

```text
area = base * height / 2
```

## Polygon

```text
area = abs(sum(x_i * y_next) - sum(y_i * x_next)) / 2
```

## 90-Degree Radius Corner Removed Area

```text
area_removed = radius^2 - ((pi * radius^2) / 4)
```

## 90-Degree Radius Corner Arc Length

```text
arc_length = (pi * radius) / 2
```

## Chamfer Removed Area

```text
area_removed = setback_a * setback_b / 2
```

## Chamfer Length

```text
chamfer_length = sqrt(setback_a^2 + setback_b^2)
```

## Rectangular Bump-Out Added Area

```text
area_added = width * projection
```

## Rectangular Notch Removed Area

```text
area_removed = width * depth
```

## Rectangular Cutout Removed Area

```text
area_removed = width * height
```

## Circular Cutout Removed Area

```text
area_removed = pi * radius^2
```

---

# Important Defaults

Use these defaults unless the shop defines different rules.

```text
1. Store all geometry in inches.
2. Calculate area in square inches.
3. Convert area to square feet only for output or pricing.
4. Keep gross_area, net_finished_area, and billable_area separate.
5. Do not automatically subtract radius corners, chamfers, notches, or cutouts from billable area.
6. Use polygons for irregular or asymmetrical countertops.
7. Treat example numbers as examples only, never as fixed rules.
8. Use exact geometry for fabrication logic.
9. Use shop settings for pricing logic.
```

---

# Implementation Guidance

When writing code for countertop measurement:

1. Never mix geometry logic and pricing logic in the same calculation without naming the result.
2. Prefer explicit names:
   - `grossAreaSqIn`
   - `netFinishedAreaSqIn`
   - `billableAreaSqIn`
   - `grossAreaSqFt`
   - `netFinishedAreaSqFt`
   - `billableAreaSqFt`
3. Keep all internal dimensions in inches.
4. Convert to square feet only at the API, UI, report, or invoice layer.
5. Do not assume that a cutout deduction reduces the customer's bill.
6. Do not assume that a radius or chamfer deduction reduces the customer's bill.
7. Make billing behavior configurable by shop.
8. Use exact geometry for drawing, templating, cutting, CNC export, and validation.
