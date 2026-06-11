# Desired CRM Job Workflow Spec

## Purpose

This document describes the desired CRM/dashboard workflow for managing jobs, accounts, activities, forms, files, scheduling, assignees, and job templates.

The goal is to use this document as the reference specification when comparing the desired workflow against the current dashboard/codebase.

---

# 1. Core job rule

Every job in the CRM must be assigned to an account.

Each job should hold all information related to that job in one place, including:

- Activities
- Forms
- Files
- Notes
- Scheduling information
- Assignees
- Account information
- Job address
- Job status

The goal is that when we click into a job, we can see everything connected to that job without needing to search in multiple places.

---

# 2. Creating a new job

From the main dashboard, the user should be able to click into the **Jobs** section.

Inside the Jobs section, there should be a button called:

**Create Job**

When the user clicks **Create Job**, a job creation screen or pop-up should open.

The first required fields should be:

- Job Name
- Account
- Job Template

The job cannot be created unless it has both:

1. A job name
2. An account connected to it

---

# 3. Selecting or creating an account

When the user is creating a job, there should be an **Account** field.

If accounts already exist in the database, the user should be able to open a dropdown, three-dot menu, **More** button, or account selector to view existing saved accounts.

The account selector should allow the user to:

- Search existing accounts
- Select an existing account
- Add a new account if the account does not exist yet

If the database is new, there may not be any accounts entered yet. In that case, the system should still show an option to add a new account.

There should be a **plus button** or **Add Account** button next to the Account field.

When the user clicks the plus button, a simple account creation pop-up should open.

At the beginning stage, the only required field should be:

- Account Name

Example:

```text
Account Name: Test Account
```

The user should be able to save the account name and immediately connect that new account to the job being created.

After the account is created, it should appear in the saved accounts list for future jobs.

---

# 4. Job templates during job creation

During the job creation process, the user should also be able to select a **Job Template**.

A job template controls what automatically appears inside the job.

Templates are how we customize what each type of job should look like.

The template should define which activities, forms, and file sections are automatically created inside the job.

For example, a job template may include activities such as:

- Template
- Fabrication
- Install
- Invoice
- Phone Call
- Email
- Fabrication Install

The purpose of templates is to avoid manually adding the same activities every time we create a job.

---

# 5. Example job templates

The system should allow us to create multiple job templates.

## Standard Job Template

This template may include:

1. Template
2. Fabrication
3. Install
4. Invoice

This would be used for a normal job that goes from measurement/template to fabrication, installation, and invoicing.

## Standard Lead Template

This template may include:

1. Phone Call
2. Email

This would be used for a lead that is not yet a full job but still needs follow-up activities.

## Standard Phase Template

This template may include:

1. Fabrication
2. Install

This would be used when the job is already past the lead or template stage and only needs fabrication and installation activities.

The CRM should let us create and customize these templates ourselves.

We should be able to decide:

- Which activity types are included
- What order the activities appear in
- Whether activities are automatically scheduled
- Which forms appear
- Which file sections appear
- Which activity types are required
- Which activities depend on other activities

---

# 6. Account address and job address

When a job is created, the job address should automatically default to the account address.

However, the account address and job address must be editable separately.

This is important because an account may be a contractor, builder, designer, or repeat customer who has multiple jobs at different locations.

Example:

```text
Account Name: ABC Contractor

Account Address:
ABC Contractor's office address

Job Address:
The specific project address for this job
```

The system should show both:

- Account Address
- Job Address

There should be an edit icon next to each address.

The user should be able to click the edit icon next to **Account Address** to update the main account address.

The user should be able to click the edit icon next to **Job Address** to update the address for that specific job.

The job address should not overwrite the account address unless the user specifically chooses to update the account address too.

---

# 7. Job details page

After the job is created, the user should be taken to the **Job Details** page.

The Job Details page should show all job information in one place.

The page should include:

- Job Name
- Account Name
- Job Template
- Account Address
- Job Address
- Activities
- Forms
- Files
- Notes
- Job Status
- Calendar-related scheduling information

The activities should appear as clickable or underlined names.

When the user clicks an activity name, an activity edit pop-up should open.

---

# 8. Job activities

Inside a job, activities are the scheduled steps of the job.

Examples of activities:

- Phone Call
- Email
- Template
- Fabrication
- Install
- Invoice

Each activity should be connected to:

- The account
- The job
- The activity type
- The schedule
- The assignee
- The status
- Notes

When a user clicks on an underlined activity name, such as **Template A**, a pop-up should appear.

The activity pop-up should show:

- Account Name
- Job Name
- Activity Type
- Status
- Start Date
- Scheduled Time
- Duration Time
- Assignee
- Notes

The Account Name, Job Name, and Activity Type should be visible so the user knows exactly what they are editing.

The user should be able to edit the scheduling and status details from this pop-up.

---

# 9. Activity status dropdown

Inside the activity pop-up, there should be a **Status** dropdown.

The status dropdown should include options such as:

- Not Scheduled
- Scheduled
- Confirmed
- In Progress
- Completed
- Cancelled

The user should be able to change the activity status depending on what is happening with that activity.

Example:

If the template appointment is confirmed with the customer, the user should set the activity status to:

**Confirmed**

If the activity is no longer happening, the user should set the activity status to:

**Cancelled**

The activity status should also be visible in the job details page and calendar view.

---

# 10. Activity date, time, and duration

Inside the activity pop-up, the user should be able to set:

- Start Date
- Scheduled Time
- Duration Time

These fields are important because they connect the activity to the calendar.

The **Start Date** tells the system what day the activity happens.

The **Scheduled Time** tells the system what time the activity starts.

The **Duration Time** tells the system how long the activity should take.

Example:

```text
Activity: Template
Start Date: March 10
Scheduled Time: 9:00 AM
Duration Time: 2 hours
```

Once this information is saved, the activity should appear on the calendar.

If the user changes the date or time, the calendar should update.

If the user changes the duration, the calendar block should update to show the correct length of time.

---

# 11. Activity notes

Inside the activity pop-up, there should be a freehand **Notes** field.

The notes field should allow the user to type anything related to the activity.

Example notes:

- Customer requested morning appointment
- Gate code is 1234
- Call before arriving
- Bring extra material
- Confirm sink cutout
- Installer needs photos before leaving

The notes should be saved to that specific activity.

The notes should be visible when the activity is opened again.

---

# 12. Assigning an activity

Each activity should have an **Assignee** field.

The assignee is the person, team, or resource responsible for that activity.

When the user clicks the Assignee field, a dropdown should open showing all existing assignees.

The user should be able to select one assignee or multiple assignees.

Example assignees:

- John
- Template Team
- Install Crew 1
- Fabrication Team
- Truck 1
- CNC Machine
- Delivery Team

If the assignee already exists, the user simply selects the assignee from the dropdown.

If the assignee does not exist, there should be an add button, plus button, three-dot menu, or **Create Assignee** option.

---

# 13. Adding a new assignee

If the user needs to assign an activity to someone or something that does not exist yet, the system should allow them to add a new assignee directly from the activity pop-up.

Example:

A new templater just started working at the company.

The user opens the activity pop-up, clicks the Assignee field, and chooses **Add Assignee**.

The add assignee pop-up should allow the user to enter one or multiple assignee names.

The system should support adding multiple assignees at once, one per line.

Example:

```text
John Smith
Template Team 2
Truck 3
```

After saving, those assignees should be available in the assignee dropdown.

The user should then be able to select them for the current activity.

---

# 14. Multiple assignees

The system should allow more than one assignee to be connected to the same activity.

There should be a **Multiple** button, checkbox, multi-select field, or similar option.

Example:

```text
Activity: Install

Assignees:
- Installer 1
- Installer 2
- Truck 1
```

This is important because some activities require multiple people or resources.

