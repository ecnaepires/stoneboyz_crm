# Moraware CounterGo / Systemize Audit

Captured from `https://stoneboyz.moraware.net/go/quotes`, `/go/orders`, `/go/settings`, `/sys/jobs`, `/sys/calendar`, `/sys/reports`, and `/sys/settings` on 2026-05-14.

## High-Level Takeaway

Moraware has useful domain coverage but poor information design. It stores the right objects: quotes, orders, accounts, price lists, drawings, files, email history, change logs, saved views, exports, and account-specific price access. The UI is table-heavy, visually noisy, hard to scan, and hides workflow status inside columns or nested detail blocks.

Our CRM should keep the domain model and workflow power, but replace the UI with guided flows, clear status, room-based quote building, and customer/project context.

## Navigation And Global Patterns

- Left nav: Quotes, Orders, Price Lists, Settings, Help, Systemize, user profile.
- Global search appears everywhere with entity scope: All, Accounts, Jobs, Leads, Quotes, Orders.
- List pages share toolbar actions: Views, Customize, Save View, Export, Create.
- Detail pages use top actions: Print, Email, Change Log, sometimes Delete/Duplicate.
- Most pages are made of nested tables and modal overlays.

Better version:

- Keep global search, but make it fast and command-like.
- Keep saved/custom views, but ship excellent default views.
- Put primary workflow actions near object status: Send, Accept, Convert to Order, Print, Email.
- Replace tiny icon-only controls with clear buttons and tooltips.

## Quotes List

Observed columns:

- Job#
- Quote Name
- Account
- Created Date
- Price List
- Email Viewed Date
- Quote Total
- Account Notes
- Quote Notes

Observed actions:

- Search across entity types
- Views
- Customize
- Save View
- Export
- Create
- Sort by Created Date

Toolbar behavior:

- Views opens a modal with searchable shared views, current/default markers, edit buttons, and Set Default View.
- Save View can save as new or update existing, choose My View vs Shared View, and set the view as default.
- Export opens a modal with Current Page vs All Pages.
- Customize supports filters, displayed columns, column reordering/removal, and rows per page.

Better version:

- Default columns: Quote, Customer/Account, Project/Job, Status, Total, Sent/View status, Valid Until, Owner, Last Activity.
- Show quote status as a badge, not plain text.
- Show communication status: not sent, sent, viewed, expired.
- Add quick filters: Draft, Sent, Viewed, Accepted, Expiring Soon, No Total, Unassigned.
- Add saved views later, after defaults are solid.

## Quote Detail

Observed sections:

- Quote Info
- Quote Address
- Drawing with revision selector
- Quote Summary
- Details breakdown
- Files
- Email history

Observed quote fields:

- Quote Name
- Status
- Expiration Date
- Price List
- Account
- Job Name
- Salesperson
- custom field: Job name
- custom field: Sqaure Foot
- Notes
- Payment Terms

Observed actions:

- Create Job
- Create Order
- Edit Quote Info
- Edit Quote Address
- Edit Drawing
- Print
- Email
- Change Log
- Add File

Observed tool behavior:

- Print opens a `Print CG Quote` modal with template choices:
  - Quote
  - Quote (no drawing)
  - Drawing & Layout (no prices)
  - Quote w/large drawing
  - Basic Quote Sample
- Email opens `Email Latest Quote Revision` with:
  - email template dropdown: Invoice, Receipt email, Quote/Drawing
  - quote form dropdown using the same print templates
  - preview button
  - reply-to/from display
  - to, cc, bcc
  - subject
  - body editor
  - `[PDFLink]` token replaced with quote link
- Create Job opens a modal with job name and template:
  - Customer Pick-up
  - Standard Lead
  - Standard Phase
  - Standard Job
  - (None)
