const calendarManagementClient =
  window.writingLabAdminClient;

const createSchoolYearForm =
  document.getElementById(
    "create-school-year-form"
  );

const newSchoolYearName =
  document.getElementById(
    "new-school-year-name"
  );

const newSchoolYearStart =
  document.getElementById(
    "new-school-year-start"
  );

const newSchoolYearEnd =
  document.getElementById(
    "new-school-year-end"
  );

const newSchoolYearActive =
  document.getElementById(
    "new-school-year-active"
  );

const createSchoolYearButton =
  document.getElementById(
    "create-school-year-button"
  );

const createSchoolYearMessage =
  document.getElementById(
    "create-school-year-message"
  );

const schoolYearManagementList =
  document.getElementById(
    "school-year-management-list"
  );

const schoolYearManagementMessage =
  document.getElementById(
    "school-year-management-message"
  );

const addLabDateForm =
  document.getElementById(
    "add-lab-date-form"
  );

const addLabDateSchoolYear =
  document.getElementById(
    "add-lab-date-school-year"
  );

const addLabDateValue =
  document.getElementById(
    "add-lab-date-value"
  );

const addLabDateNote =
  document.getElementById(
    "add-lab-date-note"
  );

const addLabDateButton =
  document.getElementById(
    "add-lab-date-button"
  );

const addLabDateMessage =
  document.getElementById(
    "add-lab-date-message"
  );

const labDateYearFilter =
  document.getElementById(
    "lab-date-year-filter"
  );

const labDateManagementList =
  document.getElementById(
    "lab-date-management-list"
  );

const labDateManagementMessage =
  document.getElementById(
    "lab-date-management-message"
  );

const calendarRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

let managedSchoolYears = [];
let managedLabDates = [];

createSchoolYearForm.addEventListener(
  "submit",
  createSchoolYear
);

addLabDateForm.addEventListener(
  "submit",
  addIndividualLabDate
);

addLabDateSchoolYear.addEventListener(
  "change",
  updateLabDateInputBounds
);

labDateYearFilter.addEventListener(
  "change",
  renderLabDateManagement
);

calendarRefreshButton.addEventListener(
  "click",
  loadCalendarManagement
);

calendarManagementClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearCalendarManagement();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(loadCalendarManagement, 0);
    }
  }
);

initializeCalendarManagement();

