const slotClosureClient =
  window.writingLabAdminClient;

const slotClosureAnchor =
  document.getElementById(
    "lab-date-management-list"
  )?.closest("section");

const slotClosureSection =
  document.createElement("section");

slotClosureSection.id =
  "slot-closure-management";

slotClosureSection.setAttribute(
  "aria-labelledby",
  "slot-closure-heading"
);

const slotClosureHeading =
  document.createElement("h2");

slotClosureHeading.id =
  "slot-closure-heading";

slotClosureHeading.textContent =
  "Date-specific schedule changes";

const slotClosureInstructions =
  document.createElement("p");

slotClosureInstructions.textContent =
  "Close one appointment time on a particular lab date. The reason will appear in the student schedule-changes notice.";

const slotClosureForm =
  document.createElement("form");

slotClosureForm.id =
  "slot-closure-form";

const slotClosureDateLabel =
  document.createElement("label");

slotClosureDateLabel.htmlFor =
  "slot-closure-date";

slotClosureDateLabel.textContent =
  "Lab date";

const slotClosureDateInput =
  document.createElement("input");

slotClosureDateInput.id =
  "slot-closure-date";

slotClosureDateInput.type = "date";
slotClosureDateInput.required = true;

const slotClosureTimeLabel =
  document.createElement("label");

slotClosureTimeLabel.htmlFor =
  "slot-closure-time";

slotClosureTimeLabel.textContent =
  "Appointment time";

const slotClosureTimeSelect =
  document.createElement("select");

slotClosureTimeSelect.id =
  "slot-closure-time";

slotClosureTimeSelect.required = true;

const slotClosureReasonLabel =
  document.createElement("label");

slotClosureReasonLabel.htmlFor =
  "slot-closure-reason";

slotClosureReasonLabel.textContent =
  "Message shown to students";

const slotClosureReasonInput =
  document.createElement("input");

slotClosureReasonInput.id =
  "slot-closure-reason";

slotClosureReasonInput.type = "text";
slotClosureReasonInput.maxLength = 200;
slotClosureReasonInput.required = true;

slotClosureReasonInput.placeholder =
  "Example: Only the first half of the lab period is available.";

const slotClosureSubmitButton =
  document.createElement("button");

slotClosureSubmitButton.type = "submit";
slotClosureSubmitButton.textContent =
  "Close selected slot";

slotClosureForm.append(
  slotClosureDateLabel,
  document.createElement("br"),
  slotClosureDateInput,
  document.createElement("br"),
  slotClosureTimeLabel,
  document.createElement("br"),
  slotClosureTimeSelect,
  document.createElement("br"),
  slotClosureReasonLabel,
  document.createElement("br"),
  slotClosureReasonInput,
  document.createElement("br"),
  slotClosureSubmitButton
);

const slotClosureFormMessage =
  document.createElement("p");

slotClosureFormMessage.id =
  "slot-closure-form-message";

slotClosureFormMessage.setAttribute(
  "role",
  "status"
);

slotClosureFormMessage.setAttribute(
  "aria-live",
  "polite"
);

const storedClosuresHeading =
  document.createElement("h3");

storedClosuresHeading.textContent =
  "Stored slot closures";

const storedClosuresList =
  document.createElement("div");

storedClosuresList.id =
  "stored-slot-closures";

const storedClosuresMessage =
  document.createElement("p");

storedClosuresMessage.id =
  "stored-slot-closures-message";

storedClosuresMessage.setAttribute(
  "role",
  "status"
);

storedClosuresMessage.setAttribute(
  "aria-live",
  "polite"
);

slotClosureSection.append(
  slotClosureHeading,
  slotClosureInstructions,
  slotClosureForm,
  slotClosureFormMessage,
  storedClosuresHeading,
  storedClosuresList,
  storedClosuresMessage
);

if (slotClosureAnchor) {
  slotClosureAnchor.insertAdjacentElement(
    "afterend",
    slotClosureSection
  );
}

let slotClosureSchoolYear = null;
let slotClosureDates = [];
let slotClosureTemplates = [];
let storedSlotClosures = [];

slotClosureForm.addEventListener(
  "submit",
  closeSelectedSlot
);

