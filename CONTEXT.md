# Glossary

## Shop

A countertop company using the product as its own isolated tenant. Stone Boyz is the first Shop, not the only one: the product is built to be sold to other fabrication shops, most of them migrating from Moraware. Every company-level setting — work days, holidays, views, colors, activity types — belongs to one Shop.

## Activity Type

A Shop-defined kind of Job Activity, such as Template, Fabrication, Install, or Tearout. Activity Types are catalog data owned by each Shop, not a fixed system list: each type carries its own name, color, optional Pipeline Stage mapping, square-footage participation, autoscheduling behavior, and default duration. New Shops start from a seeded standard set.

## Pipeline Stage

A job's current position in the CRM workflow. Scheduling a stage appointment places the job in the matching Pipeline Stage when that move is forward.

## Scheduled Appointment

A calendar item tied to customer work, optionally tied to a job. Deposit, Template, Material, Fabrication, Install, and Invoice appointments are stage appointments; Repair, Other, and Cut appointments are side-work and do not define a Pipeline Stage.

## Job Activity

A planned step inside a Job, such as Phone Call, Email, Template, Fabrication, Install, or Invoice. A Job Activity may be Not Scheduled, Scheduled, Confirmed, In Progress, Completed, or Cancelled. When it has a date, time, and duration, it appears on the calendar as a Scheduled Appointment.

## Autoscheduling

The workflow that schedules later Job Activities from a scheduled anchor Job Activity using the Job's copied template offsets. Autoscheduling moves forward through the Job Activity order and does not change manually overridden Job Activities without user confirmation. Autoscheduling only lands work on Work Days and skips Holidays; manual placement may use any day.

## Work Day

A day of the week the company schedules work on, set once in company calendar settings. Non-work days appear grayed on the schedule but remain open to manual placement — Autoscheduling alone is restricted to Work Days.

## Holiday

A dated company-wide day off kept in a settings list. Autoscheduling skips Holidays the same way it skips non-work days.

## Activity Square Footage

The square footage a Scheduled Appointment contributes to capacity planning, read live at display time rather than stored on the appointment. It resolves from the Job's best available source: the accepted quote's square footage when one exists, otherwise the active draft quote's drawing-derived square footage shown as an estimate, otherwise zero. Because it is read live, a Template day's estimate self-corrects once templating updates the quote.

## Day Subtotal

The capacity rollup shown in a schedule day header: the total scheduled hours for that day plus Activity Square Footage broken down by activity type. A Day Subtotal counts exactly the activities the Calendar View displays — filtered-out activities never contribute. Template subtotals are estimates by nature since templating produces the final measurements; all later activity types subtotal accepted-quote numbers. Whether subtotals appear is a per-view on/off setting.

## Run Order

The vertical position of a Scheduled Appointment within its day on the schedule. Run Order is dispatch information, not a display artifact: the dispatcher places appointments top-to-bottom to communicate the day's work sequence, the position persists exactly where dropped, and every User sees the same order. Run Order is fully manual for timed and untimed appointments alike — the day never re-sorts itself behind the dispatcher's back. Appointments scheduled from outside the calendar insert by time among the day's timed appointments; untimed arrivals, including autoscheduled follower activities, land at the bottom of the day.

## Schedule Glyphs

The at-a-glance markers shown next to scheduled dates: a sun for a morning (AM) sched time, a moon for an afternoon or evening (PM) sched time, and short status abbreviations such as (conf), (tent), and (InProg). They let staff read a whole schedule without opening any activity.

## Calendar View

A saved, named schedule configuration that controls the calendar display type, filters, visible activity fields, and coloring.

## Job List View

A saved view that shows Jobs as rows with one date column per activity type, so a row reads the whole job story left to right. Each cell shows the activity's date with Schedule Glyphs, or a no-date marker that is itself the office's to-do signal; clicking a cell opens the activity editor in place. The Job List View is the office's main working grid; the shop works from the Calendar View.

## My View

A Calendar View private to one User.

