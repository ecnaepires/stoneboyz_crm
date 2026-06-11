# Desired Calendar Workflow

## Purpose

This document describes the desired StoneBoyz calendar workflow based on the supplied Moraware/Systemize screenshots and transcript.

The goal is to rebuild the current schedule into a shop-friendly production calendar where staff can see what work is happening, who owns it, what is blocking it, and what needs to move next.

## Core Rule

The production calendar should primarily display Job Activities.

A Job Activity is the operational unit of work on the calendar, such as:

- Template
- Fabrication
- Install
- Repair
- Customer Pick-up
- Invoice
- Deposit
- Material
- Cut

Standalone events may still exist, but the main work calendar should make Job Activities the default visible item.

## Desired Main Calendar Experience

The left sidebar item should open Calendar/Scheduling directly into the user's default saved view.

The first target view should resemble the supplied install schedule screenshots:

- Horizontal calendar columns by weekday.
- Date shown at the top of each day.
- A daily summary line under each date.
- Multiple stacked activity cards per day.
- Dense, wrapped text inside each activity card.
- Activity cards color-coded by activity type or status.
- Large enough card area for shop staff to scan job details without opening every job.

The calendar should be optimized for daily shop work, not a lightweight personal calendar.

## Desired Top Controls

The calendar should have a top toolbar similar to the screenshots:

- View selector.
- Search.
- Views.
- Customize.
- Save View.
- Map.
- Multiple.
- Print.
- Appointment or Add Activity.

The first implementation can build these in stages. The important rule is that the layout should leave a clear place for these controls from the start.

## Desired Filters

Calendar views should be filterable by:

- Date range.
- Activity type.
- Assignee.
- Account.
- Job.
- Status.

Common saved filters should support:

- Install schedule.
- Template schedule.
- Fabrication schedule.
- Repair schedule.
- Customer pick-up schedule.
- All production activities.

## Desired Calendar Views

The system should support saved Calendar Views.

A Calendar View defines:

- Display type.
- Date range length.
- Activity types shown.
- Assignees shown.
- Statuses shown.
- Display fields shown inside each activity card.
- Field order inside each activity card.
- Wrap text on/off.
- Auto refresh on/off.
- Color rule.
- Whether the view is shared or personal.
- Whether the view is the user's default.

Shared views are available to everyone.

My views are available only to the user who saved them.

## First Saved Views To Build

### Install Schedule

Purpose: show upcoming installs by day.

Default filters:

- Activity type: Install.
- Date range: one or two work weeks.
- Assignees: all.
- Statuses: scheduled, tentative, confirmed, in progress.

### Template Schedule

Purpose: show upcoming template visits.

Default filters:

- Activity type: Template.
- Date range: one or two work weeks.
- Assignees: all.
- Statuses: scheduled, tentative, confirmed, in progress.

### Fabrication Schedule

Purpose: show shop work and load by day.

Default filters:

- Activity type: Fabrication.
- Date range: one or two work weeks.
- Assignees: shop assignees or all.
- Statuses: scheduled, tentative, confirmed, in progress.

### All Activities

Purpose: show every scheduled Job Activity for operational planning.

Default filters:

- Activity types: all.
- Date range: one work week.
- Assignees: all.
- Statuses: all non-cancelled statuses.

## Desired Activity Card Fields

Each activity card should be configurable, but the default dense card should include:

- Job number.
- Account name.
- Job name.
- Job address.
- City.
- Salesperson or responsible user, when available.
- Material/color, when available.
- Order or quote area square footage, when available.
- Activity type.
- Scheduled time window.
- Activity status.
- Assignee.

The screenshot shows cards similar to:

```text
SB2824
Tara Moran House
12019 Marblehead dr
Tampa
SBZ
Orders - Area Sq. Ft. 59
Fabrication
Unscheduled
Confirmed

Unassigned
```

## Desired Daily Summary

Each day column should show summary totals above the cards.

Desired summary examples:

- Total scheduled hours for that day.
- Order area square footage for Template.
- Order area square footage for Fabrication.
- Order area square footage for Install.
- Order area square footage for Repair.

Example format:

