# Fillet Mode Workflow Design

## Goal

The drawing workspace Fillet tool lets the Templater choose a corner treatment first, then click two valid same-piece edges, and immediately apply the selected corner treatment.

## User Flow

1. User clicks `Fillet`.
2. User chooses `Radius`, `Chamfer`, or `Sharp`.
3. `Radius` and `Chamfer` require a positive inch value. `Sharp` does not.
4. User clicks edge one.
5. User clicks edge two on the same piece.
6. If the two edges form a valid corner, the corner updates.

## Behavior

`Sharp` keeps the current miter-offset behavior: it square-joins the two matching wall offset reference lines and removes any saved corner treatment at that corner.

`Radius` uses the existing `radius` corner treatment. When two matching wall offset reference lines form a corner, the workspace saves the corner treatment and the existing reference-line visual builder trims the line ends and draws the radius arc.

`Chamfer` maps to the existing `clip` corner treatment. When two matching wall offset reference lines form a corner, the visual builder trims the line ends and draws a straight diagonal chamfer connector.

Only same-piece edge pairs are valid. Cross-piece pairs are rejected by the existing same-piece `chainEdgeAction` flow.

## Scope

This build keeps presets simple: the UI includes common inch buttons and a typed number input. Persisting company-wide starred presets is a later slice because no saved preset storage exists in the drawing workspace yet.