- Create Order opens a confirmation modal. Message says the quote will be permanently converted into an order. It asks for Sale Date.
- Edit Quote Info opens a modal with quote name, job picker/link controls, salesperson, job name, square foot, notes, payment terms.
- Add File opens a drag/drop or choose-file upload modal with file type dropdown:
  - Customer drawing
  - Signed contract
  - Slab image
  - Shop drawing
  - CAD file

Better version:

- Header: quote title, quote number, status, total, customer, project/job, owner.
- Primary actions: Send Quote, Convert to Order, Print/PDF, Edit.
- Summary strip: total, sq ft, price list, valid until, last sent/viewed, payment status if order exists.
- Body tabs: Scope, Drawing, Pricing, Files, Email, Activity.
- Inline timeline: created, revised, sent, viewed, accepted/rejected, converted to order.
- Keep change log, but surface human-readable activity first.

## Quote Pricing Breakdown

Observed structure from sample quote:

- Price List: Contractor Rev. 23
- Sq. Ft.: 95.9
- Total Price: $7,905.10
- Areas/rooms:
  - Area #1
  - Master bath
  - Guest Bath
  - Laundry
- Line categories:
  - Material/slabs, e.g. `110.3 sq ft - 2 Slabs QUARTZ Calacatta Antique @ $42.00/sq ft`
  - Countertop area
  - 4 inch splash
  - Fabrication
  - Finished edge
  - Sink cutouts
  - Sink item
  - Faucet holes
  - Area subtotal
  - Quote total

Better version:

- Model quote as rooms/areas with grouped line items.
- Each room card should show material, square footage, edge, sinks/cutouts, splash, subtotal.
- Right-side sticky quote total should update live.
- Let user expand pricing math, but default to clean summary.
- Preserve line-item auditability for accounting.

## Drawing

Observed:

- Drawing revision number
- See All revision link
- Visual countertop outlines with dimensions
- Page-break markers in drawing print view
- Drawing edit action

Drawing editor workflow:

- Step 1: Counter Dimensions
- Step 2: Curves & Bumpouts
- Step 3: Splash & Edge
- Step 4: Sink & Cooktop
- Step 5: Color & Edge
- Step 6: Price Details

Drawing editor toolbar:

- Help
- Undo
- Redo
- Revisions
- Save
- Exit
- Text
- Page Break
- Other Counter
- Round to nearest 1/16 inch
- Zoom In
- Zoom Out
- Reset Zoom
- Pan

Step 1 behavior:

- Step label: Counter Dimensions.
- Canvas shows counter outlines, dimension lines, page-break markers, sink/cutout preview, and multiple counters.
- Toolbar actions available in this step:
  - Text
  - Page Break
  - Other Counter
  - Round To Nearest 1/16"
  - Zoom In
  - Zoom Out
  - Reset Zoom
  - Pan
- Clicking a counter body opens a context menu:
  - Rotate Counter Left
  - Rotate Counter Right
  - Duplicate Counter
  - Delete Counter
- Clicking a dimension label opens an Edge Length modal:
  - Length textbox, in inches.
  - Save & Next Edge.
  - Save.
  - Drawing preview highlights the active edge being edited.
- Sample measurements observed in the editor include 123 1/2", 43 1/2", 61 1/2", 39", 25 1/2", 17 1/4", 42", and 23".
- Important UX pattern: fast sequential edge entry matters. Moraware's Save & Next Edge is ugly, but useful.

Step 2 behavior:

- Step label: Curves & Bumpouts.
- Drawing marks each editable corner/edge with `-Std-` when no special treatment is applied.
- Toolbar remains similar to Step 1: Text, Page Break, Other Counter, Round To Nearest 1/16", Zoom controls, and Pan.
- Clicking a corner marker opens a context menu:
  - Radius...
  - Clip...
  - Bump Out...
  - Notch...
  - None
- Radius modal:
  - Radius textbox, in inches.
  - Sample default: 4".
  - Save.
- Clip modal:
  - Length textbox, in inches.
  - Sample default: 4".
  - Save.
