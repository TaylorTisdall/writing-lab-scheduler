const ADMIN_SUPABASE_URL =
  "https://mdnyzlzaarzozbmqhecz.supabase.co";

const ADMIN_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnl6bHphYXJ6b3pibXFoZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTU5NzgsImV4cCI6MjA5OTczMTk3OH0.FYJgBDOhmqg516ApoPAqWezMIaSIHseoKCcUcU6m-To";

const adminClient = window.supabase.createClient(
  ADMIN_SUPABASE_URL,
  ADMIN_SUPABASE_KEY
);

window.writingLabAdminClient = adminClient;

const loginSection =
  document.getElementById("admin-login-section");

const adminDashboard =
  document.getElementById("admin-dashboard");

const loginForm =
  document.getElementById("admin-login-form");

const emailInput =
  document.getElementById("admin-email");

const passwordInput =
  document.getElementById("admin-password");

const loginButton =
  document.getElementById("admin-login-button");

const refreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

const signOutButton =
  document.getElementById(
    "admin-sign-out-button"
  );

const schoolYearSummary =
  document.getElementById("school-year-summary");

const consultantList =
  document.getElementById(
    "admin-consultant-list"
  );

const calendarSummary =
  document.getElementById("calendar-summary");

const appointmentList =
  document.getElementById(
    "admin-appointment-list"
  );

const statusMessage =
  document.getElementById(
    "admin-status-message"
  );

loginForm.addEventListener("submit", signIn);
refreshButton.addEventListener(
  "click",
  loadDashboard
);
signOutButton.addEventListener("click", signOut);

initializeAdminPage();

async function initializeAdminPage() {
  showStatus("Checking sign-in status...");

  const { data, error } =
    await adminClient.auth.getSession();

  if (error) {
    showLogin();

    showStatus(
      `Sign-in status could not be checked: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await verifyAdministrator();
    return;
  }

  showLogin();
  showStatus("");
}

async function signIn(event) {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  const { error } =
    await adminClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

  loginButton.disabled = false;
  loginButton.textContent = "Sign in";
  passwordInput.value = "";

  if (error) {
    showLogin();

    showStatus(
      `Sign-in failed: ${error.message}`,
      true
    );

    return;
  }

  await verifyAdministrator();
}

async function verifyAdministrator() {
  showDashboard();
  refreshButton.disabled = true;

  showStatus(
    "Checking administrator access..."
  );

  const { data, error } =
    await adminClient.rpc(
      "is_writing_lab_admin"
    );

  if (error) {
    showStatus(
      `Administrator access could not be checked: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data !== true) {
    showStatus(
      "This account is not a Writing Lab administrator.",
      true
    );

    return;
  }

  const {
    data: passwordChangeRequired,
    error: passwordRequirementError
  } = await adminClient.rpc(
    "must_change_my_password"
  );

  if (passwordRequirementError) {
    showStatus(
      `The password requirement could not be checked: ${
        passwordRequirementError.message
      }`,
      true
    );

    return;
  }

  if (passwordChangeRequired === true) {
    window.location.href =
      "change-password.html";

    return;
  }

  refreshButton.disabled = false;
  await loadDashboard();
}

async function loadDashboard() {
  refreshButton.disabled = true;
  showStatus("Loading administrator dashboard...");

  const [
    consultantsResult,
    assignmentsResult,
    templatesResult,
    schoolYearsResult,
    labDatesResult,
    appointmentsResult
  ] = await Promise.all([
    adminClient
      .from("consultants")
      .select(
  "id, name, email, user_id, active"
)
      .order("name"),

    adminClient
      .from("consultant_shifts")
      .select(
        "id, consultant_id, shift_template_id, school_year_id"
      ),

    adminClient
      .from("shift_templates")
      .select(
        "id, day_of_week, start_time, duration_minutes"
      ),

    adminClient
      .from("school_years")
      .select(
        "id, name, start_date, end_date, active"
      ),

    adminClient
      .from("lab_open_dates")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      ),

    adminClient
      .from("appointments")
      .select(
        [
          "id",
          "student_name",
          "student_email",
          "consultant_shift_id",
          "appointment_date",
          "appointment_start_time",
          "status"
        ].join(",")
      )
      .eq("status", "booked")
      .order("appointment_date")
      .order("appointment_start_time")
  ]);

  refreshButton.disabled = false;

  const results = [
    consultantsResult,
    assignmentsResult,
    templatesResult,
    schoolYearsResult,
    labDatesResult,
    appointmentsResult
  ];

  const failedResult =
    results.find((result) => result.error);

  if (failedResult) {
    showStatus(
      `The dashboard could not be loaded: ${
        failedResult.error.message
      }`,
      true
    );

    return;
  }

  renderSchoolYear(schoolYearsResult.data);

  renderConsultants(
    consultantsResult.data,
    assignmentsResult.data
  );

  calendarSummary.textContent =
    `${labDatesResult.count} eligible lab dates are stored.`;

  renderAppointments(
    appointmentsResult.data,
    assignmentsResult.data,
    consultantsResult.data
  );

  showStatus("Administrator dashboard loaded.");
}