async function initializeCalendarManagement() {
  const { data, error } =
    await calendarManagementClient.auth.getSession();

  if (error) {
    showSchoolYearManagementMessage(
      `Calendar management could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadCalendarManagement();
  }
}

async function loadCalendarManagement() {
  showSchoolYearManagementMessage(
    "Loading school years..."
  );

  showLabDateManagementMessage(
    "Loading lab dates..."
  );

  const [
    schoolYearsResult,
    labDatesResult
  ] = await Promise.all([
    calendarManagementClient
      .from("school_years")
      .select(
        "id, name, start_date, end_date, active"
      )
      .order("start_date"),

    calendarManagementClient
      .from("lab_open_dates")
      .select(
        "id, school_year_id, lab_date, note"
      )
      .order("lab_date")
  ]);

  if (schoolYearsResult.error) {
    showSchoolYearManagementMessage(
      `School years could not be loaded: ${
        schoolYearsResult.error.message
      }`,
      true
    );

    return;
  }

  if (labDatesResult.error) {
    showLabDateManagementMessage(
      `Lab dates could not be loaded: ${
        labDatesResult.error.message
      }`,
      true
    );

    return;
  }

  managedSchoolYears =
    schoolYearsResult.data;

  managedLabDates =
    labDatesResult.data;

  populateSchoolYearSelectors();
  renderSchoolYearManagement();
  renderLabDateManagement();
}

function populateSchoolYearSelectors() {
  const previousAddYear =
    addLabDateSchoolYear.value;

  const previousFilterYear =
    labDateYearFilter.value;

  addLabDateSchoolYear.replaceChildren();
  labDateYearFilter.replaceChildren();

  for (const schoolYear of managedSchoolYears) {
    const addOption =
      document.createElement("option");

    addOption.value = String(schoolYear.id);
    addOption.textContent =
      `${schoolYear.name}${
        schoolYear.active ? " (Active)" : ""
      }`;

    addLabDateSchoolYear.append(addOption);

    const filterOption =
      document.createElement("option");

    filterOption.value =
      String(schoolYear.id);

    filterOption.textContent =
      `${schoolYear.name}${
        schoolYear.active ? " (Active)" : ""
      }`;

    labDateYearFilter.append(filterOption);
  }

  const activeSchoolYear =
    managedSchoolYears.find(
      (schoolYear) => schoolYear.active
    );

  const addYearStillExists =
    managedSchoolYears.some(
      (schoolYear) =>
        String(schoolYear.id) ===
        previousAddYear
    );

  const filterYearStillExists =
    managedSchoolYears.some(
      (schoolYear) =>
        String(schoolYear.id) ===
        previousFilterYear
    );

  if (addYearStillExists) {
    addLabDateSchoolYear.value =
      previousAddYear;
  } else if (activeSchoolYear) {
    addLabDateSchoolYear.value =
      String(activeSchoolYear.id);
  }

  if (filterYearStillExists) {
    labDateYearFilter.value =
      previousFilterYear;
  } else if (activeSchoolYear) {
    labDateYearFilter.value =
      String(activeSchoolYear.id);
  }

  updateLabDateInputBounds();
}

function updateLabDateInputBounds() {
  const selectedSchoolYear =
    managedSchoolYears.find(
      (schoolYear) =>
        String(schoolYear.id) ===
        addLabDateSchoolYear.value
    );

  if (!selectedSchoolYear) {
    addLabDateValue.removeAttribute("min");
    addLabDateValue.removeAttribute("max");
    return;
  }

  addLabDateValue.min =
    selectedSchoolYear.start_date;

  addLabDateValue.max =
    selectedSchoolYear.end_date;

  if (
    addLabDateValue.value &&
    (
      addLabDateValue.value <
        selectedSchoolYear.start_date ||
      addLabDateValue.value >
        selectedSchoolYear.end_date
    )
  ) {
    addLabDateValue.value = "";
  }
}

function renderSchoolYearManagement() {
  schoolYearManagementList.replaceChildren();

  if (managedSchoolYears.length === 0) {
    showSchoolYearManagementMessage(
      "No school years are stored."
    );

    return;
  }

  for (const schoolYear of managedSchoolYears) {
    const section =
      document.createElement("section");

    section.setAttribute(
      "aria-labelledby",
      `manage-school-year-${schoolYear.id}`
    );

    const heading =
      document.createElement("h4");

    heading.id =
      `manage-school-year-${schoolYear.id}`;

    heading.textContent =
      `${schoolYear.name}${
        schoolYear.active
          ? " — Active school year"
          : ""
      }`;

    const dateCount =
      managedLabDates.filter(
        (labDate) =>
          labDate.school_year_id ===
          schoolYear.id
      ).length;

    const summary =
      document.createElement("p");

    summary.textContent =
      `${formatCalendarDate(
        schoolYear.start_date
      )} through ${formatCalendarDate(
        schoolYear.end_date
      )} — ${dateCount} stored lab ${
        dateCount === 1 ? "date" : "dates"
      }.`;

    const detailsForm =
      createSchoolYearDetailsForm(
        schoolYear
      );

    section.append(
      heading,
      summary,
      detailsForm
    );

    if (!schoolYear.active) {
      const activateButton =
        createActivateSchoolYearButton(
          schoolYear
        );

      section.append(activateButton);
    }

    if (dateCount === 0) {
      const generateButton =
        createGenerateDatesButton(
          schoolYear
        );

      section.append(
        document.createTextNode(" "),
        generateButton
      );
    } else {
      const generatorMessage =
        document.createElement("p");

      generatorMessage.textContent =
        "Regular-date generation is disabled because this year already has stored dates.";

      section.append(generatorMessage);
    }
  if (
      !schoolYear.active &&
      dateCount === 0
    ) {
      const deleteButton =
        createDeleteSchoolYearButton(
          schoolYear
        );

      section.append(
        document.createTextNode(" "),
        deleteButton
      );
    }
    section.append(
      document.createElement("hr")
    );

    schoolYearManagementList.append(
      section
    );
  }

  showSchoolYearManagementMessage(
    `${managedSchoolYears.length} school ${
      managedSchoolYears.length === 1
        ? "year"
        : "years"
    } stored.`
  );
}

function createSchoolYearDetailsForm(
  schoolYear
) {
  const form =
    document.createElement("form");

  const nameLabel =
    document.createElement("label");

  const nameInput =
    document.createElement("input");

  const startLabel =
    document.createElement("label");

  const startInput =
    document.createElement("input");

  const endLabel =
    document.createElement("label");

  const endInput =
    document.createElement("input");

  const button =
    document.createElement("button");

  const nameId =
    `school-year-name-${schoolYear.id}`;

  const startId =
    `school-year-start-${schoolYear.id}`;

  const endId =
    `school-year-end-${schoolYear.id}`;

  nameLabel.htmlFor = nameId;
  nameLabel.textContent = "School year name";

  nameInput.id = nameId;
  nameInput.type = "text";
  nameInput.value = schoolYear.name;
  nameInput.maxLength = 50;
  nameInput.required = true;

  startLabel.htmlFor = startId;
  startLabel.textContent = "First student day";

  startInput.id = startId;
  startInput.type = "date";
  startInput.value = schoolYear.start_date;
  startInput.required = true;

  endLabel.htmlFor = endId;
  endLabel.textContent = "Last student day";

  endInput.id = endId;
  endInput.type = "date";
  endInput.value = schoolYear.end_date;
  endInput.required = true;

  button.type = "submit";
  button.textContent =
    "Save school year details";

  form.append(
    nameLabel,
    document.createElement("br"),
    nameInput,
    document.createElement("br"),
    startLabel,
    document.createElement("br"),
    startInput,
    document.createElement("br"),
    endLabel,
    document.createElement("br"),
    endInput,
    document.createElement("br"),
    button
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      button.disabled = true;
      button.textContent = "Saving...";

      showSchoolYearManagementMessage(
        `Updating ${schoolYear.name}...`
      );

      const { error } =
        await calendarManagementClient.rpc(
          "admin_update_school_year",
          {
            p_school_year_id:
              schoolYear.id,
            p_name:
              nameInput.value.trim(),
            p_start_date:
              startInput.value,
            p_end_date:
              endInput.value
          }
        );

      button.disabled = false;
      button.textContent =
        "Save school year details";

      if (error) {
        showSchoolYearManagementMessage(
          `The school year could not be updated: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshCalendarDisplays();

      showSchoolYearManagementMessage(
        "The school year details were updated."
      );
    }
  );

  return form;
}