- Bump Out modal:
  - Length textbox, in inches.
  - Sample default: 4".
  - Depth textbox, in inches.
  - Sample default: 2".
  - Save.
- Notch modal:
  - Length textbox, in inches.
  - Sample default: 4".
  - Depth textbox, in inches.
  - Sample default: 4".
  - Save.
- Important data model: every corner treatment needs type, length/radius, depth where relevant, and an explicit None/standard state.

Step 5 behavior:

- Areas are named, e.g. Island, laundry/desk.
- Each area has Product, Color, Edge.
- Product/color use dropdown pickers.
- Other color can be used.
- Slabs & Layout section exists per area.
- Add color option, reorder color options, add area, reorder areas.
- Edge selector options observed in the quote editor:
  - Bevel
  - Bullnose
  - Cove
  - Demi Bullnose
  - Double Bevel
  - DuPont
  - Eased
  - Half Bullnose
  - Ogee
  - Square
- Splash/edge drawing menu options:
  - 4" Splash
  - 3" Splash
  - 5" Splash
  - Other Splash
  - Mitered Edge
  - Waterfall
  - Finished Edge, e.g. Eased
  - Appliance Edge
  - Unfinished Edge
  - Additional Finished Edge
- Drawing labels show edge/splash state directly on each segment:
  - `F` for finished edge
  - `U` for unfinished edge
  - `S4"` for 4 inch splash

Step 6 behavior:

- Shows price settings: price list revision, tax, discount, expiration.
- Shows per-area generated pricing lines.
- Per-area edit and add item actions.
- Inline prices are clickable/editable.
- Price Settings modal fields:
  - Tax Rate dropdown, with `-None-` and `<New Tax Rate>`.
  - Discount % textbox.
  - Expiration Date textbox/date picker.
  - Change Price List button.
  - Save.
- Change Price List modal fields:
  - Select Price List dropdown.
  - Save.
- Inline price override modal:
  - Product summary, e.g. `37.3 sq ft Fabrication`.
  - Price List Price, e.g. `No Price Available`.
  - Override Price List textbox.
  - Unit label, e.g. `$/sq ft`.
  - Save.
- Area edit modal:
  - Area Name.
  - Quantity.
  - Save.
- Add item modal:
  - Item dropdown.
  - Options observed:
    - `<Add Miscellaneous Item>`
    - `<Add Text Item>`
  - Save.
- Sink/cutout/faucet lines are generated into pricing:
  - Sink cutout, e.g. `1 - 29" Undermount Sink Cutout`
  - Sink item, e.g. `1 Sink - 3018`
  - Faucet holes, e.g. `1 Faucet Hole` or `3 Faucet Holes`
- Sample generated pricing lines:
  - `58.7 sq ft - 1 Slab QUARTZ Cambria Delgatie @ $0.00/sq ft`
  - `37.3 sq ft Countertop - Priced by the slab`
  - `37.3 sq ft Fabrication @ $140.00/sq ft`
  - `27.8 lin ft Finished Edge - Eased @ $0.00/lin ft`
  - `1 - 29" Undermount Sink Cutout @ $0.00`
  - `1 Sink - 3018 @ $0.00`
  - `1 Faucet Hole @ $0.00`
  - `1.8 sq ft - 4" Splash`
  - `22.1 sq ft Fabrication @ $35.00/sq ft`
  - `3 Faucet Holes`
- Important UX pattern: pricing is generated from drawing/options, but office users still need controlled overrides and manual text/misc items.

Sink properties observed in the quote editor:

- Model, e.g. 3018.
- Sink Type:
  - Undermount
  - Drop-In
  - Farmer
- Shape:
  - Rectangle
  - Oval
  - Double
  - 60/40
  - 40/60
  - 70/30
  - 30/70
- Cutout Dimensions: Length x Width in inches.
- Faucet Hole Count: 0 through 5.
- Show Centerline:
  - None
  - Left
  - Right

Sink context menu observed:

