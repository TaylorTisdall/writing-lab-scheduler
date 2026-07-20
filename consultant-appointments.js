const appointmentClient =
  window.writingLabConsultantClient;

const refreshAppointmentsButton =
  document.getElementById(
    "refresh-appointments-button"
  );

const appointmentList =
  document.getElementById("appointment-list");

const appointmentListMessage =
  document.getElementById(
    "appointment-list-message"
  );

refreshAppointmentsButton.addEventListener(
  "click",
  loadUpcomingAppointments
);

appointmentClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearAppointments();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(
        loadUpcomingAppointments,
        0
      );
    }
  }
);

initializeAppointments();

async function initializeAppointments() {
  const { data, error } =
    await appointmentClient.auth.getSession();

  if (error) {
    showAppointmentMessage(
      `Appointments could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadUpcomingAppointments();
  }
}

async function loadUpcomingAppointments() {
  refreshAppointmentsButton.disabled = true;

  appointmentList.replaceChildren();

  showAppointmentMessage(
    "Loading upcoming appointments..."
  );

  const { data, error } =
    await appointmentClient.rpc(
      "get_my_upcoming_appointments"
    );

  refreshAppointmentsButton.disabled = false;

  if (error) {
    showAppointmentMessage(
      `Appointments could not be loaded: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.length === 0) {
    showAppointmentMessage(
      "You have no upcoming appointments."
    );

    return;
  }

  const list =
    document.createElement("ul");

  for (const appointment of data) {
    const item =
      document.createElement("li");

    item.textContent =
      `${formatAppointmentDate(
        appointment.appointment_date
      )}, ${formatAppointmentTime(
        appointment.appointment_start_time
      )} — ${appointment.student_name} (${
        appointment.student_email
      })`;

    list.append(item);
  }

  appointmentList.append(list);

  const appointmentWord =
    data.length === 1
      ? "appointment"
      : "appointments";

  showAppointmentMessage(
    `${data.length} upcoming ${appointmentWord}.`
  );
}

function clearAppointments() {
  appointmentList.replaceChildren();
  appointmentListMessage.textContent = "";
}

function showAppointmentMessage(
  message,
  isError = false
) {
  appointmentListMessage.textContent = message;

  appointmentListMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatAppointmentDate(dateText) {
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

function formatAppointmentTime(timeText) {
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
