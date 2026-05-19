# Moraware CounterGo Live Audit — 2026-05-18

Source: `https://stoneboyz.moraware.net/go/editquote/1570` (TEST CRM PIPELINE JOB - DO NOT USE)

This document records exact Moraware behavior for each step, confirmed by live browser interaction via Claude in Chrome. Use it as the ground truth spec for implementing Phases 2–6.

---

## Toolbar (all steps)

```
QUOTE: {title}  |  [Help] [Undo] [Redo] [Revisions] [Save] [Exit]
```

- `btnCGSave` is the save button div id.
- `redo` div id has `data-mjtdisabled="1"` when no redo available.

### Save Modal

- Title: **Save Quote**
- Field: `Notes about this revision:` (textarea, empty by default)
- Buttons: `Save & Continue`, `Save`
- Behavior: clicking Save button (even without dirty state) opens this modal.

### Revisions Modal

- Title: **Revert to Quote Revision**
- Columns: action / Revision / Created / Created By / Notes
- Action button label: `Revert to Revision`
- Sample row: Revision 1, 5/17/2026 9:42:29 AM, Romulo, (empty notes)

### Exit Modal

- Title: **Unsaved Changes**
- Message: `You have unsaved changes that will be lost if you continue.`
- Primary button: `Discard Changes & Continue`
- Back/cancel: arrow icon in header (no text label)

---

## Right Rail — Keyboard Mnemonics (all steps)

| Mnemonic | Label | Button ID |
|---|---|---|
| N | Text | btnSmallAddText |
| Y | Page Break | btnPageBreak |
| E | Other Counter | btnAddOtherCounter |
| Z | Round To Nearest 1/16" | btnRounding |
| J | Zoom In | btnSmallZoomIn |
| K | Zoom Out | btnSmallZoomOut |
| L | Reset Zoom | btnSmallResetZoom |
| M | Pan | btnSmallPanButton |

Step 5 additional:

| Mnemonic | Label | Button ID |
|---|---|---|
| I | Add color option | btnAddColorOptions |
| F | Re-order color options | btnReorderColorOptions |
| H | Add area | btnAddArea |
| G | Re-order areas | btnReorderAreas |

---

## Step 1 — Counter Dimensions

### Edge Length Modal