function renderSchoolYear(schoolYears) {
  const activeYear =
    schoolYears.find((year) => year.active);

  if (!activeYear) {
    schoolYearSummary.textContent =
      "No active school year is configured.";

    return;
  }

  schoolYearSummary.textContent =
    `${activeYear.name}: ${
      formatAdminDate(activeYear.start_date)
    } through ${
      formatAdminDate(activeYear.end_date)
    }.`;
}

function renderConsultants(
  consultants,
  assignments
) {
  consultantList.replaceChildren();

  if (consultants.length === 0) {
    consultantList.textContent =
      "No consultants are stored.";

    return;
  }

  const list =
    document.createElement("ul");

  for (const consultant of consultants) {
    const shiftCount =
      assignments.filter(
        (assignment) =>
          assignment.consultant_id ===
          consultant.id
      ).length;

    const item =
      document.createElement("li");

    const labels = [
      consultant.name,
      consultant.email || "No email",
      consultant.active
        ? "Active"
        : "Inactive",
      `${shiftCount} weekly ${
        shiftCount === 1 ? "slot" : "slots"
      }`,
      consultant.user_id
        ? "Login connected"
        : "No login"
    ];
  

    item.textContent = labels.join(" — ");
    list.append(item);
  }

  consultantList.append(list);
}

function renderAppointments(
  appointments,
  assignments,
  consultants
) {
  appointmentList.replaceChildren();

  if (appointments.length === 0) {
    appointmentList.textContent =
      "There are no upcoming appointments.";

    return;
  }

  const assignmentMap = new Map(
    assignments.map(
      (assignment) => [
        assignment.id,
        assignment.consultant_id
      ]
    )
  );

  const consultantMap = new Map(
    consultants.map(
      (consultant) => [
        consultant.id,
        consultant.name
      ]
    )
  );

  const list =
    document.createElement("ul");

  for (const appointment of appointments) {
    const consultantId =
      assignmentMap.get(
        appointment.consultant_shift_id
      );

    const consultantName =
      consultantMap.get(consultantId) ||
      "Unknown consultant";

    const item =
      document.createElement("li");

    item.textContent =
      `${formatAdminDate(
        appointment.appointment_date
      )}, ${formatAdminTime(
        appointment.appointment_start_time
      )} — ${appointment.student_name} (${
        appointment.student_email
      }) — ${consultantName}`;

    list.append(item);
  }

  appointmentList.append(list);
}

async function signOut() {
  signOutButton.disabled = true;

  const { error } =
    await adminClient.auth.signOut();

  signOutButton.disabled = false;

  if (error) {
    showStatus(
      `Sign-out failed: ${error.message}`,
      true
    );

    return;
  }

  loginForm.reset();
  clearDashboard();
  showLogin();
  emailInput.focus();
}

function clearDashboard() {
  schoolYearSummary.textContent = "";
  consultantList.replaceChildren();
  calendarSummary.textContent = "";
  appointmentList.replaceChildren();
  statusMessage.textContent = "";
}

function showLogin() {
  loginSection.hidden = false;
  adminDashboard.hidden = true;
}

function showDashboard() {
  loginSection.hidden = true;
  adminDashboard.hidden = false;
}

function showStatus(
  message,
  isError = false
) {
  statusMessage.textContent = message;

  statusMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatAdminDate(dateText) {
  const date =
    new Date(`${dateText}T00:00:00`);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}

function formatAdminTime(timeText) {
  const [hourText, minuteText] =
    timeText.split(":");

  const hour24 = Number(hourText);
  const minute = Number(minuteText);

  const period =
    hour24 >= 12 ? "PM" : "AM";

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(
    2,
    "0"
  )} ${period}`;
}