slotClosureDateInput.addEventListener(
  "change",
  populateSlotTimeOptions
);

const slotClosureRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

slotClosureRefreshButton.addEventListener(
  "click",
  loadSlotClosureManagement
);

slotClosureClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearSlotClosureManagement();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(
        loadSlotClosureManagement,
        0
      );
    }
  }
);

initializeSlotClosureManagement();

async function initializeSlotClosureManagement() {
  const { data, error } =
    await slotClosureClient.auth.getSession();

  if (error) {
    showStoredClosuresMessage(
      `Schedule changes could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadSlotClosureManagement();
  }
}

async function loadSlotClosureManagement() {
  const previousDate =
    slotClosureDateInput.value;

  showStoredClosuresMessage(
    "Loading date-specific schedule changes..."
  );

  const [
    schoolYearsResult,
    datesResult,
    templatesResult,
    closuresResult
  ] = await Promise.all([
    slotClosureClient
      .from("school_years")
      .select(
        "id, name, start_date, end_date, active"
      )
      .eq("active", true)
      .limit(1),

    slotClosureClient
      .from("lab_open_dates")
      .select(
        "id, school_year_id, lab_date, note"
      )
      .order("lab_date"),

    slotClosureClient
      .from("shift_templates")
      .select(
        "id, day_of_week, start_time, duration_minutes"
      )
      .order("start_time"),

    slotClosureClient
      .from("lab_slot_closures")
      .select(
        "id, lab_open_date_id, shift_template_id, reason"
      )
  ]);

  const failedResult = [
    schoolYearsResult,
    datesResult,
    templatesResult,
    closuresResult
  ].find((result) => result.error);

  if (failedResult) {
    showStoredClosuresMessage(
      `Schedule changes could not be loaded: ${
        failedResult.error.message
      }`,
      true
    );

    return;
  }

  slotClosureSchoolYear =
    schoolYearsResult.data[0] || null;

  slotClosureTemplates =
    templatesResult.data;

  storedSlotClosures =
    closuresResult.data;

  if (!slotClosureSchoolYear) {
    slotClosureDates = [];
    slotClosureDateInput.value = "";
    slotClosureTimeSelect.replaceChildren();
    storedClosuresList.replaceChildren();

    showStoredClosuresMessage(
      "No active school year is configured.",
      true
    );

    return;
  }

  slotClosureDates =
    datesResult.data.filter(
      (labDate) =>
        labDate.school_year_id ===
        slotClosureSchoolYear.id
    );

  slotClosureDateInput.min =
    slotClosureSchoolYear.start_date;

  slotClosureDateInput.max =
    slotClosureSchoolYear.end_date;

  const previousDateStillExists =
    slotClosureDates.some(
      (labDate) =>
        labDate.lab_date === previousDate
    );

  if (previousDateStillExists) {
    slotClosureDateInput.value =
      previousDate;
  } else {
    const today =
      getLocalDateText();

    const nextDate =
      slotClosureDates.find(
        (labDate) =>
          labDate.lab_date >= today
      ) || slotClosureDates[0];

    slotClosureDateInput.value =
      nextDate?.lab_date || "";
  }

  populateSlotTimeOptions();
  renderStoredSlotClosures();
}

function populateSlotTimeOptions() {
  slotClosureTimeSelect.replaceChildren();

  const selectedDate =
    slotClosureDateInput.value;

  const storedDate =
    slotClosureDates.find(
      (labDate) =>
        labDate.lab_date ===
        selectedDate
    );

  if (!storedDate) {
    const option =
      document.createElement("option");

    option.value = "";
    option.textContent =
      "This is not a stored lab date";

    slotClosureTimeSelect.append(option);
    slotClosureTimeSelect.disabled = true;
    slotClosureSubmitButton.disabled = true;
    return;
  }

  const weekday =
    getCalendarWeekday(selectedDate);

  const matchingTemplates =
    slotClosureTemplates.filter(
      (template) =>
        template.day_of_week === weekday
    );

  if (matchingTemplates.length === 0) {
    const option =
      document.createElement("option");

    option.value = "";
    option.textContent =
      "No shift times exist for this day";

    slotClosureTimeSelect.append(option);
    slotClosureTimeSelect.disabled = true;
    slotClosureSubmitButton.disabled = true;
    return;
  }

  for (const template of matchingTemplates) {
    const option =
      document.createElement("option");

    option.value = String(template.id);

    option.textContent =
      `${formatSlotClosureTime(
        template.start_time
      )}–${formatSlotClosureEndTime(
        template.start_time,
        template.duration_minutes
      )}`;

    const alreadyClosed =
      storedSlotClosures.some(
        (closure) =>
          closure.lab_open_date_id ===
            storedDate.id &&
          closure.shift_template_id ===
            template.id
      );

    if (alreadyClosed) {
      option.textContent +=
        " — Already closed";
      option.disabled = true;
    }

    slotClosureTimeSelect.append(option);
  }

  const availableOption =
    Array.from(
      slotClosureTimeSelect.options
    ).find((option) => !option.disabled);

  if (availableOption) {
    slotClosureTimeSelect.value =
      availableOption.value;

    slotClosureTimeSelect.disabled = false;
    slotClosureSubmitButton.disabled = false;
  } else {
    slotClosureTimeSelect.disabled = true;
    slotClosureSubmitButton.disabled = true;
  }
}

async function closeSelectedSlot(event) {
  event.preventDefault();

  const selectedDate =
    slotClosureDates.find(
      (labDate) =>
        labDate.lab_date ===
        slotClosureDateInput.value
    );

  if (!selectedDate) {
    showSlotClosureFormMessage(
      "Choose a stored lab date.",
      true
    );

    return;
  }

  const templateId =
    Number(slotClosureTimeSelect.value);

  if (!templateId) {
    showSlotClosureFormMessage(
      "Choose an appointment time.",
      true
    );

    return;
  }

  const reason =
    slotClosureReasonInput.value.trim();

  if (!reason) {
    showSlotClosureFormMessage(
      "Enter the message students should see.",
      true
    );

    return;
  }

  slotClosureSubmitButton.disabled = true;
  slotClosureSubmitButton.textContent =
    "Closing slot...";

  showSlotClosureFormMessage(
    "Saving the schedule change..."
  );

  const { error } =
    await slotClosureClient.rpc(
      "admin_close_lab_slot",
      {
        p_lab_open_date_id:
          selectedDate.id,
        p_shift_template_id:
          templateId,
        p_reason: reason
      }
    );

  slotClosureSubmitButton.disabled = false;
  slotClosureSubmitButton.textContent =
    "Close selected slot";

  if (error) {
    showSlotClosureFormMessage(
      `The slot could not be closed: ${
        error.message
      }`,
      true
    );

    return;
  }

  slotClosureReasonInput.value = "";

  await loadSlotClosureManagement();

  showSlotClosureFormMessage(
    "The slot was closed and the student notice was saved."
  );
}

function renderStoredSlotClosures() {
  storedClosuresList.replaceChildren();

  const activeDateIds =
    new Set(
      slotClosureDates.map(
        (labDate) => labDate.id
      )
    );

  const activeClosures =
    storedSlotClosures
      .filter(
        (closure) =>
          activeDateIds.has(
            closure.lab_open_date_id
          )
      )
      .sort(compareStoredClosures);

  if (activeClosures.length === 0) {
    showStoredClosuresMessage(
      `No individual slots are closed for ${slotClosureSchoolYear.name}.`
    );

    return;
  }

  for (const closure of activeClosures) {
    const labDate =
      slotClosureDates.find(
        (storedDate) =>
          storedDate.id ===
            closure.lab_open_date_id
      );

    const template =
      slotClosureTemplates.find(
        (storedTemplate) =>
          storedTemplate.id ===
            closure.shift_template_id
      );

    if (!labDate || !template) {
      continue;
    }

    const container =
      document.createElement("p");

    const description =
      document.createElement("span");

    description.textContent =
      `${formatSlotClosureDate(
        labDate.lab_date
      )}, ${formatSlotClosureTime(
        template.start_time
      )} — ${closure.reason} `;

    const reopenButton =
      document.createElement("button");

    reopenButton.type = "button";
    reopenButton.textContent =
      "Reopen slot";

    reopenButton.addEventListener(
      "click",
      async () => {
        const confirmed =
          window.confirm(
            `Reopen the ${formatSlotClosureTime(
              template.start_time
            )} slot on ${formatSlotClosureDate(
              labDate.lab_date
            )}?`
          );

        if (!confirmed) {
          return;
        }

        reopenButton.disabled = true;

        showStoredClosuresMessage(
          "Reopening the slot..."
        );

        const { error } =
          await slotClosureClient.rpc(
            "admin_reopen_lab_slot",
            {
              p_closure_id:
                closure.id
            }
          );

        if (error) {
          reopenButton.disabled = false;

          showStoredClosuresMessage(
            `The slot could not be reopened: ${
              error.message
            }`,
            true
          );

          return;
        }

        await loadSlotClosureManagement();

        showStoredClosuresMessage(
          "The slot was reopened."
        );
      }
    );

    container.append(
      description,
      reopenButton
    );

    storedClosuresList.append(container);
  }

  showStoredClosuresMessage(
    `${activeClosures.length} individual ${
      activeClosures.length === 1
        ? "slot is"
        : "slots are"
    } closed for ${slotClosureSchoolYear.name}.`
  );
}

function compareStoredClosures(
  firstClosure,
  secondClosure
) {
  const firstDate =
    slotClosureDates.find(
      (labDate) =>
        labDate.id ===
          firstClosure.lab_open_date_id
    );

  const secondDate =
    slotClosureDates.find(
      (labDate) =>
        labDate.id ===
          secondClosure.lab_open_date_id
    );

  const dateComparison =
    String(
      firstDate?.lab_date || ""
    ).localeCompare(
      String(
        secondDate?.lab_date || ""
      )
    );

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const firstTemplate =
    slotClosureTemplates.find(
      (template) =>
        template.id ===
          firstClosure.shift_template_id
    );

  const secondTemplate =
    slotClosureTemplates.find(
      (template) =>
        template.id ===
          secondClosure.shift_template_id
    );

  return String(
    firstTemplate?.start_time || ""
  ).localeCompare(
    String(
      secondTemplate?.start_time || ""
    )
  );
}

function getCalendarWeekday(dateText) {
  const weekdayNumber =
    new Date(
      `${dateText}T12:00:00Z`
    ).getUTCDay();

  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ][weekdayNumber];
}

function getLocalDateText() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const partMap =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value
        ]
      )
    );

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function formatSlotClosureDate(dateText) {
  const date =
    new Date(`${dateText}T12:00:00Z`);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}

function formatSlotClosureTime(timeText) {
  const [hourText, minuteText] =
    timeText.split(":");

  const hour24 = Number(hourText);
  const minute = Number(minuteText);

  const period =
    hour24 >= 12 ? "PM" : "AM";

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
}

function formatSlotClosureEndTime(
  startTime,
  durationMinutes
) {
  const [hourText, minuteText] =
    startTime.split(":");

  const totalMinutes =
    Number(hourText) * 60 +
    Number(minuteText) +
    durationMinutes;

  const endHour =
    Math.floor(totalMinutes / 60) % 24;

  const endMinute =
    totalMinutes % 60;

  return formatSlotClosureTime(
    `${String(endHour).padStart(
      2,
      "0"
    )}:${String(endMinute).padStart(
      2,
      "0"
    )}:00`
  );
}

function clearSlotClosureManagement() {
  slotClosureSchoolYear = null;
  slotClosureDates = [];
  slotClosureTemplates = [];
  storedSlotClosures = [];

  slotClosureDateInput.value = "";
  slotClosureTimeSelect.replaceChildren();
  slotClosureReasonInput.value = "";
  storedClosuresList.replaceChildren();

  slotClosureFormMessage.textContent = "";
  storedClosuresMessage.textContent = "";
}

function showSlotClosureFormMessage(
  message,
  isError = false
) {
  slotClosureFormMessage.textContent =
    message;

  slotClosureFormMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showStoredClosuresMessage(
  message,
  isError = false
) {
  storedClosuresMessage.textContent =
    message;

  storedClosuresMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

window.loadSlotClosureManagement =
  loadSlotClosureManagement;
