# Glossary

## Pipeline Stage

A job's current position in the CRM workflow. Scheduling a stage appointment places the job in the matching Pipeline Stage when that move is forward.

## Scheduled Appointment

A calendar item tied to customer work, optionally tied to a job. Deposit, Template, Material, Fabrication, Install, and Invoice appointments are stage appointments; Repair, Other, and Cut appointments are side-work and do not define a Pipeline Stage.

## Area (Sheet)

A named, ordered drawing surface within a quote, presented to the user as a Sheet — like a tab at the bottom of a spreadsheet. Each Sheet holds its own separate drawing and its own pieces; pieces on one Sheet are isolated from another. The user divides work into Sheets manually, typically one room or location per Sheet ("Kitchen", "Master Bath", "Outdoor Kitchen"), and renames each Sheet freely. A Sheet carries a single material, color, and edge profile; when a room mixes materials, the user creates a second Sheet rather than mixing materials on one. "Sheet" is the user-facing word; "Area" is the same concept in the data model.

Each Sheet reports its own measurement rollup: counter square footage, backsplash square footage, the two combined, finished-edge linear footage, splash square footage, sink count, and faucet-hole count. The quote-wide total is the sum of all its Sheets.

## Templater

The field worker who visits the customer's home and produces the drawing: counters, backsplashes, floor tiles, sinks, faucet holes, and edges, divided into Sheets by room. The Templater works only in the drawing workspace and never sets pricing. Drawing is the only input; measurements are read off the drawing.

## Salesperson

The office worker who receives a Templater's finished drawing and its measurements and turns them into a priced quote using a price list. Pricing belongs to the Salesperson's surface, not the drawing workspace.

## Price List

A reusable set of charges a Salesperson applies to quotes. A Price List can be edited after it is active; existing quote price lines keep their current amounts unless the Salesperson regenerates pricing for that quote.

## Price List Task

A single sellable charge inside a Price List, such as Material, Fabrication, Eased Edge, Bullnose, Sink Cutout, or Faucet Hole. The task is the user-facing thing being charged for, not an internal category or type code.

Edge profile tasks, such as Eased Edge or Bullnose, are chosen per Sheet and charge only the finished-edge linear footage on Sheets using that edge profile.

A Price List Task can have a zero price. This lets the Salesperson include an edge profile or task in the selectable list without charging extra for it.

## Task Catalog

The company-wide set of Price List Task names available to Salespeople. When a Salesperson adds a new task name, it becomes available to the whole team for future Price Lists.

## Charge Method

How a Price List Task is measured for billing: by square foot, by linear foot, or by each/unit. The Charge Method determines which quote measurement supplies the task quantity.

## Finished Edge

Any countertop edge that is not a wall edge. A wall edge sits against the wall and receives no fabrication; every other edge treatment (eased, appliance, mitered, waterfall, additional finished) is a finished edge and contributes to finished-edge linear footage. The distinction is binary for measurement: wall edge or finished edge. Splash polishing also counts: a splash contributes the part of its outline that is neither against the wall nor against the counter (its top run plus its two sides).

## Square Footage

The full slab area of a piece. Counter pieces and backsplash pieces are measured by square footage only; the polished top face of the slab is not a separately measured fabrication. Sink and faucet cutouts do not reduce square footage — a piece is measured as its full rectangle. Only fabricated edges are measured by linear foot; the slab face is not.

## Splash (edge treatment)

A property set on a single countertop edge marking that the edge has stone running up the wall, recorded as a splash height. It does not create a separate drawn piece. It is a distinct concept from a Backsplash and must not be blurred with it: a Backsplash is the drawn piece a user creates and the way the team represents stone on the wall going forward. The same wall is never recorded as both a Splash edge treatment and a Backsplash piece.

## Backsplash

A separate drawn piece placed against an existing countertop edge. A backsplash has a length based on the selected countertop edge span and a user-selected height such as 3 inches, 4 inches, 5 inches, or custom.

After creation, a backsplash behaves like a normal drawn piece: it can be selected, moved, deleted, and included in square-foot totals. It still needs a distinct identity so users can count countertop pieces separately from backsplash pieces.

Backsplash creation starts from a side-panel Back Splash button. Pressing the button opens a popup like the offset popup. The popup lets the user choose backsplash height presets, enter any custom backsplash height, save a custom height for quick reuse, and enter offset distance from the countertop piece. Backsplash width is not entered in the popup because the length comes from the selected countertop corners.

Saved backsplash height presets are company-wide. Users expect the same backsplash height presets to be available whenever they open a quote drawing.

The drawing tool is a separate product capability from the CRM. Customers may subscribe to the CRM only, the drawing tool only, or both together.

Drawing-only customers still need a lightweight business shell for projects, saved drawings, and possibly invoices, without requiring the full CRM pipeline.

Backsplash work will start inside the current quote drawing page, while using drawing-specific concepts and names so the drawing tool can be separated as a product module later.

Backsplash pieces use compact sequential labels such as "B/S1" on the canvas, shown in a small font so the label fits inside the thin piece. Dimensions communicate the exact size.

Backsplash pieces are rectangular and aligned to the selected edge span.

Backsplash offset is the gap between the countertop edge and the backsplash piece. An offset of 0 inches places the backsplash flush against the countertop edge.

Backsplash offset has a visible default of 3 inches. The default should be easy to adjust from one named constant, not hidden inside drawing logic.

Backsplash height has a visible default of 4 inches. The default should be easy to adjust from one named constant, not hidden inside drawing logic.

The backsplash popup has a Start button. Clicking Start closes the popup and activates corner selection. Clicking the Back Splash button again reopens the popup so the user can change height or offset.

Back Splash corner selection is hidden until the user clicks near a countertop corner. The first selected corner appears as a small black dot so the user can see what was caught without cluttering the drawing.

If the user chooses two backsplash corners that are not adjacent corners on the same countertop piece, the app tells the user to choose an adjacent corner and keeps the first corner selected.

After creating a backsplash, the Back Splash tool stays active so the user can create additional backsplashes without reopening the tool.

After a backsplash is created, the new backsplash piece becomes selected so the user can immediately see it, move it, or edit its dimensions.

Backsplash pieces use the same visual fill and stroke as countertop pieces when created. Users can later use the coloring tool to color backsplash pieces.

Drawn pieces have a product identity so the system can distinguish countertop pieces from backsplash pieces for counts and future pricing.

Square footage reporting should support countertop square footage, backsplash square footage, and combined total square footage.

Backsplashes are created from one countertop corner to an adjacent countertop corner, or from one green wall offset endpoint to the other endpoint on the same offset line. Partial edge runs are not selected during backsplash creation.

When the Back Splash tool is active, the canvas remains visually clean until the user selects a corner.

Clicking near a countertop corner while the Back Splash tool is active catches the nearest valid corner within the corner selection tolerance.

Back Splash click sounds are optional future polish and should not be part of the first build slice.

Only actual countertop corners and green wall offset endpoints can be selected for backsplash creation. Middle points along an edge are not valid backsplash anchors.

After the user chooses two adjacent backsplash corners, the app asks for direction visually: the user chooses which side of the selected edge span receives the backsplash, similar to an offset workflow.

No ghost preview is required before backsplash creation. The user chooses two adjacent corners, then clicks the desired side/direction, and the backsplash is created immediately.
