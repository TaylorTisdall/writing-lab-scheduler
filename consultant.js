const SUPABASE_URL =
  "https://mdnyzlzaarzozbmqhecz.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnl6bHphYXJ6b3pibXFoZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTU5NzgsImV4cCI6MjA5OTczMTk3OH0.FYJgBDOhmqg516ApoPAqWezMIaSIHseoKCcUcU6m-To";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

window.writingLabConsultantClient = supabaseClient;
const loginSection =
  document.getElementById("login-section");

const scheduleSection =
  document.getElementById("schedule-section");

const loginForm =
  document.getElementById("login-form");

const scheduleForm =
  document.getElementById("schedule-form");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const loginButton =
  document.getElementById("login-button");

const saveButton =
  document.getElementById("save-button");

const signOutButton =
  document.getElementById("sign-out-button");

const welcomeMessage =
  document.getElementById("welcome-message");

const schoolYearMessage =
  document.getElementById("school-year-message");

const shiftOptions =
  document.getElementById("shift-options");

const statusMessage =
  document.getElementById("status-message");

loginForm.addEventListener("submit", signIn);
scheduleForm.addEventListener("submit", saveAvailability);
signOutButton.addEventListener("click", signOut);

initializePage();

async function initializePage() {
  showStatus("Checking sign-in status...");

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    showLogin();

    showStatus(
      `The sign-in status could not be checked: ${error.message}`,
      true
    );

    return;
  }

  if (data.session) {
    await loadSchedule();
    return;
  }

  showLogin();
  showStatus("");
}

async function signIn(event) {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  showStatus("Signing in...");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    passwordInput.value = "";

    await loadSchedule();
  } catch (error) {
    showLogin();

    showStatus(
      `Sign-in failed: ${error.message}`,
      true
    );
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  }
}

async function loadSchedule() {
  showSchedule();
  showStatus("Loading your schedule...");
  shiftOptions.replaceChildren();

  const [
    consultantResult,
    schoolYearResult,
    templatesResult,
    assignmentsResult
  ] = await Promise.all([
    supabaseClient
      .from("consultants")
      .select("id, name")
      .maybeSingle(),

    supabaseClient
      .from("school_years")
      .select("id, name, start_date, end_date")
      .eq("active", true)
      .maybeSingle(),

    supabaseClient
      .from("shift_templates")
      .select(
        "id, day_of_week, start_time, duration_minutes"
      ),

    supabaseClient
      .from("consultant_shifts")
      .select("shift_template_id")
  ]);

  const results = [
    consultantResult,
    schoolYearResult,
    templatesResult,
    assignmentsResult
  ];

  const failedResult =
    results.find((result) => result.error);

  if (failedResult) {
    showStatus(
      `The schedule could not be loaded: ${
        failedResult.error.message
      }`,
      true
    );

    return;
  }

  if (!consultantResult.data) {
    showStatus(
      "This login is not connected to an active consultant.",
      true
    );

    return;
  }

  if (!schoolYearResult.data) {
    showStatus(
      "No active school year is available.",
      true
    );

    return;
  }

  const selectedShiftIds = new Set(
    assignmentsResult.data.map(
      (assignment) => assignment.shift_template_id
    )
  );

  welcomeMessage.textContent =
    `Signed in as ${consultantResult.data.name}.`;

  schoolYearMessage.textContent =
    `School year: ${schoolYearResult.data.name}`;

  renderShiftOptions(
    templatesResult.data,
    selectedShiftIds
  );

  showStatus("Your current availability is loaded.");
}

function renderShiftOptions(
  templates,
  selectedShiftIds
) {
  const dayOrder = new Map([
    ["Monday", 1],
    ["Tuesday", 2],
    ["Wednesday", 3],
    ["Thursday", 4],
    ["Friday", 5],
    ["Saturday", 6],
    ["Sunday", 7]
  ]);

  const sortedTemplates = [...templates].sort(
    (first, second) => {
      const dayDifference =
        dayOrder.get(first.day_of_week) -
        dayOrder.get(second.day_of_week);

      if (dayDifference !== 0) {
        return dayDifference;
      }

      return first.start_time.localeCompare(
        second.start_time
      );
    }
  );

  let currentDay = "";
  let daySection = null;

  for (const template of sortedTemplates) {
    if (template.day_of_week !== currentDay) {
      currentDay = template.day_of_week;

      daySection = document.createElement("section");

      const dayHeading =
        document.createElement("h3");

      dayHeading.textContent = currentDay;

      daySection.append(dayHeading);
      shiftOptions.append(daySection);
    }

    const optionContainer =
      document.createElement("p");

    const checkbox =
      document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.name = "shift";
    checkbox.value = String(template.id);
    checkbox.id = `shift-${template.id}`;
    checkbox.checked =
      selectedShiftIds.has(template.id);

    const label =
      document.createElement("label");

    label.htmlFor = checkbox.id;

    label.textContent =
      ` ${formatTimeRange(
        template.start_time,
        template.duration_minutes
      )}`;

    optionContainer.append(checkbox, label);
    daySection.append(optionContainer);
  }
}

async function saveAvailability(event) {
  event.preventDefault();

  const selectedShiftIds = Array.from(
    document.querySelectorAll(
      'input[name="shift"]:checked'
    )
  ).map((checkbox) => Number(checkbox.value));

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  showStatus("Saving your availability...");

  try {
    const { data, error } =
      await supabaseClient.rpc(
        "set_my_consultant_shifts",
        {
          p_shift_template_ids: selectedShiftIds
        }
      );

    if (error) {
      throw error;
    }

    const numberSaved = data.length;
    const slotWord =
      numberSaved === 1 ? "slot" : "slots";

    showStatus(
      `Availability saved: ${numberSaved} weekly ${slotWord}.`
    );
  } catch (error) {
    showStatus(
      `Availability could not be saved: ${error.message}`,
      true
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save availability";
  }
}

async function signOut() {
  signOutButton.disabled = true;
  showStatus("Signing out...");

  const { error } =
    await supabaseClient.auth.signOut();

  signOutButton.disabled = false;

  if (error) {
    showStatus(
      `Sign-out failed: ${error.message}`,
      true
    );

    return;
  }

  loginForm.reset();
  shiftOptions.replaceChildren();
  welcomeMessage.textContent = "";
  schoolYearMessage.textContent = "";

  showLogin();
  showStatus("You have signed out.");
  emailInput.focus();
}

function showLogin() {
  loginSection.hidden = false;
  scheduleSection.hidden = true;
}

function showSchedule() {
  loginSection.hidden = true;
  scheduleSection.hidden = false;
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatTimeRange(startTime, durationMinutes) {
  const [hourText, minuteText] =
    startTime.split(":");

  const startMinutes =
    Number(hourText) * 60 + Number(minuteText);

  const endMinutes =
    startMinutes + durationMinutes;

  return `${formatMinutes(startMinutes)}–${
    formatMinutes(endMinutes)
  }`;
}

function formatMinutes(totalMinutes) {
  const normalizedMinutes =
    totalMinutes % (24 * 60);

  const hour24 =
    Math.floor(normalizedMinutes / 60);

  const minute =
    normalizedMinutes % 60;

  const period =
    hour24 >= 12 ? "PM" : "AM";

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(
    2,
    "0"
  )} ${period}`;
}
