const passwordAdminClient =
  window.writingLabAdminClient;

const adminResetPasswordForm =
  document.getElementById(
    "admin-reset-password-form"
  );

const resetPasswordEmail =
  document.getElementById(
    "reset-password-email"
  );

const resetTemporaryPassword =
  document.getElementById(
    "reset-temporary-password"
  );

const confirmResetPassword =
  document.getElementById(
    "confirm-reset-password"
  );

const adminResetPasswordButton =
  document.getElementById(
    "admin-reset-password-button"
  );

const adminResetPasswordMessage =
  document.getElementById(
    "admin-reset-password-message"
  );

adminResetPasswordForm.addEventListener(
  "submit",
  resetWritingLabPassword
);

passwordAdminClient.auth.onAuthStateChange(
  (event) => {
    if (event === "SIGNED_OUT") {
      adminResetPasswordForm.reset();
      adminResetPasswordMessage.textContent =
        "";
    }
  }
);

async function resetWritingLabPassword(
  event
) {
  event.preventDefault();

  const temporaryPassword =
    resetTemporaryPassword.value;

  const confirmedPassword =
    confirmResetPassword.value;

  if (temporaryPassword.length < 12) {
    showAdminResetPasswordMessage(
      "The temporary password must contain at least 12 characters.",
      true
    );

    resetTemporaryPassword.focus();
    return;
  }

  if (
    temporaryPassword !==
    confirmedPassword
  ) {
    showAdminResetPasswordMessage(
      "The temporary passwords do not match.",
      true
    );

    confirmResetPassword.focus();
    return;
  }

  adminResetPasswordButton.disabled = true;
  adminResetPasswordButton.textContent =
    "Resetting password...";

  showAdminResetPasswordMessage(
    "Resetting the account password..."
  );

  const { data, error } =
    await passwordAdminClient.functions.invoke(
      "admin-reset-password",
      {
        body: {
          email:
            resetPasswordEmail.value.trim(),
          temporary_password:
            temporaryPassword
        }
      }
    );

  adminResetPasswordButton.disabled = false;
  adminResetPasswordButton.textContent =
    "Reset password";

  resetTemporaryPassword.value = "";
  confirmResetPassword.value = "";

  if (error) {
    const message =
      await getPasswordResetFunctionError(
        error
      );

    showAdminResetPasswordMessage(
      `The password could not be reset: ${message}`,
      true
    );

    return;
  }

  if (!data || data.success !== true) {
    showAdminResetPasswordMessage(
      data?.message ||
        "The password could not be reset.",
      true
    );

    return;
  }

  adminResetPasswordForm.reset();

  showAdminResetPasswordMessage(
    "The temporary password was set. The account holder must change it after signing in."
  );
}

async function getPasswordResetFunctionError(
  error
) {
  let message =
    error.message ||
    "The server returned an unknown error.";

  if (
    error.context &&
    typeof error.context.json === "function"
  ) {
    try {
      const details =
        await error.context.json();

      if (details?.message) {
        message = details.message;
      }
    } catch {
      // Keep the original error message.
    }
  }

  return message;
}

function showAdminResetPasswordMessage(
  message,
  isError = false
) {
  adminResetPasswordMessage.textContent =
    message;

  adminResetPasswordMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
