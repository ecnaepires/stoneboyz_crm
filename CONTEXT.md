# Glossary

## Pipeline Stage

A job's current position in the CRM workflow. Scheduling a stage appointment places the job in the matching Pipeline Stage when that move is forward.

## Scheduled Appointment

A calendar item tied to customer work, optionally tied to a job. Deposit, Template, Material, Fabrication, Install, and Invoice appointments are stage appointments; Repair, Other, and Cut appointments are side-work and do not define a Pipeline Stage.

## Job

A customer work scope tracked through the CRM, from sales through production activity. A Job may have appointments, quotes, slabs, notes, and pipeline movement.
_Avoid_: Project when speaking to shop users

## Slab

A physical piece of stone tracked in the shop's slab inventory. A Slab may be open shop stock or linked to a job, but it remains inventory while it is stored, reserved, cut, or kept as a remnant.

## Slab Tag

A physical label on a Slab or Remnant that identifies the inventory record. A Slab Tag should include a short readable code and a scannable QR code.

## Material Ownership

The party whose rights control whether a Slab or Remnant can be reused. Material Ownership determines whether leftover stone returns to shop stock or stays held for a Job.

## Material Color

The named stone color or material identity used to match Slabs, Remnants, quotes, and search results. Material Color should be selected consistently rather than typed differently by each user.

## Remnant

A leftover Slab created when a larger Slab is cut. A Remnant returns to inventory and may later be linked to the same Job, a different Job, or remain available as shop stock.

## Storage Location

The place in the shop's yard or warehouse where a Slab can be found. Storage Location should be consistent enough for staff to search, filter, and physically retrieve material without guessing.

## Inventory Hold

A restriction that keeps a Slab or Remnant from being offered for use. Holds are used for missing location, damage review, ownership review, or manager decision.

## Reservation

A link that claims a Slab or Remnant for one Job, making it unavailable to other Jobs. A Reservation is released when the material is detached, cut, or returned to shop stock.

## Reassignment

Moving a reserved Slab or Remnant from one Job to another in a single step, so the material is never momentarily loose. Reassignment is an Inventory Manager action and always carries a reason. Customer-supplied material cannot be reassigned to a different customer's Job.

## Release to Shop Stock

The Inventory Manager action that converts job-purchased or customer-supplied material into ordinary shop stock so it can be reused freely. It is deliberate, carries a reason, and is recorded, because it changes who the material belongs to. Plain detaching never does this — restricted material stays held to its Job until it is explicitly released.

## Slab Audit Event

A recorded entry in a Slab's history capturing one ownership- or reservation-changing action — reserve, release, reassign, release to shop stock, or cut — with who did it, when, the Jobs involved, and the reason. The Slab's audit history is the ordered list of its Slab Audit Events.

## Slab Condition

The visible physical condition of a Slab, including whether it is good or damaged. Slab Condition can include marked damage areas on photos so staff can judge usability before walking the yard.

## Damage Mark

A marked area on a Slab photo identifying one visible flaw, such as a scratch, chip, crack, or stain. A Slab may have many Damage Marks, and each mark carries its own type and note.

## Slab Layout

A planning view that places Job pieces onto a Slab or Remnant to judge whether the material can be cut for the work. Slab Layout uses confirmed Slab dimensions, Job piece dimensions, and Damage Marks.

## Area (Sheet)

A named, ordered drawing surface within a quote, presented to the user as a Sheet — like a tab at the bottom of a spreadsheet. Each Sheet holds its own separate drawing and its own pieces; pieces on one Sheet are isolated from another. The user divides work into Sheets manually, typically one room or location per Sheet ("Kitchen", "Master Bath", "Outdoor Kitchen"), and renames each Sheet freely. A Sheet carries a single material, color, and edge profile; when a room mixes materials, the user creates a second Sheet rather than mixing materials on one. "Sheet" is the user-facing word; "Area" is the same concept in the data model.

Each Sheet reports its own measurement rollup: counter square footage, backsplash square footage, the two combined, finished-edge linear footage, splash square footage, sink count, and faucet-hole count. The quote-wide total is the sum of all its Sheets.

## Templater

The field worker who visits the customer's home and produces the drawing: counters, backsplashes, floor tiles, sinks, faucet holes, and edges, divided into Sheets by room. The Templater works only in the drawing workspace and never sets pricing. Drawing is the only input; measurements are read off the drawing.

## Salesperson

The office worker who receives a Templater's finished drawing and its measurements and turns them into a priced quote using a price list. Pricing belongs to the Salesperson's surface, not the drawing workspace.

## Cutter

The shop worker who cuts Slabs for Jobs and records any Remnants that return to inventory.

## Inventory Manager

The shop worker responsible for receiving Slabs, maintaining Storage Locations, and linking or releasing Slabs from Jobs.
_Avoid_: Admin when describing inventory work

## Inventory Receipt

A batch of Slabs received into inventory from one delivery or unload event. An Inventory Receipt groups shared delivery details so each Slab can be added quickly.

## Pricing Catalog

The company-wide collection of reusable pricing choices. It is organized by Price Group so Salespeople can maintain materials, edges, fabrication, sinks, and other pricing independently instead of creating a full custom price list for each customer.

## Price Group

A family of pricing choices, such as Material, Fabrication, Edge, Sink, Faucet Hole, or Splash. Each Price Group can have its own reusable list of Price Items.

Each Price Group defines how quote selection works. Material and Edge groups offer many catalog items but allow one selected item per Sheet; Sink groups allow one or more selected items with quantities; Fabrication groups offer many catalog items and apply as a quote-level default with optional Sheet overrides.

## Price List

A reusable list inside one Price Group, such as a Material Price List, Edge Price List, or Sink Price List. A quote does not apply one full Price List; it selects Price Items from the relevant Price Groups.

## Price Item

A single selectable charge inside a Price Group, such as Uba Tuba, Fabrication, Eased Edge, Bullnose, or 70/30 Sink. The item carries a rate and billing setup; quote pricing multiplies the chosen item's rate by the matching drawing-derived quantity.

Edge profile items, such as Eased Edge or Bullnose, are chosen per Sheet and charge only the finished-edge linear footage on Sheets using that edge profile.

A Price Item can have a zero price. This lets the Salesperson include an edge profile or item in the selectable list without charging extra for it.

## Quote Pricing Selection

The Salesperson's chosen Price Items for a quote. Quote Pricing Selections combine user choices with drawing-derived quantities: material rates multiply square footage, edge rates multiply finished-edge linear footage, sink rates multiply sink count, and faucet-hole rates multiply faucet-hole count.

## Charge Method

How a Price Item is measured for billing: by square foot, by linear foot, or by each/unit. The Charge Method determines which quote measurement supplies the item quantity.

## Measurement Basis

The specific drawing-derived quote measurement used as the quantity for a Price Item, such as countertop square footage, backsplash square footage, combined square footage, finished-edge linear footage, sink count, or faucet-hole count. Salespeople choose the Measurement Basis so different pricing scenarios can support retail jobs, fabrication-only jobs, and custom work.

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
