const scheduleChangesClient =
  window.writingLabSupabaseClient;

const scheduleChangesSection =
  document.getElementById(
    "schedule-changes-section"
  );

const scheduleChangesList =
  document.getElementById(
    "schedule-changes-list"
  );

const scheduleChangesMessage =
  document.getElementById(
    "schedule-changes-message"
  );

const activeSchoolYearText =
  document.getElementById(
    "active-school-year"
  );

loadPublicScheduleInformation();

async function loadPublicScheduleInformation() {
  const [
    changesResult,
    schoolYearResult
  ] = await Promise.all([
    scheduleChangesClient.rpc(
      "get_upcoming_schedule_changes"
    ),

    scheduleChangesClient.rpc(
      "get_public_active_school_year"
    )
  ]);

  renderActiveSchoolYear(
    schoolYearResult
  );

  if (changesResult.error) {
    scheduleChangesSection.hidden = false;

    showScheduleChangesMessage(
      "Upcoming schedule changes could not be loaded. Reload the page before booking.",
      true
    );

    return;
  }

  renderScheduleChanges(
    changesResult.data || []
  );
}

function renderActiveSchoolYear(result) {
  if (
    result.error ||
    !result.data ||
    result.data.length === 0
  ) {
    activeSchoolYearText.textContent =
      "Active school year unavailable";

    return;
  }

  activeSchoolYearText.textContent =
    `School year: ${
      result.data[0].school_year_name
    }`;
}

function renderScheduleChanges(changes) {
  scheduleChangesList.replaceChildren();

  if (changes.length === 0) {
    scheduleChangesSection.hidden = true;
    scheduleChangesMessage.textContent = "";
    return;
  }

  scheduleChangesSection.hidden = false;

  const list =
    document.createElement("ul");

  for (const change of changes) {
    const item =
      document.createElement("li");

    const dateText =
      formatScheduleChangeDate(
        change.change_date
      );

    const timeText =
      change.start_time
        ? ` at ${formatScheduleChangeTime(
            change.start_time
          )}`
        : "";

    item.textContent =
      `${dateText}${timeText}: ${
        change.message
      }`;

    list.append(item);
  }

  scheduleChangesList.append(list);

  showScheduleChangesMessage(
    "Review these changes before choosing an appointment."
  );
}

function showScheduleChangesMessage(
  message,
  isError = false
) {
  scheduleChangesMessage.textContent =
    message;

  scheduleChangesMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatScheduleChangeDate(dateText) {
  const date =
    new Date(`${dateText}T12:00:00Z`);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  ).format(date);
}

function formatScheduleChangeTime(timeText) {
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