function createActivateSchoolYearButton(
  schoolYear
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.textContent =
    "Make active school year";

  button.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          `Make ${schoolYear.name} the active school year? Student and consultant pages will use it immediately.`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      showSchoolYearManagementMessage(
        `Activating ${schoolYear.name}...`
      );

      const { error } =
        await calendarManagementClient.rpc(
          "admin_set_active_school_year",
          {
            p_school_year_id:
              schoolYear.id
          }
        );

      button.disabled = false;

      if (error) {
        showSchoolYearManagementMessage(
          `The school year could not be activated: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshCalendarDisplays();

      showSchoolYearManagementMessage(
        `${schoolYear.name} is now active.`
      );
    }
  );

  return button;
}

function createGenerateDatesButton(
  schoolYear
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.textContent =
    "Generate Monday–Wednesday dates";

  button.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          `Generate every Monday, Tuesday, and Wednesday in ${schoolYear.name}? This includes holidays, which must be removed afterward.`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;
      button.textContent =
        "Generating dates...";

      showSchoolYearManagementMessage(
        `Generating dates for ${schoolYear.name}...`
      );

      const { data, error } =
        await calendarManagementClient.rpc(
          "admin_generate_regular_lab_dates",
          {
            p_school_year_id:
              schoolYear.id
          }
        );

      button.disabled = false;
      button.textContent =
        "Generate Monday–Wednesday dates";

      if (error) {
        showSchoolYearManagementMessage(
          `Regular dates could not be generated: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshCalendarDisplays();

      showSchoolYearManagementMessage(
        `${data} regular lab dates were generated. Remove holidays and other closed dates before opening booking.`
      );
    }
  );

  return button;
}
function createDeleteSchoolYearButton(
  schoolYear
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.textContent =
    "Delete empty school year";

  button.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          `Permanently delete the empty school year ${schoolYear.name}?`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      showSchoolYearManagementMessage(
        `Deleting ${schoolYear.name}...`
      );

      const { error } =
        await calendarManagementClient.rpc(
          "admin_delete_empty_school_year",
          {
            p_school_year_id:
              schoolYear.id
          }
        );

      button.disabled = false;

      if (error) {
        showSchoolYearManagementMessage(
          `The school year could not be deleted: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshCalendarDisplays();

      showSchoolYearManagementMessage(
        `${schoolYear.name} was deleted.`
      );
    }
  );

  return button;
}

async function createSchoolYear(event) {
  event.preventDefault();

  if (
    newSchoolYearStart.value >
    newSchoolYearEnd.value
  ) {
    showCreateSchoolYearMessage(
      "The first student day must be on or before the last student day.",
      true
    );

    return;
  }

  createSchoolYearButton.disabled = true;
  createSchoolYearButton.textContent =
    "Creating school year...";

  showCreateSchoolYearMessage(
    "Creating the school year..."
  );

  const { error } =
    await calendarManagementClient.rpc(
      "admin_create_school_year",
      {
        p_name:
          newSchoolYearName.value.trim(),
        p_start_date:
          newSchoolYearStart.value,
        p_end_date:
          newSchoolYearEnd.value,
        p_make_active:
          newSchoolYearActive.checked
      }
    );

  createSchoolYearButton.disabled = false;
  createSchoolYearButton.textContent =
    "Create school year";

  if (error) {
    showCreateSchoolYearMessage(
      `The school year could not be created: ${
        error.message
      }`,
      true
    );

    return;
  }

  const createdName =
    newSchoolYearName.value.trim();

  createSchoolYearForm.reset();

  await refreshCalendarDisplays();

  showCreateSchoolYearMessage(
    `${createdName} was created.`
  );
}

async function addIndividualLabDate(event) {
  event.preventDefault();

  addLabDateButton.disabled = true;
  addLabDateButton.textContent =
    "Adding lab date...";

  showAddLabDateMessage(
    "Adding the lab date..."
  );

  const { error } =
    await calendarManagementClient.rpc(
      "admin_add_lab_open_date",
      {
        p_school_year_id:
          Number(addLabDateSchoolYear.value),
        p_lab_date:
          addLabDateValue.value,
        p_note:
          addLabDateNote.value.trim()
      }
    );

  addLabDateButton.disabled = false;
  addLabDateButton.textContent =
    "Add lab date";

  if (error) {
    showAddLabDateMessage(
      `The lab date could not be added: ${
        error.message
      }`,
      true
    );

    return;
  }

  addLabDateValue.value = "";
  addLabDateNote.value = "";

  await refreshCalendarDisplays();

  showAddLabDateMessage(
    "The lab date was saved."
  );
}

function renderLabDateManagement() {
  labDateManagementList.replaceChildren();

  const selectedSchoolYearId =
    Number(labDateYearFilter.value);

  const selectedSchoolYear =
    managedSchoolYears.find(
      (schoolYear) =>
        schoolYear.id ===
        selectedSchoolYearId
    );

  if (!selectedSchoolYear) {
    showLabDateManagementMessage(
      "Select a school year."
    );

    return;
  }

  const displayedDates =
    managedLabDates.filter(
      (labDate) =>
        labDate.school_year_id ===
        selectedSchoolYearId
    );

  if (displayedDates.length === 0) {
    showLabDateManagementMessage(
      `No lab dates are stored for ${selectedSchoolYear.name}.`
    );

    return;
  }

  let currentMonth = "";

  for (const labDate of displayedDates) {
    const monthHeadingText =
      formatCalendarMonth(
        labDate.lab_date
      );

    if (monthHeadingText !== currentMonth) {
      currentMonth = monthHeadingText;

      const monthHeading =
        document.createElement("h4");

      monthHeading.textContent =
        currentMonth;

      labDateManagementList.append(
        monthHeading
      );
    }

    const dateContainer =
      document.createElement("p");

    const dateText =
      document.createElement("span");

    dateText.textContent =
      `${formatCalendarDate(
        labDate.lab_date
      )}${
        labDate.note
          ? ` — ${labDate.note}`
          : ""
      } `;

    const removeButton =
      document.createElement("button");

    removeButton.type = "button";
    removeButton.textContent =
      "Remove date";

    removeButton.addEventListener(
      "click",
      async () => {
        const confirmed =
          window.confirm(
            `Remove ${formatCalendarDate(
              labDate.lab_date
            )} from the lab calendar?`
          );

        if (!confirmed) {
          return;
        }

        removeButton.disabled = true;

        showLabDateManagementMessage(
          `Removing ${formatCalendarDate(
            labDate.lab_date
          )}...`
        );

        const { error } =
          await calendarManagementClient.rpc(
            "admin_remove_lab_open_date",
            {
              p_lab_open_date_id:
                labDate.id
            }
          );

        removeButton.disabled = false;

        if (error) {
          showLabDateManagementMessage(
            `The lab date could not be removed: ${
              error.message
            }`,
            true
          );

          return;
        }

        await refreshCalendarDisplays();

        showLabDateManagementMessage(
          "The lab date was removed."
        );
      }
    );

    dateContainer.append(
      dateText,
      removeButton
    );

    labDateManagementList.append(
      dateContainer
    );
  }

  showLabDateManagementMessage(
    `${displayedDates.length} lab ${
      displayedDates.length === 1
        ? "date"
        : "dates"
    } stored for ${selectedSchoolYear.name}.`
  );
}

async function refreshCalendarDisplays() {
  await loadCalendarManagement();

  if (typeof loadDashboard === "function") {
    await loadDashboard();
  }
}

function formatCalendarDate(dateText) {
  const date =
    new Date(`${dateText}T00:00:00`);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}

function formatCalendarMonth(dateText) {
  const date =
    new Date(`${dateText}T00:00:00`);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  ).format(date);
}

function clearCalendarManagement() {
  managedSchoolYears = [];
  managedLabDates = [];

  schoolYearManagementList.replaceChildren();
  labDateManagementList.replaceChildren();
  addLabDateSchoolYear.replaceChildren();
  labDateYearFilter.replaceChildren();

  createSchoolYearMessage.textContent = "";
  schoolYearManagementMessage.textContent = "";
  addLabDateMessage.textContent = "";
  labDateManagementMessage.textContent = "";
}

function showCreateSchoolYearMessage(
  message,
  isError = false
) {
  createSchoolYearMessage.textContent =
    message;

  createSchoolYearMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showSchoolYearManagementMessage(
  message,
  isError = false
) {
  schoolYearManagementMessage.textContent =
    message;

  schoolYearManagementMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showAddLabDateMessage(
  message,
  isError = false
) {
  addLabDateMessage.textContent = message;

  addLabDateMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showLabDateManagementMessage(
  message,
  isError = false
) {
  labDateManagementMessage.textContent =
    message;

  labDateManagementMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
