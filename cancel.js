const cancellationClient =
  window.writingLabSupabaseClient;

const cancellationForm =
  document.getElementById(
    "cancellation-form"
  );

const cancellationReference =
  document.getElementById(
    "cancellation-reference"
  );

const cancellationEmail =
  document.getElementById(
    "cancellation-email"
  );

const lookupButton =
  document.getElementById(
    "cancel-button"
  );

const cancellationMessage =
  document.getElementById(
    "cancellation-message"
  );

const appointmentLookupResult =
  document.getElementById(
    "appointment-lookup-result"
  );

const appointmentLookupSummary =
  document.getElementById(
    "appointment-lookup-summary"
  );

const confirmCancellationButton =
  document.getElementById(
    "confirm-cancellation-button"
  );

let foundAppointment = null;

cancellationForm.addEventListener(
  "submit",
  findAppointment
);

confirmCancellationButton.addEventListener(
  "click",
  cancelFoundAppointment
);

cancellationReference.addEventListener(
  "input",
  clearFoundAppointment
);

cancellationEmail.addEventListener(
  "input",
  clearFoundAppointment
);

async function findAppointment(event) {
  event.preventDefault();

  clearFoundAppointment();

  const bookingReference =
    cancellationReference.value.trim();

  const email =
    cancellationEmail.value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(bookingReference)) {
    showCancellationMessage(
      "Enter the complete booking reference exactly as it appeared in your confirmation.",
      true
    );

    cancellationReference.focus();
    return;
  }

  if (!email) {
    showCancellationMessage(
      "Enter the Houston ISD email address used to book the appointment.",
      true
    );

    cancellationEmail.focus();
    return;
  }

  lookupButton.disabled = true;
  lookupButton.textContent =
    "Finding appointment...";

  showCancellationMessage(
    "Looking for your appointment..."
  );

  const { data, error } =
    await cancellationClient.rpc(
      "get_student_appointment",
      {
        p_booking_reference:
          bookingReference,
        p_student_email: email
      }
    );

  lookupButton.disabled = false;
  lookupButton.textContent =
    "Find appointment";

  if (error) {
    showCancellationMessage(
      `The appointment could not be checked: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (!data || data.length === 0) {
    showCancellationMessage(
      "No appointment matched that booking reference and email address. Check both entries and try again.",
      true
    );

    return;
  }

  const appointment = data[0];

  foundAppointment = {
    bookingReference,
    email,
    appointment
  };

  appointmentLookupSummary.textContent =
    `${formatCancellationDate(
      appointment.appointment_date
    )}, ${formatCancellationTime(
      appointment.start_time
    )} for ${
      appointment.duration_minutes
    } minutes. Status: ${
      formatAppointmentStatus(
        appointment.status
      )
    }.`;

  appointmentLookupResult.hidden = false;

  if (appointment.status === "booked") {
    confirmCancellationButton.hidden = false;

    showCancellationMessage(
      "Appointment found. Review the details before cancelling."
    );

    confirmCancellationButton.focus();
  } else {
    confirmCancellationButton.hidden = true;

    showCancellationMessage(
      "This appointment is not currently booked."
    );
  }
}

async function cancelFoundAppointment() {
  if (!foundAppointment) {
    showCancellationMessage(
      "Find the appointment before cancelling it.",
      true
    );

    return;
  }

  const confirmed =
    window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

  if (!confirmed) {
    return;
  }

  confirmCancellationButton.disabled = true;
  confirmCancellationButton.textContent =
    "Cancelling...";

  showCancellationMessage(
    "Cancelling your appointment..."
  );

  const { data, error } =
    await cancellationClient.rpc(
      "cancel_appointment",
      {
        p_booking_reference:
          foundAppointment.bookingReference,
        p_student_email:
          foundAppointment.email
      }
    );

  confirmCancellationButton.disabled = false;
  confirmCancellationButton.textContent =
    "Cancel this appointment";

  if (error) {
    showCancellationMessage(
      `The appointment could not be cancelled: ${
        error.message
      }`,
      true
    );

    return;
  }

  const cancellation =
    data?.[0];

  if (!cancellation) {
    showCancellationMessage(
      "The cancellation could not be confirmed. Reload the page and check the appointment again.",
      true
    );

    return;
  }

  appointmentLookupSummary.textContent =
    `Cancelled: ${formatCancellationDate(
      cancellation.cancelled_appointment_date
    )}, ${formatCancellationTime(
      cancellation.cancelled_start_time
    )}.`;

  confirmCancellationButton.hidden = true;

  foundAppointment = null;
  cancellationForm.reset();

  showCancellationMessage(
    "Your appointment was cancelled successfully."
  );

  document
    .getElementById("reload-button")
    .click();
}

function clearFoundAppointment() {
  foundAppointment = null;

  appointmentLookupResult.hidden = true;
  confirmCancellationButton.hidden = true;
  appointmentLookupSummary.textContent = "";
}

function showCancellationMessage(
  message,
  isError = false
) {
  cancellationMessage.textContent =
    message;

  cancellationMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatAppointmentStatus(status) {
  if (status === "booked") {
    return "Booked";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return status;
}

function formatCancellationDate(dateText) {
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

function formatCancellationTime(timeText) {
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