The system should not limit an activity to only one assignee.

---

# 15. Assignees are not the same as users

The CRM should clearly separate **Assignees** from **Users**.

A user is someone who can log into the CRM.

An assignee is a person, team, or resource that can be assigned to an activity.

Assignees do not always need login access.

Assignees can be:

- Employees
- Crews
- Teams
- Contractors
- Trucks
- Equipment
- Machines
- Departments

Examples:

- A templater can be an assignee.
- An install crew can be an assignee.
- A truck can be an assignee.
- A fabrication machine can be an assignee.

Assignees should appear in:

- Job details
- Activity details
- Job views
- Calendar views
- Scheduling views

There should be no automatic requirement that every assignee has a username, password, or login.

---

# 16. Saving activity edits

After the user edits an activity, the user should click **Save**.

When the activity is saved, the system should update:

- Activity status
- Start date
- Scheduled time
- Duration
- Assignee
- Notes
- Calendar placement

If the activity is part of an autoscheduled template, saving this activity may also update the remaining autoscheduled activities.

---

# 17. Autoscheduling

After the user saves the first main activity, the remaining activities from the job template should automatically schedule themselves based on the template rules.

The purpose of autoscheduling is to prevent accidental unscheduled activities.

For example:

If the template includes:

1. Template
2. Fabrication
3. Install
4. Invoice

And the user schedules the Template activity, the system should automatically schedule the remaining activities based on the template rules.

Example:

```text
Template: Monday
Fabrication: Tuesday
Install: Thursday
Invoice: Friday
```

This prevents the user from creating a job where only the first activity is scheduled and the rest are forgotten.

The system should still allow the user to manually edit autoscheduled activities if needed.

---

# 18. Editing autoscheduled activities

Autoscheduled activities should appear in the job details page and calendar view.

The user should be able to click any autoscheduled activity and edit it.

The user should be able to change:

- Date
- Time
- Duration
- Status
- Assignee
- Notes

If an autoscheduled activity is manually changed, the system should either:

1. Keep the manual change and stop automatically moving that specific activity, or
2. Ask the user whether dependent activities should also be updated

The system should prevent confusion by clearly showing which activities are autoscheduled and which activities were manually adjusted.

---

# 19. Calendar connection

Activities with a start date, scheduled time, and duration should appear on the calendar.

The calendar should show scheduled activities by:

- Date
- Time
- Job
- Account
- Activity Type
- Assignee
- Status

The user should be able to click an activity on the calendar and edit it.

If the user drags an activity to a different date or time, the activity details should update automatically.

If that activity controls other autoscheduled activities, the system should update the dependent activities based on the template rules.

---

# 20. Main workflow summary

The basic workflow should work like this:

1. User goes to Jobs.
2. User clicks Create Job.
3. User enters Job Name.
4. User selects an Account.
5. If no account exists, user clicks plus button and creates an Account Name.
6. User selects a Job Template.
7. System creates the job.
8. Job address defaults to Account Address.
9. User can edit Account Address and Job Address separately.
10. User opens the Job Details page.
11. User clicks an Activity Name.
12. Activity pop-up opens.
13. User reviews Account Name, Job Name, and Activity Type.
14. User selects Activity Status.
15. User selects Start Date.
16. User selects Scheduled Time.
17. User enters Duration Time.
18. User selects or creates Assignee.
19. User adds freehand notes.
20. User saves the activity.
21. System updates the activity and calendar.
22. System autoschedules remaining activities based on the job template.
23. User can edit autoscheduled activities if needed.
24. Job now has activities, forms, files, scheduling, and account information in one place.

---

# 21. Important design principle

The CRM should not feel like separate disconnected tools.

The job should be the center of everything.

The account tells us who the job belongs to.

The job details page tells us what the job is.

The activities tell us what needs to happen.

The assignees tell us who or what is responsible.

The calendar tells us when it is happening.

The forms collect structured information.

The files store supporting documents.

Everything should connect back to the job.