- Properties
- Rotate Sink Left
- Rotate Sink Right
- Duplicate Sink
- Delete Sink

Better version:

- Add Drawing tab or panel with revision history.
- Store measurements per area, not only as an image.
- Make dimensions editable in structured fields first; drawing visual can follow.
- Add revision comparison later.
- Do not rebuild the whole CAD editor first. Phase it:
  1. structured room/area measurements
  2. generated drawing preview
  3. visual editor for dimensions, sinks, splash, and edge
  4. revisions and compare

## Email History

Observed columns:

- Sent timestamp
- Status
- Recipients
- Subject
- Revision
- View Count
- Last Viewed
- Sent By
- Expiration Date

Better version:

- Keep email tracking.
- Put "Sent / Viewed / Expired" in quote header and list.
- Show email cards: recipient, subject, sent by, sent at, view count, last viewed.
- Later: resend, copy link, revoke link, preview customer quote.

## Files

Observed:

- Files section
- Add file action
- Empty state: No Files

Better version:

- Attach PDFs, photos, measurements, templates, signed approvals.
- Show file type, uploader, upload date, linked quote revision.

## Create Quote Flow

Observed modal fields:

- Quote Name
- Quote Type: Account or Standalone
- Account picker
- Price List derived from account
- Save

Better version:

- Wizard:
  1. Customer/account or standalone lead
  2. Project/job and address
  3. Price list and terms
  4. Rooms/materials/measurements
  5. Review/send
- Account selection should show available price lists immediately.
- Standalone quote should be allowed, but prompt conversion to customer/project when accepted.

## Global Search

Observed:

- Search routes to `/go/search?search=...`.
- Results include Jobs, Orders, Quotes, Accounts.
- Query terms are highlighted in result titles and fields.
- Search result has filter dropdown:
  - No Filters
  - All Accounts
  - Active Accounts
  - All Jobs
  - Active Jobs
  - Unscheduled Jobs
  - 30+ Days Old Jobs
  - Complete Jobs
  - All Leads
  - Active Leads
  - Unscheduled Leads
  - 30+ Days Old Leads
  - Complete Leads
  - Quotes
  - Orders
- Result cards show contextual fields per entity, such as account, job address, sale date, QuickBooks invoice, quote address, job name.

Better version:

- Keep global multi-entity search.
- Show grouped results with strong type labels and primary action.
- Add keyboard navigation later.
- Make result cards visually cleaner and avoid table nesting.

## Orders

Observed list columns:

- Order Name
- Job name
- Account
- Sale Date
- Payment Status
- Total Price
- Sq. Ft.
- Price List

Observed payment statuses:

- Paid
- Unpaid
- Partially Paid

Observed order detail sections and actions:

- Order Info
- Order Address
- Payments
- Drawing revision
- Order Summary and details
- Files
- Email history
- Print
- Email
- Change Log
- Create/link Job
- Edit Order Info
- Edit Order Address

Observed order fields:

- Order Name
- Payment Status
- Sale Date
- Price List
- Account
- Job Name
- Salesperson
- QuickBooks Export status
- custom field: Job name
- custom field: Sqaure Foot
- Notes
- Payment Terms

Observed payment behavior:

- Payments table columns: Date, Amount, Method, Reference #, Notes.
- Totals show Total Paid and Total Due.
- Add payment modal fields:
  - Date
  - Amount
  - Payment Method
  - Reference #
  - Notes
- Payment methods: Cash, Check, Mastercard, Visa, American Express, Discover, Bank Transfer (ACH), E-Check.

Observed QuickBooks behavior:

- Orders show QuickBooks Export status.
- Accounting export page shows order/account, last export, export status, Start, and Disable Exporting for this Order.
- Payment method settings warn when not connected to QuickBooks Online and when methods are missing from QuickBooks.

Observed order email behavior:

