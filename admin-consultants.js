const consultantManagementClient =
  window.writingLabAdminClient;

const consultantManagementList =
  document.getElementById(
    "consultant-management-list"
  );

const consultantManagementMessage =
  document.getElementById(
    "consultant-management-message"
  );

const consultantManagementRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

consultantManagementRefreshButton.addEventListener(
  "click",
  loadConsultantManagement
);

consultantManagementClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearConsultantManagement();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(loadConsultantManagement, 0);
    }
  }
);

initializeConsultantManagement();

async function initializeConsultantManagement() {
  const { data, error } =
    await consultantManagementClient.auth.getSession();

  if (error) {
    showConsultantManagementMessage(
      `Consultant management could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadConsultantManagement();
  }
}

async function loadConsultantManagement() {
  showConsultantManagementMessage(
    "Loading consultant controls..."
  );

  const [
    consultantsResult,
    assignmentsResult,
    templatesResult,
    schoolYearsResult
  ] = await Promise.all([
    consultantManagementClient
      .from("consultants")
      .select(
        "id, name, email, user_id, active"
      )
      .order("name"),

    consultantManagementClient
      .from("consultant_shifts")
      .select(
        "id, consultant_id, shift_template_id, school_year_id"
      ),

    consultantManagementClient
      .from("shift_templates")
      .select(
        "id, day_of_week, start_time, duration_minutes"
      ),

    consultantManagementClient
      .from("school_years")
      .select("id, name, active")
  ]);

  const results = [
    consultantsResult,
    assignmentsResult,
    templatesResult,
    schoolYearsResult
  ];

  const failedResult =
    results.find((result) => result.error);

  if (failedResult) {
    showConsultantManagementMessage(
      `Consultant controls could not be loaded: ${
        failedResult.error.message
      }`,
      true
    );

    return;
  }

  const activeSchoolYear =
    schoolYearsResult.data.find(
      (schoolYear) => schoolYear.active
    );

  renderConsultantManagement(
    consultantsResult.data,
    assignmentsResult.data,
    templatesResult.data,
    activeSchoolYear
  );
}

function renderConsultantManagement(
  consultants,
  assignments,
  templates,
  activeSchoolYear
) {
  consultantManagementList.replaceChildren();

  if (consultants.length === 0) {
    showConsultantManagementMessage(
      "No consultants are available to manage."
    );

    return;
  }

  const sortedTemplates =
    sortConsultantTemplates(templates);

  for (const consultant of consultants) {
    const consultantSection =
      document.createElement("section");

    consultantSection.setAttribute(
      "aria-labelledby",
      `manage-consultant-${consultant.id}`
    );

    const heading =
      document.createElement("h4");

    heading.id =
      `manage-consultant-${consultant.id}`;

    heading.textContent = consultant.name;

    const accountSummary =
      document.createElement("p");

    accountSummary.textContent = [
      consultant.email || "No email",
      consultant.active
        ? "Active"
        : "Inactive",
      consultant.user_id
        ? "Login connected"
        : "No login"
    ].join(" — ");

    const nameForm =
      createConsultantNameForm(consultant);

    const statusButton =
      createConsultantStatusButton(consultant);

    consultantSection.append(
      heading,
      accountSummary,
      nameForm,
      statusButton
    );

    if (!activeSchoolYear) {
      const missingYearMessage =
        document.createElement("p");

      missingYearMessage.textContent =
        "No active school year is configured.";

      consultantSection.append(
        missingYearMessage
      );
    } else {
      const consultantAssignments =
        new Set(
          assignments
            .filter(
              (assignment) =>
                assignment.consultant_id ===
                  consultant.id &&
                assignment.school_year_id ===
                  activeSchoolYear.id
            )
            .map(
              (assignment) =>
                assignment.shift_template_id
            )
        );

      const shiftForm =
        createConsultantShiftForm(
          consultant,
          sortedTemplates,
          consultantAssignments,
          activeSchoolYear
        );

      consultantSection.append(shiftForm);
    }

    consultantSection.append(
      document.createElement("hr")
    );

    consultantManagementList.append(
      consultantSection
    );
  }

  const consultantWord =
    consultants.length === 1
      ? "consultant"
      : "consultants";

  showConsultantManagementMessage(
    `${consultants.length} ${consultantWord} available to manage.`
  );
}

function createConsultantNameForm(consultant) {
  const form =
    document.createElement("form");

  const label =
    document.createElement("label");

  const input =
    document.createElement("input");

  const button =
    document.createElement("button");

  const inputId =
    `consultant-name-${consultant.id}`;

  label.htmlFor = inputId;
  label.textContent = "Display name";

  input.id = inputId;
  input.type = "text";
  input.value = consultant.name;
  input.maxLength = 100;
  input.required = true;

  button.type = "submit";
  button.textContent = "Save name";

  form.append(
    label,
    document.createElement("br"),
    input,
    document.createTextNode(" "),
    button
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      button.disabled = true;
      button.textContent = "Saving...";

      showConsultantManagementMessage(
        `Updating ${consultant.name}...`
      );

      const { error } =
        await consultantManagementClient.rpc(
          "admin_update_consultant_name",
          {
            p_consultant_id: consultant.id,
            p_name: input.value.trim()
          }
        );

      button.disabled = false;
      button.textContent = "Save name";

      if (error) {
        showConsultantManagementMessage(
          `The consultant name could not be updated: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAllConsultantDisplays();

      showConsultantManagementMessage(
        "The consultant name was updated."
      );
    }
  );

  return form;
}

