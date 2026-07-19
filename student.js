const SUPABASE_URL =
  "https://mdnyzlzaarzozbmqhecz.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnl6bHphYXJ6b3pibXFoZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTU5NzgsImV4cCI6MjA5OTczMTk3OH0.FYJgBDOhmqg516ApoPAqWezMIaSIHseoKCcUcU6m-To";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const reloadButton =
  document.getElementById("reload-button");

const slotOptions =
  document.getElementById("slot-options");

const availabilityMessage =
  document.getElementById("availability-message");

const bookingSection =
  document.getElementById("booking-section");

const bookingForm =
  document.getElementById("booking-form");

const selectedTime =
  document.getElementById("selected-time");

const studentNameInput =
  document.getElementById("student-name");

const studentEmailInput =
  document.getElementById("student-email");

const bookButton =
  document.getElementById("book-button");

const bookingMessage =
  document.getElementById("booking-message");

const confirmationSection =
  document.getElementById("confirmation-section");

const confirmationMessage =
  document.getElementById("confirmation-message");

let availableSlots = [];
let selectedSlot = null;

reloadButton.addEventListener(
  "click",
  loadAvailability
);

bookingForm.addEventListener(
  "submit",
  bookAppointment
);

loadAvailability();

async function loadAvailability() {
  reloadButton.disabled = true;
  slotOptions.replaceChildren();
  bookingSection.hidden = true;
  selectedSlot = null;

  showAvailabilityMessage(
    "Loading available appointments..."
  );

  const { data, error } =
    await supabaseClient.rpc(
      "get_available_appointment_slots"
    );

  reloadButton.disabled = false;

  if (error) {
    showAvailabilityMessage(
      `Availability could not be loaded: ${error.message}`,
      true
    );

    return;
  }

  availableSlots = data;

  if (availableSlots.length === 0) {
    showAvailabilityMessage(
      "No appointments are available within the next 14 days."
    );

    return;
  }

  renderSlots();
  showAvailabilityMessage(
    "Select an available appointment time."
  );
}

function renderSlots() {
  let currentDate = "";
  let dateFieldset = null;

  availableSlots.forEach((slot, index) => {
    if (slot.appointment_date !== currentDate) {
      currentDate = slot.appointment_date;

      dateFieldset =
        document.createElement("fieldset");

      const legend =
        document.createElement("legend");

      legend.textContent =
        formatDate(slot.appointment_date);

      dateFieldset.append(legend);
      slotOptions.append(dateFieldset);
    }

    const optionContainer =
      document.createElement("p");

    const radio =
      document.createElement("input");

    radio.type = "radio";
    radio.name = "appointment-slot";
    radio.id = `appointment-slot-${index}`;
    radio.value = String(index);

    radio.addEventListener("change", () => {
      selectSlot(index);
    });

    const label =
      document.createElement("label");

    label.htmlFor = radio.id;
    label.textContent =
      ` ${formatTimeRange(
        slot.start_time,
        slot.duration_minutes
      )} — Available`;

    optionContainer.append(radio, label);
    dateFieldset.append(optionContainer);
  });
}

function selectSlot(index) {
  selectedSlot = availableSlots[index];

  selectedTime.textContent =
    `${formatDate(
      selectedSlot.appointment_date
    )}, ${formatTimeRange(
      selectedSlot.start_time,
      selectedSlot.duration_minutes
    )}`;

  confirmationSection.hidden = true;
  bookingSection.hidden = false;
  bookingMessage.textContent = "";

  studentNameInput.focus();
}

async function bookAppointment(event) {
  event.preventDefault();

  if (!selectedSlot) {
    showBookingMessage(
      "Select an appointment time first.",
      true
    );

    return;
  }

  bookButton.disabled = true;
  bookButton.textContent = "Booking...";
  showBookingMessage("Booking your appointment...");

  const { data, error } =
    await supabaseClient.rpc(
      "book_appointment",
      {
        p_appointment_date:
          selectedSlot.appointment_date,

        p_start_time:
          selectedSlot.start_time,

        p_student_name:
          studentNameInput.value.trim(),

        p_student_email:
          studentEmailInput.value.trim()
      }
    );

  bookButton.disabled = false;
  bookButton.textContent = "Book appointment";

  if (error) {
    showBookingMessage(
      `The appointment could not be booked: ${error.message}`,
      true
    );

    await loadAvailability();
    return;
  }

  const confirmation = data[0];

  confirmationMessage.textContent =
    `${formatDate(
      confirmation.appointment_date
    )}, ${formatTimeRange(
      confirmation.start_time,
      confirmation.duration_minutes
    )}. Booking reference: ${
      confirmation.booking_reference
    }`;

  bookingForm.reset();
  bookingSection.hidden = true;
  confirmationSection.hidden = false;

  showBookingMessage(
    "Your appointment was successfully booked."
  );

  await loadAvailability();
}

function showAvailabilityMessage(
  message,
  isError = false
) {
  availabilityMessage.textContent = message;

  availabilityMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showBookingMessage(
  message,
  isError = false
) {
  bookingMessage.textContent = message;

  bookingMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function formatDate(dateText) {
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

function formatTimeRange(
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