- Email Latest Order Revision modal uses the same email infrastructure as quotes.
- Templates include Invoice, Receipt email, Quote/Drawing.
- Order Form dropdown includes Quote, Quote (no drawing), Drawing & Layout (no prices), Quote w/large drawing, Invoice, Basic Quote Sample.
- Email body uses `[PDFLink]`, replaced with an order link.

Better version:

- Orders are accepted quotes or sale records.
- Default order list should emphasize status, payment, due balance, job date, customer, owner.
- Include filters for Unpaid, Partially Paid, Paid, Recent Sales.
- Put payment summary and QuickBooks/export state in the order header.
- Payment entry should be quick, with method/reference/notes inline and audit history below.

## Accounts

Observed account detail sections:

- Account Info
- Account Address
- Contacts
- Price Lists
- Related Orders

Observed account fields:

- Account Name
- Salesperson
- Create separate address for jobs/quotes
- Account Type
- Notes
- Address and phone
- Contacts
- Assigned price lists with active status

Better version:

- Account dashboard should show:
  - contacts and billing info
  - active quotes
  - open orders
  - unpaid balance
  - assigned price lists
  - recent activity
- Historical tables should move below summaries.

## Price Lists

Observed price list list columns:

- Name
- Revision
- Status
- Created Date
- Created By
- Units
- Standalone Default Tax Rate
- Standalone Default Payment Terms
- Expiration Days
- Sequence

Observed price list detail:

- Status
- Accounts with access
- Revision history
- Edit Price List
- Delete
- Duplicate
- Change Log

Observed categories:

- Settings
- Materials
- Splash
- Fabrication & Installation
- Mitered Edges & Waterfalls
- Finished Edges
- Appliance Edges
- Curves & Bumpouts
- Cutouts
- Sinks
- Other Items

Observed pricing rule properties:

- Price for Default / all materials or specific material
- Hide On Quote
- Allow Discount
- Editable Price on Quote
- Tax Code
- Units
- Expiration days
- Rounding to nearest cent

Better version:

- Create an admin Pricing module.
- Support revisions and duplicate price lists.
- Account/customer can have price-list access.
- Rule editor should be structured:
  - category
  - item type
  - applies to material/group/all
  - unit
  - price
  - quote visibility
  - discountable
  - editable on quote
  - tax code
- Current quote schema is too flat for this. Need price lists, areas, and categorized line items.

## Custom Views

Observed customize modal:

- Filters
- Display fields
- Reorder fields
- Remove fields
- Rows per page
- Apply
- Save View available from toolbar

Better version:

- Phase 1: simple filters and sensible defaults.
- Phase 2: column chooser, saved views, exports.
- Avoid making every user customize before the page is useful.

## Change Log

Observed:

- Change log exists per quote/account/address/user.
- Entries include timestamp, actor, entity, action, changed field, old value, new value.
- Links to related entities and user-specific change log.
- Retention shown as 36 months.

Better version:

- Keep immutable audit log.
- Also show friendlier Activity timeline on detail pages.
- Use change log for compliance/debugging, not the main user-facing history.

## Quote And Order Settings

Observed setting groups:

- Bounced Email
- Customize Text
- Default Payment Terms
- Email Templates
- Fields
- Forms
- Measurement
- Payment Methods
- Tax Codes
- Tax Rates

Observed email templates:

- My Email Templates and Shared Email Templates.
- Shared templates:
  - Invoice, reply-to `<admin@stoneboyz.com>`, from name Stone boyz, subject `Your countertop Invoice SBZ`, usage Quote & Order, sequence 1.
  - Receipt email, reply-to `<admin@stoneboyz.com>`, from name Andre Henrique, subject `Your payment receipt`, usage Quote & Order, sequence 2.
  - Quote/ Drawing, reply-to `<Andre@stoneboyz.com>`, from name Andre Henrique, subject `Your countertop quote`, usage Quote & Order, sequence 3.

Observed forms:

- Quote
- Quote (no drawing)
- Drawing & Layout (no prices)
- Quote w/large drawing
- Invoice
- Basic Quote Sample

Observed custom fields:

