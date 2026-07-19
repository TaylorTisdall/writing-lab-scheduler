const cancellationClient =
  window.writingLabSupabaseClient;

const cancellationForm =
  document.getElementById("cancellation-form");

const cancellationReference =
  document.getElementById("cancellation-reference");

const cancellationEmail =
  document.getElementById("cancellation-email");

const cancelButton =
  document.getElementById("cancel-button");

const cancellationMessage =
  document.getElementById("cancellation-message");

cancellationForm.addEventListener(
  "submit",
  cancelAppointment
);

async function cancelAppointment(event) {
  event.preventDefault();

  const bookingReference =
    cancellationReference.value.trim();

  const email =
    cancellationEmail.value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(bookingReference)) {
    showCancellationMessage(
      "Enter the complete booking reference.",
      true
    );

    cancellationReference.focus();
    return;
  }

  cancelButton.disabled = true;
  cancelButton.textContent = "Cancelling...";

  showCancellationMessage(
    "Cancelling your appointment..."
  );

  const { data, error } =
    await cancellationClient.rpc(
      "cancel_appointment",
      {
        p_booking_reference: bookingReference,
        p_student_email: email
      }
    );

  cancelButton.disabled = false;
  cancelButton.textContent = "Cancel appointment";

  if (error) {
    showCancellationMessage(
      `The appointment could not be cancelled: ${
        error.message
      }`,
      true
    );

    return;
  }

  const cancellation = data[0];

  showCancellationMessage(
    `Appointment cancelled: ${
      formatCancellationDate(
        cancellation.cancelled_appointment_date
      )
    }, ${
      formatCancellationTime(
        cancellation.cancelled_start_time
      )
    }.`
  );

  cancellationForm.reset();

  document
    .getElementById("reload-button")
    .click();
}

function showCancellationMessage(
  message,
  isError = false
) {
  cancellationMessage.textContent = message;

  cancellationMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatCancellationDate(dateText) {
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

function formatCancellationTime(timeText) {
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