function createConsultantStatusButton(consultant) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.textContent =
    consultant.active
      ? "Deactivate consultant"
      : "Reactivate consultant";

  button.addEventListener(
    "click",
    async () => {
      const newStatus = !consultant.active;

      const actionWord =
        newStatus ? "reactivate" : "deactivate";

      const confirmed =
        window.confirm(
          `Are you sure you want to ${actionWord} ${consultant.name}?`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      showConsultantManagementMessage(
        `${newStatus ? "Reactivating" : "Deactivating"} ${
          consultant.name
        }...`
      );

      const { error } =
        await consultantManagementClient.rpc(
          "admin_set_consultant_active",
          {
            p_consultant_id: consultant.id,
            p_active: newStatus
          }
        );

      button.disabled = false;

      if (error) {
        showConsultantManagementMessage(
          `The consultant status could not be changed: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAllConsultantDisplays();

      showConsultantManagementMessage(
        `${consultant.name} is now ${
          newStatus ? "active" : "inactive"
        }.`
      );
    }
  );

  return button;
}

function createConsultantShiftForm(
  consultant,
  templates,
  selectedShiftIds,
  activeSchoolYear
) {
  const form =
    document.createElement("form");

  const fieldset =
    document.createElement("fieldset");

  const legend =
    document.createElement("legend");

  legend.textContent =
    `Weekly shifts for ${activeSchoolYear.name}`;

  fieldset.append(legend);

  for (const template of templates) {
    const option =
      document.createElement("p");

    const checkbox =
      document.createElement("input");

    const label =
      document.createElement("label");

    const checkboxId =
      `admin-consultant-${consultant.id}-shift-${template.id}`;

    checkbox.id = checkboxId;
    checkbox.type = "checkbox";
    checkbox.name =
      `consultant-${consultant.id}-shift`;
    checkbox.value = String(template.id);

    checkbox.checked =
      selectedShiftIds.has(template.id);

    label.htmlFor = checkboxId;

    label.textContent =
      ` ${template.day_of_week}, ${
        formatConsultantManagementTimeRange(
          template.start_time,
          template.duration_minutes
        )
      }`;

    option.append(checkbox, label);
    fieldset.append(option);
  }

  const saveShiftsButton =
    document.createElement("button");

  saveShiftsButton.type = "submit";
  saveShiftsButton.textContent =
    "Save weekly shifts";

  form.append(fieldset, saveShiftsButton);

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const selectedIds =
        Array.from(
          form.querySelectorAll(
            'input[type="checkbox"]:checked'
          )
        ).map(
          (checkbox) =>
            Number(checkbox.value)
        );

      saveShiftsButton.disabled = true;
      saveShiftsButton.textContent =
        "Saving shifts...";

      showConsultantManagementMessage(
        `Saving ${consultant.name}'s shifts...`
      );

      const { data, error } =
        await consultantManagementClient.rpc(
          "admin_set_consultant_shifts",
          {
            p_consultant_id: consultant.id,
            p_shift_template_ids: selectedIds
          }
        );

      saveShiftsButton.disabled = false;
      saveShiftsButton.textContent =
        "Save weekly shifts";

      if (error) {
        showConsultantManagementMessage(
          `The weekly shifts could not be saved: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAllConsultantDisplays();

      const savedCount =
        Array.isArray(data)
          ? data.length
          : selectedIds.length;

      const slotWord =
        savedCount === 1 ? "slot" : "slots";

      showConsultantManagementMessage(
        `${consultant.name} now has ${savedCount} weekly ${slotWord}.`
      );
    }
  );

  return form;
}

async function refreshAllConsultantDisplays() {
  await loadConsultantManagement();

  if (typeof loadDashboard === "function") {
    await loadDashboard();
  }
}

function sortConsultantTemplates(templates) {
  const dayOrder = new Map([
    ["Monday", 1],
    ["Tuesday", 2],
    ["Wednesday", 3],
    ["Thursday", 4],
    ["Friday", 5],
    ["Saturday", 6],
    ["Sunday", 7]
  ]);

  return [...templates].sort(
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
}

function formatConsultantManagementTimeRange(
  startTime,
  durationMinutes
) {
  const [hourText, minuteText] =
    startTime.split(":");

  const startMinutes =
    Number(hourText) * 60 +
    Number(minuteText);

  const endMinutes =
    startMinutes + durationMinutes;

  return `${
    formatConsultantManagementMinutes(
      startMinutes
    )
  }–${
    formatConsultantManagementMinutes(
      endMinutes
    )
  }`;
}

function formatConsultantManagementMinutes(
  totalMinutes
) {
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

function clearConsultantManagement() {
  consultantManagementList.replaceChildren();
  consultantManagementMessage.textContent = "";
}

function showConsultantManagementMessage(
  message,
  isError = false
) {
  consultantManagementMessage.textContent =
    message;

  consultantManagementMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