```text
6/10/2026 (6.5 hours)
Order - Area Sq. Ft. - Fabrication: 114.8
Order - Area Sq. Ft. - Install: 59
Order - Area Sq. Ft. - Repair: 25.3
```

## Desired Color Behavior

Activity cards should have strong scan-friendly color indicators.

The first target should use a prominent top border or side strip.

Colors may map to activity type first:

- Template
- Fabrication
- Install
- Repair
- Customer Pick-up
- Material
- Invoice
- Other

Later, status color can be layered in if needed.

## Desired Drag And Drop

Activities should be movable on the calendar.

Dragging an activity should support:

- Move to a different date.
- Move to a different time when the view has time slots.
- Move to a different assignee when the view is assignee-based.

After a drag:

- The Job Activity schedule updates.
- The linked Scheduled Event updates.
- The Job detail page reflects the new schedule.
- The change is auditable.

The app should avoid silent batch changes. If moving one activity will affect later autoscheduled activities, the user should be asked to confirm.

## Desired Customize Flow

Clicking Customize should open a panel or modal where the user can configure:

- Display type.
- Date range.
- Activity types.
- Assignees.
- Filters.
- Display fields.
- Field order.
- Wrap text.
- Auto refresh.
- Color rule.

After customizing, the user can:

- Apply without saving.
- Save over the current view.
- Save as a new shared view.
- Save as a new personal view.
- Set as default view.

## Desired Search

Search should filter visible activities by:

- Job number.
- Account name.
- Job name.
- Job address.
- City.
- Assignee.
- Material/color.

Search should not replace structured filters. It is for quick narrowing.

## Desired Print And Map

Print should preview before printing.

Print should support:

- Current visible calendar.
- Day packet.
- Install packet.
- Template packet.
- Fabrication packet.

Map should support activities with job addresses.

Map should not mutate scheduling data.

## Implementation Plan

### Phase 1: Document And Confirm Scope

- Capture current workflow in `docs/current_calendar_workflow.md`.
- Capture desired workflow in this document.
- Confirm the first default view to build.
- Confirm which fields must appear in the first activity card.

Recommended first view: Install Schedule-style weekly board, because it matches the screenshots and gives the shop the clearest daily workload view.

### Phase 2: Build Read-Only Weekly Production Board

- Add a new weekly calendar surface under `/schedule`.
- Keep existing create-event flow available while replacing the main month-first layout.
- Render weekday columns.
- Render dense activity cards.
- Render daily totals.
- Use existing `ScheduledEvent` and `JobActivity` links first.
- Use Account/Job labels in the UI even if code still calls them customers/projects.

Success check:

- User can open Calendar and see a week of work activities in a dense board.
- Cards show useful job/account/activity info.
- Clicking a card opens the activity editor.

### Phase 3: Add Filters And View Selector

- Add activity type filter.
- Add assignee filter.
- Add status filter.
- Add search.
- Add date controls for previous week, today, and next week.
- Add a view selector with hardcoded starter views.

Success check:

- User can switch between Install, Template, Fabrication, and All Activities.

### Phase 4: Add Saved Views

- Add persisted Calendar View records.
- Support shared views and personal views.
- Save filters, display fields, field order, wrap text, auto refresh, color rule, and default view.

Success check:

- User can customize a view, save it, leave the page, return, and see the saved view again.

### Phase 5: Add Drag And Drop Rescheduling

- Add drag-and-drop movement within supported views.
- Update the linked activity/event.
- Preserve audit history.
- Confirm before moving autoscheduled dependent activities.

Success check:

- Dragging a card to another day changes the job activity schedule and persists after refresh.

### Phase 6: Add Print, Map, And Batch Tools

- Add print preview.
- Add map view for address-based activities.
- Add explicit multiple/batch edit mode.

Success check:

- User can print a schedule packet or map visible jobs without accidental data changes.

## Open Decisions

1. Which first view should replace the current calendar as the default: Install Schedule, All Activities, or Template Schedule?
2. Should the first weekly board show five weekdays only, or seven days?
3. Should daily totals include quote/order square footage immediately, or can that come after the weekly card layout works?
4. Which card color is most important first: activity type, status, or assignee?
5. Should standalone events appear in the main production calendar, or should they be hidden by default?