- Job name, sequence 1, Text, Active.
- Sqaure Foot, sequence 2, Number, Active.

Observed payment/tax/measurement config:

- Payment methods are ordered and active/inactive capable.
- Tax Codes has `Tax`.
- Tax Rates currently shows no tax rates.
- Measurement defaults:
  - Default Units: Inches
  - Default Rounding: Round to nearest 1/16"
  - Default Counter Depth: 25.5 Inches

Better version:

- Admin module should include email templates, quote PDF forms, payment terms, tax config, custom fields, measurement defaults, file types, and permissions.
- Keep settings understandable by business category, not vendor naming.

## Systemize / Production

Observed:

- Separate Systemize area with Jobs, Calendar, Reports, Settings, Help, CounterGo.
- Jobs list uses same views/customize/save/export/create system.
- Job list columns include:
  - Orders - Payment Status
  - Job#
  - Job Name
  - Account
  - Job Creation Date
  - Template Date
  - Deposit Date
  - Material Date
  - Fabrication Date
  - Install Date
  - Invoice Date
  - Repair Date
  - Salesperson
  - Job Checklist
  - Job Issues
- Dates can show tentative/confirmed state, e.g. `No Date (tent)`, `5/14/2026 (conf)`.
- Icons mark scheduling/payment/status flags.

Observed job detail sections:

- Job Info
- Job Address
- Account Address
- Account Contacts
- Job Activities
- Forms
- Orders
- Quotes
- Files
- Phases
- Job Issues
- External Users With Access

Observed job fields:

- Job Name
- Account
- Creation Date
- Salesperson
- Job#
- Notes
- Job Info edit modal fields:
  - Job Name.
  - Creation Date.
  - Salesperson dropdown.
  - Job#.
  - Notes.
  - Save.
- Job Info modal actions include Delete and Duplicate/action icons.
- Salespeople observed in the dropdown:
  - Andre
  - Raiane
  - Romulo

Observed job activities:

- Table columns: Activity, Status, Start Date, Sched Time, Duration, Assigned To, Notes.
- Activity types in the job detail flow:
  - Template
  - Deposit
  - Material
  - Fabrication
  - Install
  - Invoice
  - Repair
  - Phone call
  - Email
  - Customer Pick-up
- Activity edit modal fields:
  - Account Name.
  - Job Name.
  - Activity.
  - Status
  - Start Date
  - Sched Time
  - Duration
  - Assigned To
  - Notes
- Activity statuses available in modal:
  - Auto-Schedule
  - Tentative
  - Confirmed
  - In Progress
  - Complete
  - Canceled
- Activity modal actions include Delete, Print, Duplicate, Change Log, and Save.
- Date/time helper controls:
  - Today shortcut beside Start Date.
  - Current Time shortcut beside Sched Time.
  - End Now shortcut beside Duration.
  - Myself shortcut beside Assigned To.
- Fabrication activity sample:
  - Status: Tentative.
  - Duration: 2 hours.
  - Same scheduling controls as other job activities.
- Create Job Activity modal fields:
  - Account Name.
  - Job Name.
  - Activity dropdown.
  - Save.

Observed job forms:

- Printable Job Header.
- Job Checklist with fields such as Deposit received, Tearout, Ready to Template, Approved for Install.
- Order Area (Room) Details with fields such as Order Area Name, Material, Splash, Total Order Sq Ft, Edge, Sink, Sink type, Sink in stock, Faucet info, Notes, Remake/rework.
- Job Checklist edit modal fields:
  - Form Name.
  - Deposit received checkbox.
  - Tearout dropdown.
  - Ready to Template checkbox.
  - Approved for Install checkbox.
  - Save.
- Tearout dropdown options:
  - No tearout.
  - Tearout - laminate.
  - Tearout - stone.
  - Tearout - tile.
  - `<New Value>`.
