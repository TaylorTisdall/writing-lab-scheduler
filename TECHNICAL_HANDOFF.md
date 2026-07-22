# Lamar Writing Lab Scheduler

## System status

The Lamar Writing Lab Scheduler is a working production-ready
appointment system built for embedding in Google Sites.

Students can:

- View appointments available during the next 14 calendar days
- Book one 30-minute appointment per day
- Receive automatic consultant assignment
- Copy a booking reference
- View or cancel an appointment using the reference and their
  Houston ISD email address
- See upcoming schedule exceptions

Consultants can:

- Sign in through the consultant portal
- Select recurring weekly availability
- View their assigned upcoming appointments

Administrators can:

- Create consultant and administrator accounts
- Assign one or both roles to an account
- Reset temporary passwords
- Activate or deactivate consultants and administrators
- Manage consultant shifts
- Manage school years and lab dates
- Add special lab dates
- Close or reopen individual dated slots
- View, reassign, or cancel appointments
- Retrieve student booking references
- Complete leadership handoffs through the website

Routine administrators should not need GitHub or Supabase.

## Live website

Base address:

https://taylortisdall.github.io/writing-lab-scheduler/

Pages:

- Student scheduler: `index.html`
- Consultant portal: `consultant.html`
- Administrator portal: `admin.html`
- Administrator guide: `admin-guide.html`
- Required password change: `change-password.html`

The student scheduler is designed to be embedded in Google Sites.
Staff links open full pages in separate browser tabs.

## Architecture

Frontend:

- Static HTML, CSS, and JavaScript
- Hosted by GitHub Pages
- Automatically redeployed after commits to the configured branch
- Poppins loaded through Google Fonts
- Responsive design suitable for Google Sites embeds

Backend:

- Supabase PostgreSQL database
- Supabase Authentication for consultants and administrators
- Row Level Security on protected tables
- Secure PostgreSQL functions for privileged operations
- Supabase Edge Functions for account creation and password reset

Supabase project reference:

`mdnyzlzaarzozbmqhecz`

The publishable key in frontend JavaScript is intentionally public.
It is protected by Row Level Security and secure database functions.

Never place a Supabase secret key or service-role key in GitHub,
frontend JavaScript, documentation, or Google Sites.

## Current operating configuration

Active school year:

- 2026–2027
- First student day: August 10, 2026
- Last student day: May 28, 2027

Regular Writing Lab schedule:

- Monday, 11:45 AM–12:15 PM
- Monday, 12:15 PM–12:45 PM
- Tuesday, 11:45 AM–12:15 PM
- Tuesday, 12:15 PM–12:45 PM
- Wednesday, 11:45 AM–12:15 PM
- Wednesday, 12:15 PM–12:45 PM

The stored lab calendar contains eligible school dates rather than
automatically treating every Monday–Wednesday as open.

## Important database tables

- `administrators`
- `appointments`
- `consultants`
- `consultant_shifts`
- `lab_open_dates`
- `lab_slot_closures`
- `school_years`
- `shift_templates`

Appointments contain student names, student emails, assigned
consultant shifts, dates, times, statuses, cancellation information,
and UUID booking references.

## Edge Functions

The project uses these Supabase Edge Functions:

- `admin-create-account`
- `admin-reset-password`

Both functions perform their own administrator authentication and
authorization checks.

The Edge Function setting named “Verify JWT with legacy secret”
is disabled because authentication is checked inside the functions
using the current Supabase runtime.

## Security model

Sensitive tables have Row Level Security enabled.

Anonymous website visitors cannot directly insert, update, or delete
protected table rows.

Student booking, lookup, cancellation, availability, school-year
display, and schedule-change display use narrowly scoped secure
functions.

Administrator functions:

- Reject anonymous callers
- Require a signed-in account
- Confirm that the account is an active Writing Lab administrator
- Perform only the operation for which they were created

Consultants can view only appointments assigned to their consultant
identity.

Booking references are available to the matching student when the
correct email is also supplied, and to active administrators.

## Beginning a new school year

Use the administrator website:

1. Create the new school year.
2. Enter the first and last student days.
3. Generate Monday–Wednesday dates.
4. Remove holidays, testing days, and other closures.
5. Add special dates and student-facing notes.
6. Make the new school year active.
7. Confirm the correct year appears on student and consultant pages.
8. Confirm active consultants have the correct weekly shifts.
9. Test one booking and cancellation before opening scheduling.

Do not generate dates twice for the same school year.

## Leadership transition

Before the current technical owner leaves:

1. Create the incoming administrator’s website account.
2. Confirm the incoming administrator can use every routine control.
3. Keep the outgoing administrator active until the handoff passes.
4. Invite at least one trusted long-term technical custodian to the
   GitHub repository.
5. Invite that custodian to the Supabase organization or project
   using official collaborator controls.
6. Confirm the custodian can access GitHub Pages settings, Supabase
   tables, authentication, Edge Functions, and project settings.
7. Enable appropriate account security, including two-factor
   authentication where available.
8. Do not transfer access by sharing personal passwords.
9. Deactivate outgoing website access after the handoff is complete.

Routine organization officers and teachers do not need technical
access unless they are also designated as technical custodians.

## Known limitations

- Houston ISD Google single sign-on is not enabled.
- Students are instructed to use Houston ISD email addresses.
- Email format is checked, but ownership is not verified.
- Confirmation, reminder, and cancellation emails are not sent.
- Students must save their booking reference.
- Administrators can retrieve lost booking references after
  confirming student information.
- Booking opens 14 calendar days ahead.
- Schedule-change notices cover the same upcoming window.

Email notifications could be added later using an approved
transactional email provider and a secure server-side function.

## Repository files

Student interface:

- `index.html`
- `student.js`
- `cancel.js`
- `schedule-changes.js`

Consultant interface:

- `consultant.html`
- `consultant.js`
- `consultant-appointments.js`

Administrator interface:

- `admin.html`
- `admin.js`
- `admin-roles.js`
- `admin-consultants.js`
- `admin-administrators.js`
- `admin-calendar.js`
- `admin-slot-closures.js`
- `admin-passwords.js`
- `admin-appointments.js`
- `admin-shifts.js`
- `admin-guide.html`

Account security:

- `change-password.html`
- `change-password.js`

Design:

- `styles.css`
- `branding.css`
- `staff.css`
- `admin.css`
- `lamar-texans-logo.png`
- `lamar-bull-logo.png`

## Recovery notes

Saved SQL Editor queries are development history only. Deleting a
saved query does not undo database changes that already ran.

Before major database or security changes:

1. Record the intended change.
2. Export or back up relevant data using the available Supabase
   tools.
3. Test with temporary records.
4. Verify Row Level Security and function permissions afterward.
5. Remove temporary records when the test passes.

Never disable Row Level Security as a troubleshooting shortcut on a
production table.
