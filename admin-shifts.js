const shiftManagementClient =
  window.writingLabAdminClient;

const createShiftTemplateForm =
  document.getElementById(
    "create-shift-template-form"
  );

const newShiftDay =
  document.getElementById(
    "new-shift-day"
  );

const newShiftStartTime =
  document.getElementById(
    "new-shift-start-time"
  );

const createShiftTemplateButton =
  document.getElementById(
    "create-shift-template-button"
  );

const createShiftTemplateMessage =
  document.getElementById(
    "create-shift-template-message"
  );

const shiftTemplateManagementList =
  document.getElementById(
    "shift-template-management-list"
  );

const shiftTemplateManagementMessage =
  document.getElementById(
    "shift-template-management-message"
  );

const shiftManagementRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

createShiftTemplateForm.addEventListener(
  "submit",
  createShiftTemplate
);

shiftManagementRefreshButton.addEventListener(
  "click",
  loadShiftTemplateManagement
);

shiftManagementClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearShiftTemplateManagement();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(
        loadShiftTemplateManagement,
        0
      );
    }
  }
);

initializeShiftTemplateManagement();

async function initializeShiftTemplateManagement() {
  const { data, error } =
    await shiftManagementClient.auth.getSession();

  if (error) {
    showShiftTemplateManagementMessage(
      `Shift management could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadShiftTemplateManagement();
  }
}

async function loadShiftTemplateManagement() {
  showShiftTemplateManagementMessage(
    "Loading shift times..."
  );

  const [
    templatesResult,
    assignmentsResult
  ] = await Promise.all([
    shiftManagementClient
      .from("shift_templates")
      .select(
        "id, day_of_week, start_time, duration_minutes"
      ),

    shiftManagementClient
      .from("consultant_shifts")
      .select(
        "id, shift_template_id"
      )
  ]);

  if (templatesResult.error) {
    showShiftTemplateManagementMessage(
      `Shift times could not be loaded: ${
        templatesResult.error.message
      }`,
      true
    );

    return;
  }

  if (assignmentsResult.error) {
    showShiftTemplateManagementMessage(
      `Shift assignments could not be loaded: ${
        assignmentsResult.error.message
      }`,
      true
    );

    return;
  }

  renderShiftTemplateManagement(
    templatesResult.data,
    assignmentsResult.data
  );
}

function renderShiftTemplateManagement(
  templates,
  assignments
) {
  shiftTemplateManagementList.replaceChildren();

  if (templates.length === 0) {
    showShiftTemplateManagementMessage(
      "No shift times are stored."
    );

    return;
  }

  const sortedTemplates =
    sortAdminShiftTemplates(templates);

  let currentDay = "";
  let daySection = null;

  for (const template of sortedTemplates) {
    if (template.day_of_week !== currentDay) {
      currentDay =
        template.day_of_week;

      daySection =
        document.createElement("section");

      const dayHeading =
        document.createElement("h4");

      dayHeading.textContent =
        currentDay;

      daySection.append(dayHeading);

      shiftTemplateManagementList.append(
        daySection
      );
    }

    const assignmentCount =
      assignments.filter(
        (assignment) =>
          assignment.shift_template_id ===
          template.id
      ).length;

    const row =
      document.createElement("p");

    const description =
      document.createElement("span");

    description.textContent =
      `${formatAdminShiftTimeRange(
        template.start_time,
        template.duration_minutes
      )} — ${assignmentCount} consultant ${
        assignmentCount === 1
          ? "assignment"
          : "assignments"
      } `;

    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";

    if (assignmentCount > 0) {
      deleteButton.textContent =
        "Cannot delete assigned shift";

      deleteButton.disabled = true;
    } else {
      deleteButton.textContent =
        "Delete unused shift";

      deleteButton.addEventListener(
        "click",
        async () => {
          const confirmed =
            window.confirm(
              `Delete the unused ${template.day_of_week} ${formatAdminShiftTimeRange(
                template.start_time,
                template.duration_minutes
              )} shift?`
            );

          if (!confirmed) {
            return;
          }

          deleteButton.disabled = true;

          showShiftTemplateManagementMessage(
            "Deleting the unused shift..."
          );

          const { error } =
            await shiftManagementClient.rpc(
              "admin_delete_unused_shift_template",
              {
                p_shift_template_id:
                  template.id
              }
            );

          deleteButton.disabled = false;

          if (error) {
            showShiftTemplateManagementMessage(
              `The shift could not be deleted: ${
                error.message
              }`,
              true
            );

            return;
          }

          await refreshShiftTemplateDisplays();

          showShiftTemplateManagementMessage(
            "The unused shift was deleted."
          );
        }
      );
    }

    row.append(
      description,
      deleteButton
    );

    daySection.append(row);
  }

  showShiftTemplateManagementMessage(
    `${templates.length} shift ${
      templates.length === 1
        ? "time"
        : "times"
    } stored.`
  );
}

async function createShiftTemplate(event) {
  event.preventDefault();

  createShiftTemplateButton.disabled = true;
  createShiftTemplateButton.textContent =
    "Adding shift...";

  showCreateShiftTemplateMessage(
    "Adding the shift time..."
  );

  const { error } =
    await shiftManagementClient.rpc(
      "admin_create_shift_template",
      {
        p_day_of_week:
          newShiftDay.value,
        p_start_time:
          newShiftStartTime.value,
        p_duration_minutes: 30
      }
    );

  createShiftTemplateButton.disabled = false;
  createShiftTemplateButton.textContent =
    "Add 30-minute shift";

  if (error) {
    showCreateShiftTemplateMessage(
      `The shift could not be added: ${
        error.message
      }`,
      true
    );

    return;
  }

  const createdDay =
    newShiftDay.value;

  const createdTime =
    newShiftStartTime.value;

  createShiftTemplateForm.reset();

  await refreshShiftTemplateDisplays();

  showCreateShiftTemplateMessage(
    `${createdDay} at ${
      formatAdminShiftTime(
        createdTime
      )
    } was added.`
  );
}

async function refreshShiftTemplateDisplays() {
  await loadShiftTemplateManagement();

  if (
    typeof loadConsultantManagement ===
    "function"
  ) {
    await loadConsultantManagement();
  }

  if (typeof loadDashboard === "function") {
    await loadDashboard();
  }
}

function sortAdminShiftTemplates(
  templates
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

function formatAdminShiftTimeRange(
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
    formatAdminShiftMinutes(
      startMinutes
    )
  }–${
    formatAdminShiftMinutes(
      endMinutes
    )
  }`;
}

function formatAdminShiftTime(timeText) {
  const [hourText, minuteText] =
    timeText.split(":");

  return formatAdminShiftMinutes(
    Number(hourText) * 60 +
    Number(minuteText)
  );
}

function formatAdminShiftMinutes(
  totalMinutes
) {
  const normalizedMinutes =
    totalMinutes % (24 * 60);

  const hour24 =
    Math.floor(
      normalizedMinutes / 60
    );

  const minute =
    normalizedMinutes % 60;

  const period =
    hour24 >= 12 ? "PM" : "AM";

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
}

function clearShiftTemplateManagement() {
  shiftTemplateManagementList.replaceChildren();

  shiftTemplateManagementMessage.textContent =
    "";

  createShiftTemplateMessage.textContent =
    "";

  createShiftTemplateForm.reset();
}

function showCreateShiftTemplateMessage(
  message,
  isError = false
) {
  createShiftTemplateMessage.textContent =
    message;

  createShiftTemplateMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showShiftTemplateManagementMessage(
  message,
  isError = false
) {
  shiftTemplateManagementMessage.textContent =
    message;

  shiftTemplateManagementMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