- Order Area (Room) Details edit modal fields:
  - Form Name.
  - Sink type dropdown.
  - Sink in stock dropdown.
  - Faucet info.
  - Notes.
  - Remake/rework checkbox.
  - Save.
- Sink type dropdown options:
  - Farm.
  - Dropin.
  - Undermount.
  - `<New Value>`.
- Sink in stock dropdown options:
  - yes.
  - no.
  - SBZ.
  - ON SITE.
  - `<New Value>`.
- Job form modal actions include Delete, Print, Duplicate, Change Log, and Save.
- Important data model: job forms are configurable per template/process, and form fields may be checkboxes, dropdowns with custom values, text, or linked order/area fields.

Observed create job modal:

- Job Name
- Account picker
- Job Template dropdown:
  - Customer Pick-up
  - Standard Lead
  - Standard Phase
  - Standard Job
  - (None)

Observed calendar:

- Toolbar actions: Views, Customize, Save View, Map, Multiple, Print, Appointment.
- Default view: Standard View.
- Activity types shown: Appointment, Template, Fabrication, Install, Repair, Customer Pick-up.
- Calendar can color activities by Activity Type.
- Calendar grid shows daily total hours and daily totals by order/area square footage per activity type.
- Event cards show job number, job name, address, city, account, order area sq ft, activity type, scheduled/unscheduled state, status, and assignee.
- Multiple toggles batch mode and adds an Update Multiple action.
- Appointment modal fields:
  - Name
  - Status
  - Start Date
  - Sched Time
  - Duration
  - Assigned To
  - Category
  - Notes
  - Recurring
- Appointment categories include Meeting, Vacation, Equipment Repair, service, measure job, and New Category.
- Map modal filters by Date, Activity Types, Assigned To, and Start Location.
- Print modal prints packets/forms by Date, Activity Types, Assigned To, Number of Days, Page Breaks, and Packet or Form.
- Calendar customize includes Begin Date, Number of Days, Display Type, Activity Types, Assigned To, Filters, Display Fields, Subtotals, Color Activities By, Wrap Text, and Auto Refresh.
- Shared calendar views include Standard View, customer pick-up, Fabrication Schedule, Install Schedule, Template Schedule.

Observed reports:

- Reports list has shared reports and create action.
- Shared reports:
  - Installed sq ft by Month (Order Area Form)
  - Jobs by Salesperson
  - Month install SqFt by week
  - Total sales by month (from Orders)
- Report detail has Customize, Save As, Export.
- Report builder options:
  - Time Selection: Day, Week, Month, Quarter, Half, Year, Month-to-date, Quarter-to-date, Half-to-date, Year-to-date, Custom.
  - Reporting Date
  - Measure
  - Filters
  - Display Fields
  - Display Type: Table or Bar Chart
  - Rows per page

Observed Systemize settings:

- Main settings: Account, Billing, Calendar, Job, Shop, System, Users & Roles.
- Calendar settings: Appointment Categories, Holidays, Map, Settings.
- Job settings: Activity Forms, Activity Packets, Activity Statuses, Activity Types, Assignees, File Fields, Job Detail, Job Fields, Job Forms, Issue Categories, Issue Forms, Order Area Forms, Processes, Salespeople, Templates.
- Shop settings: Settings, Users, Views.

Observed activity types:

- Template, sequence 1, Yellow, Tentative, 1.5 hours.
- Deposit, sequence 2, `#ffccff`, Tentative, depends after Template by at least 1 workday.
- Material, sequence 3, Aqua, Tentative.
- Fabrication, sequence 4, blue, Tentative, 2 hours, depends before Install by at least 2 workdays.
- Install, sequence 5, `#aaffaa`, Tentative, depends after Template by at least 5 workdays.
- Invoice, sequence 6, `#00aa00`, Tentative, depends after Install by at least 1 workday.
- Repair, sequence 7, `#ff2222`, Tentative.
- Phone call, sequence 8, Fuchsia, Tentative.
- Email, sequence 9, Orange, Tentative.
- Quote, sequence 10, `#00aaaa`, Tentative.
- Customer Pick-up, sequence 11, Gray, Tentative.

