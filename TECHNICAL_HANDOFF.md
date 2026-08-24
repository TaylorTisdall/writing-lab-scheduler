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

Activity monitoring:

- A cron-job.org scheduled keepalive calls a read-only public
  database function every six hours
- Keepalive failures are configured to notify the technical owner
- This reduces the risk that the free Supabase project pauses for
  inactivity, but it is not an uptime guarantee

Supabase project reference:

`mdnyzlzaarzozbmqhecz`

The publishable key in frontend JavaScript is intentionally public.
It is protected by Row Level Security and secure database functions.

Never place a Supabase secret key or service-role key in GitHub,
frontend JavaScript, documentation, Google Sites, or the keepalive
job.

## Current operating configuration

Active school year:

- 2026–2027
- First student day: August 10, 2026
- Last student day: May 28, 2027

Regular Writing Lab schedule:

- Monday, 11:45 AM–12:15 PM
- Monday, 12:15 PM–12:45 PM
- Wednesday, 11:45 AM–12:15 PM
- Wednesday, 12:15 PM–12:45 PM
- Friday, 11:45 AM–12:15 PM
- Friday, 12:15 PM–12:45 PM

The stored lab calendar contains eligible school dates rather than
automatically treating every Monday–Wednesday–Friday as open.

The following Fridays are excluded according to the revised HISD
2026–2027 calendar:

- October 9, 2026 — staff professional development
- November 6, 2026 — staff professional development
- November 27, 2026 — recess
- December 25, 2026 — recess
- January 1, 2027 — holiday
- March 12, 2027 — recess
- March 26, 2027 — recess
- April 16, 2027 — staff professional development

These exclusions apply only to 2026–2027. For every later school
year, compare generated dates with the current official HISD
calendar before opening student booking.

Future Tuesday lab dates were removed when the operating schedule
changed. Past Tuesday dates remain as historical records and do not
create future availability.

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
3. Generate Monday–Wednesday–Friday dates.
4. Compare the generated dates with the current official HISD
   calendar.
5. Remove holidays, testing days, professional-development days,
   and other closures.
6. Add special dates and student-facing notes.
7. Make the new school year active.
8. Confirm the correct year appears on student and consultant pages.
9. Confirm active consultants have the correct weekly shifts.
10. Test one booking and cancellation before opening scheduling.

Do not generate dates twice for the same school year. Regenerating
after closed dates have been removed could restore dates that were
intentionally deleted.

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
7. Transfer access to the cron-job.org keepalive and its failure
   notifications to the technical custodian.
8. Confirm recent keepalive runs are successful and that the job
   remains scheduled every six hours.
9. Enable appropriate account security, including two-factor
   authentication where available.
10. Do not transfer access by sharing personal passwords.
11. Deactivate outgoing website access after the handoff is complete.

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
- A free Supabase project can pause for inactivity.
- The keepalive reduces this risk but does not guarantee uptime.

Email notifications could be added later using an approved
transactional email provider and a secure server-side function.

An appropriate paid Supabase plan can be used if guaranteed
protection from inactivity pausing is required.

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

Documentation:

- `admin-guide.html`
- `TECHNICAL_HANDOFF.md`

## Recovery notes

### Supabase inactivity pause

If the website cannot load database information:

1. Check the Supabase dashboard to determine whether the project is
   paused.
2. Restore or resume the project if necessary.
3. Test the student scheduler and administrator sign-in.
4. Check the cron-job.org keepalive execution history.
5. Confirm that the job still runs every six hours.
6. Confirm that failure notifications reach the current technical
   custodian.
7. Run a manual keepalive test and confirm that it succeeds.

The keepalive uses only a public, read-only database operation. Never
place a Supabase secret key or service-role key in the keepalive job.

A keepalive reduces the chance of an inactivity pause on the free
tier. Only an appropriate paid Supabase plan guarantees that the
project will not pause for inactivity.

### Database changes

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
