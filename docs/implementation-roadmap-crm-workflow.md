# CRM Workflow Implementation Roadmap

## Purpose

Phased plan for aligning the current dashboard with `docs/desired_crm_workflow.md`, using `docs/current_dashboard_notes.md` as the gap source.

Core strategy:

- Reuse existing `customers` as Accounts.
- Reuse existing `projects` as Jobs.
- Reuse existing `scheduled_events` as calendar appointments.
- Reuse existing `job_templates`, `attachments`, notes, phases, checklists, quotes, orders, and payments.
- Add only missing concepts: Job Activity and Assignee.
- Keep backend/internal `customer` and `project` names during first pass; make user-facing UI say Account and Job.

## Decisions Locked

- Account means current Customer, not login User.
- Job Template required on Job creation, default to Standard Job.
- Job keeps link to selected Job Template.
- Job copies template contents at creation; old Jobs do not change when template changes.
- Job Activity is separate from Scheduled Appointment.
- Job Activity owns workflow status.
- Scheduled Event is calendar placement/projection for scheduled Job Activities.
- Assignees attach to Job Activity, not only calendar appointment.
- Existing user assignments migrate/bridge into Assignees gradually.
- Template creates all Job Activities as Not Scheduled.
- First scheduled Job Activity in template order becomes autoschedule anchor.
- Autoscheduling moves forward only.
- Autoschedule offsets live on template activity specs and are copied to Job Activities.

## Success Criteria

- Staff can create a Job from one screen with Job Name, Account, and Job Template.
- New Job opens with template-created Job Activities visible in one place.
- Account Address and Job Address are distinct and editable.
- Scheduling a Job Activity creates/updates calendar placement.
- Assignees can be people, crews, teams, trucks, equipment, machines, or departments.
- Autoscheduling creates predictable forward schedule from an anchor activity.
- Existing quotes, orders, payments, notes, files, checklists, and calendar behavior are reused.
- No duplicate Account/Job/calendar systems are introduced.

## Phase 1: Core Data Structure

Goal: add missing backbone while preserving current data.

Reuse:

- `customers`
- `customer_addresses`
- `projects`
- `scheduled_events`
- `job_templates`
- `activity_notes`
- `job_notes`
- `attachments`
- `phases`
- `job_checklists`

Build:

- Add `projects.job_template_id`.
- Add `job_activities`.
- Add `assignees`.
- Add `job_activity_assignees`.
- Add copied autoschedule fields on Job Activity.
- Add optional link from Job Activity to Scheduled Event.
- Add optional link from Assignee to User.

Recommended `job_activities` fields:

- `id`
- `customer_id`
- `project_id`
- `job_template_id`
- `template_activity_key`
- `title`
- `activity_type`
- `appointment_type`
- `status`
- `sort_order`
- `duration_minutes`
- `scheduled_event_id`
- `autoschedule_state`
- `autoschedule_offset_amount`
- `autoschedule_offset_unit`
- `depends_on_activity_id`
- `manual_override_at`
- `created_at`
- `updated_at`
- soft-delete/audit fields if matching local patterns

Recommended `assignees` fields:

- `id`
- `name`
- `type`
- `linked_user_id`
- `active`
- `notes`
- `created_at`
- `updated_at`
- `archived_at`

Verifications:

- Migration creates tables/fields without dropping existing data.
- Existing Project/Customer/Scheduled Event tests still pass.
- Backfill can create Assignees for existing Users or bridge old user IDs safely.

## Phase 2: Job Creation Workflow

Goal: make Job creation match desired flow while using current Project backend.

Build:

- Update `/projects/new` to user-facing `Create Job`.
- Rename UI labels: Project -> Job, Customer -> Account.
- Require Job Name, Account, Job Template.
- Default Job Template to Standard Job.
- Submit `jobTemplateId` to current `/projects` create endpoint.
- Backend validates Account exists.
- Backend validates Job Template exists.
- Backend creates Project/Job, stores `job_template_id`, creates first phase/checklist if needed, creates copied Job Activities.
- Redirect to Job Detail after create.

Reuse:

- Current `createProjectAction`.
- Current `/projects` API route.
- Current `ProjectsService` transaction pattern.
- Current primary address defaulting logic.

Avoid:

- New `jobs` table.
- New `/jobs` API in first pass.
- Duplicate create flow.

Verifications:

- Cannot create Job without name, Account, Template.
- Standard Job creates expected Not Scheduled Job Activities.
- Existing Project list/detail still works.

## Phase 3: Account Selection And Creation

Goal: make Account selection fast, searchable, and usable from Job creation.

Build:

- Account selector component using current Customers API.
- Search existing Accounts.
- Select existing Account.
- Add Account modal from Job creation.
- Minimum quick-create field: Account Name.
- Save Account, then auto-select it in Job form.
- Show Account Address preview when available.
- Let Job Address default from Account Address, with clear independent edit later.

Reuse:

- Current customer create/list APIs where possible.
- Current customer address APIs.
- Current customer validation rules, but keep quick-create minimal.

Need decision during build:

- If current customer create requires fields beyond Account Name, add a narrow quick-create endpoint/action that creates minimum valid Customer.

Verifications:

- Empty database still offers Add Account.
- Newly created Account appears in selector.
- Existing Account can have multiple Jobs.

## Phase 4: Job Templates

Goal: make templates drive Job starting shape.

Build:

- Use `/job-templates` in Job creation.
- Store selected template on Job.
- Copy template activity specs into Job Activities.
- Extend template activity specs with dependencies and autoschedule offsets.
- Add template management UI/API after create flow stable.
- Add template fields for Forms and File Sections after Job Activity path stable.

Reuse:

- Current `job_templates` table.
- Current `activity_specs` JSON for first pass if enough.
- Existing Standard Job seed as default.

Avoid:

- Applying template edits to old Jobs automatically.
- Building full template editor before template selection/create works.

Verifications:

- Job remembers template source.
- Existing Jobs unaffected by later template edits.
- Standard Job template creates Template, Deposit/Material/Cut/Fabrication/Install/Invoice/Repair according to current template data, unless product chooses a smaller default.

## Phase 5: Activities And Assignees

Goal: make Job Detail activity workflow real.

Build:

- Replace static Job Activities table with real `job_activities`.
- Activity name opens editor modal/page.
- Editor shows Account Name, Job Name, Activity Type.
- Edit status, date, time, duration, Assignees, notes.
- Scheduling a Not Scheduled activity creates linked Scheduled Event.
- Updating scheduled date/time/duration updates linked Scheduled Event.
- Cancelling/completing activity updates linked Scheduled Event through backend service.
- Activity notes use existing `activity_notes`.
- Assignee selector supports multiple Assignees.
- Create Assignee from activity editor.

Reuse:

- Existing `scheduled_events` for calendar.
- Existing transition endpoints where useful.
- Existing users as initial Assignee source/backfill.
- Existing activity notes APIs.

Avoid:

- Frontend as source of truth for workflow transitions.
- User IDs as long-term resource model.

Verifications:

- Not Scheduled activity has no calendar event.
- Scheduled activity appears on calendar.
- Multiple Assignees display by name/resource, not raw IDs.
- Existing scheduled events still load.

## Phase 6: Calendar And Autoscheduling

Goal: connect Job Activity scheduling to calendar and dependent schedule creation.

Build:

- Calendar displays Job Activities through linked Scheduled Events.
- Clicking calendar item opens same Activity editor.
- Backend autoschedule service schedules forward from anchor activity.
- First scheduled activity in template order becomes anchor.
- Autoschedule only forward dependents.
- Store autoscheduled/manual_override state.
- If upstream activity moves, recompute only autoscheduled dependents.
- Preserve manually overridden activities unless user confirms update.
- Later: drag/drop calendar rescheduling calls same backend service.

Reuse:

- Current `/schedule` page.
- Current custom calendar UI for first pass.
- Current scheduled event create/update/list APIs where possible.

Need decisions during build:

- Business days vs calendar days.
- Working hours.
- Weekend scheduling.
- Conflict detection.
- Double-booking Assignees.

Recommended first defaults:

- Business days.
- Shop working hours from config/default constants.
- No hard conflict blocking in first slice; warn only if conflict detection is cheap.

Verifications:

- Scheduling Template autoschedules later activities by offsets.
- Moving anchor updates unlocked dependent activities.
- Manual override remains fixed.
- Calendar and Job Detail show same dates/statuses.

## Phase 7: Forms And Files

Goal: use existing checklist/attachments, then add template-driven sections.

Build:

- Job Files list on Job Detail using current `attachments`.
- Job file upload/delete UI.
- Keep attachment categories.
- Add File Sections to templates after upload works.
- Show File Sections on Job Detail.
- Keep current Job Checklist as first Form.
- Add template-created Forms after Job Activity path stable.
- Add form template/submission models only when actual form requirements are known.

Reuse:

- Existing `attachments` table/API.
- Existing `job_checklists`.
- Existing storage service patterns.

Avoid:

- New generic document system before job uploads work.
- Replacing checklist with form engine too early.

Verifications:

- Job file upload attaches to Job and appears on Job Detail.
- Deleted files soft-delete/archive.
- Checklist still works.

## Phase 8: Polish, Permissions, And Testing

Goal: harden workflow for shop use.

Build:

- Permission checks for Job create/edit, Account create, Activity edit, Assignee management, file upload/delete, template management.
- Friendly blocker messages for invalid workflow moves.
- UI consistency pass: Account/Job labels, no user-facing Project/Customer drift in Job workflow.
- Job Detail summary: next action, blockers, money owed, responsible Assignees.
- Audit events for Job Activity status changes, scheduling changes, Assignee changes, template source, file deletion.
- Clean dead UI paths, especially missing event edit route.
- Remove or hide obsolete Project/Customer labels in user workflow.

Testing:

- Domain tests for Job Activity status rules.
- Integration tests for Job creation with template activities.
- Integration tests for Account quick-create from Job creation.
- Integration tests for scheduling Job Activity -> Scheduled Event.
- Integration tests for autoschedule forward dependencies.
- Integration tests for manual override preservation.
- Integration tests for Assignee CRUD/assignment.
- Integration tests for job attachments.
- UI smoke tests for Create Job, Job Detail, Activity editor, Schedule.

Verification gate:

- Existing customer/project/scheduled event tests pass.
- New tests pass.
- Manual smoke confirms no duplicate Account/Job/calendar flows.

## Build Order

1. Phase 1 minimal DB/domain spine.
2. Phase 2 Job creation stores template and creates Job Activities.
3. Phase 3 Account selector/quick-create.
4. Phase 4 template copy details and basic template read UI.
5. Phase 5 Activity editor and Assignees.
6. Phase 6 autoscheduling.
7. Phase 7 files/forms.
8. Phase 8 hardening.

## Non-Goals For First Pass

- Full backend route/table rename from Project to Job.
- New Account table.
- New calendar system.
- Full template builder before template-driven Job creation works.
- Full form engine before checklist/files are useful.
- Hard double-booking prevention before schedule workflow is stable.

## Open Questions

- Exact Standard Job activity list.
- Business-day calendar rules.
- Default work hours.
- Whether Assignee conflicts warn or block.
- Which roles can manage templates and Assignees.
- Which file categories must appear as default File Sections.