## Shared View

A Calendar View visible to every User.

## Display Field

One piece of job or activity information shown inside an activity box on the schedule.

## Color Activities By

The field whose value determines each activity box's color on the schedule.

## Assignee

A person, team, crew, department, truck, equipment item, machine, or outside contractor responsible for a Job Activity. An Assignee is not necessarily a login User, though one Assignee may be linked to one User when the same person also logs into the CRM.

## Account

The person or business that owns one or more Jobs and is responsible for approvals, communication, or payment. An Account is not a login User. An Account may be a homeowner, contractor, builder, designer, or repeat customer with Jobs at different Job Addresses.

## Account Address

The main address for an Account, such as a homeowner address or a contractor's office address.

## Job Address

The physical site address for one specific Job. A Job Address starts from the Account Address by default when the Job is created, but it belongs to the Job and may diverge from the Account Address.

## Job Template

A reusable job pattern selected when a Job is created. A Job Template defines which standard Activities, Forms, and File Sections the Job starts with so common work does not need to be rebuilt by hand for every Job. A Job remembers which Job Template it came from, but its own Activities, Forms, and File Sections are the Job's working records after creation.

## Job

A customer work scope tracked through the CRM, from sales through production activity. A Job may have appointments, quotes, slabs, notes, and pipeline movement.
_Avoid_: Project when speaking to shop users

## Slab

A physical piece of stone tracked in the shop's slab inventory. A Slab may be open shop stock, negotiating on a quote, reserved for accepted work, cut, or kept as a remnant, but it remains inventory throughout that lifecycle.

## Negotiating Slab

A Slab soft-tagged to an active quote while the customer is deciding. A Negotiating Slab is visible to other Salespeople but cannot be negotiated by another quote. It is promoted to a Reserved Slab only when the quote is accepted.

## Reserved Slab

A Slab hard-held for accepted work. A Reserved Slab should not be offered to another quote unless released by inventory lifecycle rules.

## Slab Thickness

The material thickness of a Slab, recorded in centimeters because stone stock is commonly described as 2 cm or 3 cm. Slab length and width remain measured in inches for shop layout and cut-fit work.

## Slab Value per Square Foot

The monetary value assigned to each square foot of a Slab. Staff use it with the Slab's length and width to understand the total value of the Slab.

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

## Slab Condition

The visible physical condition of a Slab, including whether it is good or damaged. Slab Condition can include marked damage areas on photos so staff can judge usability before walking the yard.

## Damage Mark

A marked area on a Slab photo identifying one visible flaw, such as a scratch, chip, crack, or stain. A Slab may have many Damage Marks, and each mark carries its own type and note. A Damage Mark lives in photo pixel space and is a visual record; it is not the same as a Damage Zone and the two must not be blurred.

## Damage Zone

A region of unusable Slab surface expressed in physical slab inches, authored directly on the Slab Layout board. Slab Layout warns when a piece overlaps a Damage Zone. It is distinct from a Damage Mark: a Damage Mark annotates a photo for visual record, while a Damage Zone drives geometric placement on the layout.

## Slab Layout

A planning view that places a Job's pieces onto its reserved Slabs and Remnants of one Material Color to judge whether the material can be cut for the work. The user places each piece by hand; Slab Layout uses confirmed Slab dimensions, Job piece dimensions, and Damage Zones, and flags pieces that fall outside the slab, overlap another piece, or overlap a Damage Zone.

## Area (Sheet)

A named, ordered drawing surface within a quote, presented to the user as a Sheet — like a tab at the bottom of a spreadsheet. Each Sheet holds its own separate drawing and its own pieces; pieces on one Sheet are isolated from another. The user divides work into Sheets manually, typically one room or location per Sheet ("Kitchen", "Master Bath", "Outdoor Kitchen"), and renames each Sheet freely. A Sheet carries a single material, color, and edge profile; when a room mixes materials, the user creates a second Sheet rather than mixing materials on one. "Sheet" is the user-facing word; "Area" is the same concept in the data model.