Trigger: left-click on a dimension label drawn on the canvas (e.g., the "75"" text above the counter edge).

- Title: **Edge Length**
- Field: `Length:` — pre-filled with the current edge value, followed by `"` unit suffix
- Preview: small counter diagram with the active edge highlighted in orange/red
- Buttons: `Save & Next Edge`, `Save`

### Piece Context Menu

Trigger: right-click on the counter piece body.

Menu items:
1. Rotate Counter Left
2. Rotate Counter Right
3. Duplicate Counter
4. Delete Counter

---

## Step 2 — Curves & Bumpouts

### Canvas markers

Each editable corner shows a `-Std-` label on the canvas. Clicking the label opens the corner treatment menu.

### Corner Treatment Menu

Trigger: left-click on a `-Std-` corner marker.

Menu items (in order):
1. Radius...
2. Clip...
3. Bump Out...
4. Notch...
5. None ✓ (checkmark = currently active)

### Radius Modal

Trigger: click `Radius...` in corner menu.

- Title: **Edit Corner - Radius**
- Field: `Radius:` — default value `4`, unit `"`
- Preview: small counter diagram with the active corner highlighted in orange
- Button: `Save` (single button, no "Save & Next")

_(Clip, Bump Out, Notch modals follow the same pattern with their respective fields — not yet captured but expected to match.)_

---

## Step 3 — Splash & Edge

### Canvas markers

Each edge segment shows an `F` label (Finished Edge) when in Step 3. Clicking the label opens the edge treatment menu.

### Edge Treatment Menu

Trigger: left-click on an `F` edge marker.

Menu items (in order):
1. 4" Splash  ← **4" is first, not 3"** (spec correction)
2. 3" Splash
3. 5" Splash
4. Other Splash...
5. Mitered Edge
6. Waterfall
7. Finished Edge (Eased) ✓  ← checkmark when active; name includes the edge profile in parens
8. Appliance Edge
9. Unfinished Edge
10. Additional Finished Edge...

**Spec correction:** `moraware-countergo-editor-implementation-plan.md` lists `3" Splash` first. Actual Moraware order starts with `4" Splash`.

**Label format:** The finished edge item shows the profile name in parentheses: `Finished Edge (Eased)`, `Finished Edge (Bullnose)`, etc.

---

## Step 4 — Sink & Cooktop

### Canvas object

The sink appears as a draggable rectangle on the canvas with faucet-hole dots (`ooo`) and a centerline indicator.

### Sink Context Menu

Trigger: left-click on the sink object.

Menu items:
1. Properties...
2. Rotate Sink Left...
3. Rotate Sink Right...
4. Duplicate Sink
5. Delete Sink

### Edit Sink Properties Modal

Trigger: click `Properties...` in sink context menu.

- Title: **Edit Sink Properties**
- Fields:
  - `Sink Type:` dropdown — Undermount, Topmount, etc.
  - `Shape:` dropdown — Rectangle, etc.
  - `Cutout Dimensions (Length x Width):` two number fields with `"` unit, e.g. `23 x 14`
  - `Faucet Hole Count:` dropdown — 0, 1, 2, 3, etc.
  - `Show Centerline:` dropdown — None, etc.
- Button: `Save`

**Spec correction:** Phase 4 spec lists "model" as a field. There is **no Model field** in this modal. The type info is captured in `Sink Type` (Undermount/Topmount) and `Shape` dropdowns.

### Right Rail in Step 4

No sink-specific add buttons. Same right rail as Steps 1–3 (Text, Page Break, Other Counter, Round, Zoom In/Out, Reset Zoom, Pan).

---

## Step 5 — Color & Edge

### Layout

- Left panel: area color swatch thumbnail for each area
- Main panel: area accordion cards, one per area
  - Header: `Area #N Color & Edge` (expandable)
  - Fields: Product (dropdown), Color — "Priced by the sq ft" (dropdown), Edge (dropdown)
  - Small edge profile preview box
  - `+ Edge` button for additional finished-edge groups
  - `Area #N Slabs & Layout` section (collapsible)
- Right rail: Add color option (I), Re-order color options (F), Add area (H), Re-order areas (G)

---

## Step 6 — Price Details

### Price Settings Header

```
Price Settings [edit icon]
Price List: Contractor (Rev. 23)   Tax: -None-   Discount: -None-   Expires: 6/16/2026
```

### Area Price Section

Area header: `Area #1` with edit icon and `+` add-item button.

**Generated line format:**
```
{quantity} {unit}  {name} @ [no price available]
No Price found for {description}.          ← red italic below the line
```

**Alternating row classes:** `lineItemEvenRow`, `lineItemOddRow`

**Sample lines from this quote:**

| Line | Diagnostic |
|---|---|
| `26.6 sq ft QUARTZ Golden Escape @ [no price available]` | `No Price found for the material.` |
| `2.1 sq ft - 4" Splash @ [no price available]` | `No (Material) Price found for a 4" Splash.` |
| `28.7 sq ft Fabrication @ [no price available]` | `No Price found for Fabrication.` |
| `27.3 lin ft Finished Edge - Eased @ [no price available]` | `No Price found for the "Eased" finished edge.` |
| `1 - 23" Undermount Sink Cutout @ [no price available]` | `No Price found for a - 23" Undermount Sink Cutout.` |
| `3 Faucet Holes @ [no price available]` | `No Price found for a Faucet Hole.` |

**Manual price line (no diagnostic):**
```
CRM pipeline test manual price @ $1,250.00                           $1,250.00
```

**Subtotal:**
```
Subtotal:                                                             $1,250.00*
```

**Total section:**
```
Total
                                                                      $1,250.00*
                                             * Some prices are missing
```

`* Some prices are missing` appears in red at bottom when any line has missing price.

### CSS class notes

- `lineItemEvenRow` / `lineItemOddRow` — generated price lines (alternating)
- `pricesNumericValue` — right-aligned dollar amount cell
- `priceDetailTotalRow` — total row
- Diagnostic text rows have no CSS class — styled red italic inline via parent container

---

## Gaps vs Current CRM Code

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Editor shell | **Done** | Save/Exit/Revisions modals all match live behavior |
| Phase 1 — Edge Length modal + piece context menu | **Done** | Verified live; edge click at canvas pixel coords works |
| Phase 2 — Corner treatment markers + menus | **Not started** | `-Std-` markers on canvas, corner menu with 5 items, Radius modal |
| Phase 3 — Splash & Edge markers + menus | **Not started** | `F` markers on each segment, 10-item edge menu |
| Phase 4 — Sink canvas objects + context menu | **Not started** | Sink as draggable object, 5-item context menu, Properties modal |
| Phase 5 — Color & Edge accordions | **Partial** | Area cards exist; right-rail commands and Slabs & Layout section need wiring |
| Phase 6 — Price Details with diagnostics | **Not started** | Per-line diagnostics in red italic, missing-price summary at bottom |

---

## Spec Corrections Required in `moraware-countergo-editor-implementation-plan.md`

1. **Phase 3 edge menu order:** Start with `4" Splash`, not `3" Splash`.
2. **Phase 4 sink modal:** Remove "model" from field list. Actual fields: Sink Type, Shape, Cutout Dimensions, Faucet Hole Count, Show Centerline.
3. **Phase 2 Radius modal:** Only one button `Save`, no `Save & Next Corner`. Title is `Edit Corner - Radius`, not just `Radius`.
4. **Phase 5 Slabs & Layout:** This is a collapsible sub-section inside each area accordion, not a separate step.
5. **Phase 0 Exit modal:** No "Cancel" or "Go Back" text button. Close is via back-arrow icon in the modal header only.