Observed activity statuses:

- Auto-Schedule, sequence 1, abbreviation auto, color `#990099`, type Auto-Schedule.
- Tentative, sequence 2, abbreviation tent, Black, type Active.
- Confirmed, sequence 3, abbreviation conf, Green, type Active.
- In Progress, sequence 4, abbreviation InProg, Orange, type Active.
- Complete, sequence 5, Blue, type Complete.
- Canceled, sequence 6, abbreviation cncl, Red, type Canceled.

Observed assignees:

- Assignees have sequence, color, description, status, and optional map start location.
- Examples include Account Customer, Andre Henrique, Andy, D & E Granite (YOSBEL), DARIEL, Deyvis, Eddy, Eduardo Sosa, Enoque Pires, Enoque Pires JR, Gustavo Henrique, ISRAEL, Laudel Araujo, Luis Borges, Raiane Henrique, Romulo Costa, Victor & Victor.
- Some descriptions identify role, e.g. FABRICATOR, CUTTER, INSTALLER, OFFICE MANAGER.

Observed processes/templates:

- Processes: Job active, Lead inactive.
- Customer Pick-up template: Deposit, Material, Fabrication, Invoice, Customer Pick-up; forms Area (Room) Details and Order Area (Room) Details.
- Standard Lead template: Phone call, Email.
- Standard Phase template: Template, Material, Fabrication, Install, Invoice; forms Printable Job Header, Job Checklist, Area (Room) Details, Order Area (Room) Details.
- Standard Job template: Template, Deposit, Material, Fabrication, Install, Invoice, Repair; forms Printable Job Header, Job Checklist, Order Area (Room) Details.

Observed job/order area forms:

- Job forms: Printable Job Header, Job Checklist, Area (Room) Details, Order Area (Room) Details, Service.
- Order Area Forms: Order Area Details.

Better version:

- Merge quote/order/project flow into one CRM instead of separate CounterGo/Systemize mental models.
- Project pipeline should have phases:
  - created
  - template
  - deposit
  - material
  - fabrication
  - install
  - invoice
  - repair/warranty
- Each phase needs scheduled date, confirmation state, assignee, checklist, issue flags, and customer/account context.
- Calendar needs dedicated schedule, dispatch, route/map, and print-packet workflows, not just a generic table view.
- Reports should start with fixed operational reports before exposing a custom report builder.

## Immediate Product Backlog

1. Improve quote detail UI using current schema:
   - summary header
   - status/actions
   - pricing summary
   - cleaner line item table
   - notes/terms/activity sections

2. Improve quotes list:
   - status badges
   - total
   - valid until
   - customer/project context
   - quick filters

3. Add Moraware-inspired domain fields:
   - priceListId/name
   - quote address
   - salesperson/owner
   - payment terms
   - sent/view tracking
   - files
   - activity/change log

4. Add quoting engine data model:
   - quote areas/rooms
   - categorized line items
   - price lists
   - price list revisions
   - account price-list access

5. Add customer/account dashboard:
   - account health
   - active quotes
   - open orders
   - unpaid balance
   - contacts/address
   - assigned price list

6. Add order conversion:
   - accepted quote can become order
   - preserve quote revision snapshot
   - track payment status

7. Add production scheduling:
   - activities with type/status/assignee/date/time/duration
   - calendar views for template/fabrication/install/customer pick-up
   - map/route planning
   - printable activity packets
   - batch updates for selected activities

8. Add admin configuration:
   - activity types and dependencies
   - activity statuses
   - job templates
   - assignees and roles
   - job/order area forms
   - report definitions

## Design Direction

- Operational, dense, calm.
- Tables where comparison matters; cards where workflow context matters.
- Fewer colors than Moraware, but use status colors intentionally.
- No marketing layout.
- Make the first screen usable for office staff doing repetitive quoting all day.