Each Sheet reports its own measurement rollup: counter square footage, backsplash square footage, the two combined, finished-edge linear footage, splash square footage, sink count, and faucet-hole count. The quote-wide total is the sum of all its Sheets.

## Templater

The field worker who visits the customer's home and produces the drawing: counters, backsplashes, floor tiles, sinks, faucet holes, and edges, divided into Sheets by room. The Templater works only in the drawing workspace and never sets pricing. Drawing is the only input; measurements are read off the drawing.

## Construction Line

A straight drawing reference attached to a countertop piece for layout, alignment, or shop communication. A Construction Line is not material and never contributes to square footage, finished-edge linear footage, splash quantities, sink counts, faucet-hole counts, or pricing quantities.

## Segment Line

A Construction Line placed from a user-chosen start point, exact length, and direction squared to the countertop piece. Segment Lines are used for controlled layout marks such as seam planning and must not be drawn freehand.

## Centerline

A dashed construction/reference line placed by the Templater for alignment. A Centerline can be offset by exact measured inches from a counter edge, cabinet reference, or wall reference. It is not material and never contributes to square footage, finished-edge linear footage, splash quantities, sink counts, faucet-hole counts, or pricing quantities.

## Extend

A drawing operation that lengthens a source Construction Line to a user-selected target line while preserving the source line's direction squared to the countertop. Extend does not change countertop shape; if the source is a countertop edge, the result is a Construction Line.

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

## Material Source

The Area-level choice of where selected quote material comes from. Inventory material references a Candidate Slab; external material comes from outside current inventory and may include an External Material Note.

## Candidate Slab

The inventory Slab selected as an Area's material source before quote acceptance. A Candidate Slab puts the Slab into Negotiating status until the quote is accepted, rejected, expired, archived, or the Area changes material source.

## Manual Deposit

An order-level amount requested from the customer before downstream work proceeds. The deposit is satisfied by recorded manual payments against the order; recorded payments reduce both the deposit due and the full order balance. Voided payments remain visible in payment history but do not count toward the deposit or balance. When a linked order's deposit is satisfied, the matching job checklist's Deposit Received gate is marked true.

## Charge Method

How a Price Item is measured for billing: by square foot, by linear foot, or by each/unit. The Charge Method determines which quote measurement supplies the item quantity.

## Measurement Basis

The specific drawing-derived quote measurement used as the quantity for a Price Item, such as countertop square footage, backsplash square footage, combined square footage, finished-edge linear footage, sink count, or faucet-hole count. Salespeople choose the Measurement Basis so different pricing scenarios can support retail jobs, fabrication-only jobs, and custom work.

## Finished Edge

Any countertop edge that is not a wall edge. A wall edge sits against the wall and receives no fabrication; every other edge treatment (eased, appliance, mitered, waterfall, additional finished) is a finished edge and contributes to finished-edge linear footage. The distinction is binary for measurement: wall edge or finished edge. Splash polishing also counts: a splash contributes the part of its outline that is neither against the wall nor against the counter (its top run plus its two sides).

## Square Footage

The exact outline area of a piece — the union of its drawn shape. For an L or U piece this is the legs only, not the empty corner of its bounding box. Counter pieces and backsplash pieces are measured by square footage only; the polished top face of the slab is not a separately measured fabrication. Sink and faucet cutouts do not reduce square footage — they are counted as units and charged separately, never subtracted from the outline area. Only fabricated edges are measured by linear foot; the slab face is not. The same outline area serves both billing and cut-fit (Slab Layout); the two never use different shapes for the same piece.

## Corner Treatment

A finishing note applied to a single countertop corner. Only two exist: Radius (rounded) and Clip (chamfer). A Corner Treatment is a fabrication annotation and never changes square footage or finished-edge linear footage — it records how the corner is finished, not a change to the piece outline. Notch and Bump-Out are not Corner Treatments: they are real changes to the piece outline and are drawn into the shape itself, where they are measured like any other outline geometry.

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
