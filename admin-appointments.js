// Lamar Writing Lab administrator appointment controls.
const appointmentManagementClient =
  window.writingLabAdminClient;

const appointmentManagementList =
  document.getElementById(
    "appointment-management-list"
  );

const appointmentManagementMessage =
  document.getElementById(
    "appointment-management-message"
  );

const appointmentManagementRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

appointmentManagementRefreshButton.addEventListener(
  "click",
  loadAppointmentManagement
);

appointmentManagementClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearAppointmentManagement();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(
        loadAppointmentManagement,
        0
      );
    }
  }
);

initializeAppointmentManagement();

async function initializeAppointmentManagement() {
  const { data, error } =
    await appointmentManagementClient.auth.getSession();

  if (error) {
    showAppointmentManagementMessage(
      `Appointment management could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadAppointmentManagement();
  }
}

async function loadAppointmentManagement() {
  showAppointmentManagementMessage(
    "Loading upcoming appointments..."
  );

  const [
    appointmentsResult,
    shiftsResult,
    consultantsResult
  ] = await Promise.all([
    appointmentManagementClient.rpc(
      "admin_get_upcoming_appointments"
    ),

    appointmentManagementClient
      .from("consultant_shifts")
      .select(
        "id, consultant_id, shift_template_id"
      ),

    appointmentManagementClient
      .from("consultants")
      .select("id, name, active")
  ]);

  const results = [
    appointmentsResult,
    shiftsResult,
    consultantsResult
  ];

  const failedResult =
    results.find(
      (result) => result.error
    );

  if (failedResult) {
    showAppointmentManagementMessage(
      `Appointments could not be loaded: ${
        failedResult.error.message
      }`,
      true
    );

    return;
  }

  renderAppointmentManagement(
    appointmentsResult.data,
    shiftsResult.data,
    consultantsResult.data
  );
}

function renderAppointmentManagement(
  appointments,
  shifts,
  consultants
) {
  appointmentManagementList.replaceChildren();

  if (appointments.length === 0) {
    showAppointmentManagementMessage(
      "There are no upcoming appointments to manage."
    );

    return;
  }

  const shiftMap =
    new Map(
      shifts.map(
        (shift) => [
          shift.id,
          shift
        ]
      )
    );

  const consultantMap =
    new Map(
      consultants.map(
        (consultant) => [
          consultant.id,
          consultant
        ]
      )
    );

  for (const appointment of appointments) {
    const assignedShift =
      shiftMap.get(
        appointment.consultant_shift_id
      );

    const assignedConsultant =
      assignedShift
        ? consultantMap.get(
            assignedShift.consultant_id
          )
        : null;

    const section =
      document.createElement("section");

    section.className =
      "managed-appointment";

    section.setAttribute(
      "aria-labelledby",
      `manage-appointment-${appointment.id}`
    );

    const heading =
      document.createElement("h4");

    heading.id =
      `manage-appointment-${appointment.id}`;

    heading.textContent =
      `${formatManagedAppointmentDate(
        appointment.appointment_date
      )}, ${formatManagedAppointmentTime(
        appointment.appointment_start_time
      )}`;

    const studentSummary =
      document.createElement("p");

    studentSummary.textContent =
      `${appointment.student_name} — ${
        appointment.student_email
      }`;

    const consultantSummary =
      document.createElement("p");

    consultantSummary.textContent =
      `Assigned consultant: ${
        assignedConsultant?.name ||
        "Unknown consultant"
      }`;

    const referenceContainer =
      createBookingReferenceDisplay(
        appointment
      );

    const actions =
      document.createElement("div");

    actions.className =
      "appointment-actions";

    const reassignButton =
      createReassignAppointmentButton(
        appointment
      );

    const cancelButton =
      createCancelAppointmentButton(
        appointment
      );

    actions.append(
      reassignButton,
      cancelButton
    );

    section.append(
      heading,
      studentSummary,
      consultantSummary,
      referenceContainer,
      actions
    );

    appointmentManagementList.append(
      section
    );
  }

  showAppointmentManagementMessage(
    `${appointments.length} upcoming ${
      appointments.length === 1
        ? "appointment"
        : "appointments"
    } available to manage.`
  );
}

function createBookingReferenceDisplay(
  appointment
) {
  const container =
    document.createElement("div");

  container.className =
    "admin-booking-reference";

  const label =
    document.createElement("strong");

  label.textContent =
    "Booking reference";

  const code =
    document.createElement("code");

  code.textContent =
    appointment.booking_reference;

  const copyButton =
    document.createElement("button");

  copyButton.type = "button";
  copyButton.textContent =
    "Copy booking reference";

  copyButton.addEventListener(
    "click",
    async () => {
      const copied =
        await copyBookingReference(
          appointment.booking_reference
        );

      if (copied) {
        copyButton.textContent = "Copied";

        showAppointmentManagementMessage(
          `The booking reference for ${appointment.student_name} was copied.`
        );

        setTimeout(
          () => {
            copyButton.textContent =
              "Copy booking reference";
          },
          2000
        );

        return;
      }

      showAppointmentManagementMessage(
        "The booking reference could not be copied automatically. Select and copy the displayed reference.",
        true
      );
    }
  );

  container.append(
    label,
    code,
    copyButton
  );

  return container;
}

async function copyBookingReference(
  bookingReference
) {
  try {
    await navigator.clipboard.writeText(
      bookingReference
    );

    return true;
  } catch (error) {
    return copyTextWithSelection(
      bookingReference
    );
  }
}

function copyTextWithSelection(text) {
  const temporaryInput =
    document.createElement("textarea");

  temporaryInput.value = text;

  temporaryInput.setAttribute(
    "readonly",
    ""
  );

  temporaryInput.style.position =
    "fixed";

  temporaryInput.style.opacity = "0";

  document.body.append(
    temporaryInput
  );

  temporaryInput.select();

  let copied = false;

  try {
    copied =
      document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  temporaryInput.remove();

  return copied;
}

function createReassignAppointmentButton(
  appointment
) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.textContent =
    "Reassign automatically";

  button.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          `Automatically move ${appointment.student_name}'s appointment to another available consultant?`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      button.textContent =
        "Reassigning...";

      showAppointmentManagementMessage(
        "Finding another available consultant..."
      );

      const { data, error } =
        await appointmentManagementClient.rpc(
          "admin_reassign_appointment",
          {
            p_appointment_id:
              appointment.id
          }
        );

      button.disabled = false;

      button.textContent =
        "Reassign automatically";

      if (error) {
        showAppointmentManagementMessage(
          `The appointment could not be reassigned: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAppointmentDisplays();

      showAppointmentManagementMessage(
        `The appointment was reassigned to ${data}.`
      );
    }
  );

  return button;
}

function createCancelAppointmentButton(
  appointment
) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.textContent =
    "Cancel appointment";

  button.addEventListener(
    "click",
    async () => {
      const reason =
        window.prompt(
          `Enter an optional cancellation reason for ${appointment.student_name}. Select Cancel to keep the appointment.`,
          ""
        );

      if (reason === null) {
        return;
      }

      const confirmed =
        window.confirm(
          `Cancel ${appointment.student_name}'s appointment on ${formatManagedAppointmentDate(
            appointment.appointment_date
          )}?`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      button.textContent =
        "Cancelling...";

      showAppointmentManagementMessage(
        "Cancelling the appointment..."
      );

      const { error } =
        await appointmentManagementClient.rpc(
          "admin_cancel_appointment",
          {
            p_appointment_id:
              appointment.id,
            p_reason:
              reason.trim()
          }
        );

      button.disabled = false;

      button.textContent =
        "Cancel appointment";

      if (error) {
        showAppointmentManagementMessage(
          `The appointment could not be cancelled: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAppointmentDisplays();

      showAppointmentManagementMessage(
        "The appointment was cancelled and its slot is available again."
      );
    }
  );

  return button;
}

async function refreshAppointmentDisplays() {
  await loadAppointmentManagement();

  if (
    typeof loadDashboard === "function"
  ) {
    await loadDashboard();
  }
}

function formatManagedAppointmentDate(
  dateText
) {
  const date =
    new Date(
      `${dateText}T12:00:00Z`
    );

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

function formatManagedAppointmentTime(
  timeText
) {
  const [hourText, minuteText] =
    timeText.split(":");

  const hour24 =
    Number(hourText);

  const minute =
    Number(minuteText);

  const period =
    hour24 >= 12 ? "PM" : "AM";

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
}

function clearAppointmentManagement() {
  appointmentManagementList.replaceChildren();

  appointmentManagementMessage.textContent =
    "";
}

function showAppointmentManagementMessage(
  message,
  isError = false
) {
  appointmentManagementMessage.textContent =
    message;

  appointmentManagementMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
