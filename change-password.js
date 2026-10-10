const PASSWORD_SUPABASE_URL =
  "https://mdnyzlzaarzozbmqhecz.supabase.co";

const PASSWORD_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnl6bHphYXJ6b3pibXFoZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTU5NzgsImV4cCI6MjA5OTczMTk3OH0.FYJgBDOhmqg516ApoPAqWezMIaSIHseoKCcUcU6m-To";

const passwordClient =
  window.supabase.createClient(
    PASSWORD_SUPABASE_URL,
    PASSWORD_SUPABASE_KEY,
    {
      auth: {
        detectSessionInUrl: true,
        persistSession: true
      }
    }
  );

const passwordForm =
  document.getElementById(
    "change-password-form"
  );

const newPasswordInput =
  document.getElementById(
    "new-password"
  );

const confirmPasswordInput =
  document.getElementById(
    "confirm-new-password"
  );

const changePasswordButton =
  document.getElementById(
    "change-password-button"
  );

const passwordIntroduction =
  document.getElementById(
    "password-page-introduction"
  );

const passwordMessage =
  document.getElementById(
    "change-password-message"
  );

passwordForm.addEventListener(
  "submit",
  changePassword
);

initializePasswordPage();

async function initializePasswordPage() {
  passwordForm.hidden = true;

  showPasswordMessage(
    "Checking your account..."
  );

  try {
    const { data, error } =
      await passwordClient.auth.getSession();

    if (error) {
      showPasswordMessage(
        `Your account could not be checked: ${
          error.message
        }`,
        true
      );

      return;
    }

    if (!data.session) {
      passwordIntroduction.textContent =
        "You must sign in through the administrator or consultant page, or open a valid password-recovery link, before changing your password.";

      showPasswordMessage(
        "No active Writing Lab sign-in was found.",
        true
      );

      return;
    }

    const {
      data: passwordChangeRequired,
      error: requirementError
    } = await passwordClient.rpc(
      "must_change_my_password"
    );

    if (requirementError) {
      showPasswordMessage(
        `The password requirement could not be checked: ${
          requirementError.message
        }`,
        true
      );

      return;
    }

    passwordForm.hidden = false;

    if (passwordChangeRequired === true) {
      passwordIntroduction.textContent =
        "You must replace your temporary password before continuing.";
    } else {
      passwordIntroduction.textContent =
        "Your account does not currently require a password change, but you may update it here.";
    }

    showPasswordMessage(
      "Enter and confirm your new password."
    );

    newPasswordInput.focus();
  } catch (unexpectedError) {
    showPasswordMessage(
      `The password page could not be initialized: ${
        getPasswordErrorMessage(unexpectedError)
      }`,
      true
    );
  }
}

async function changePassword(event) {
  event.preventDefault();

  const newPassword =
    newPasswordInput.value;

  const confirmedPassword =
    confirmPasswordInput.value;

  if (newPassword.length < 12) {
    showPasswordMessage(
      "Your new password must contain at least 12 characters.",
      true
    );

    newPasswordInput.focus();
    return;
  }

  if (newPassword !== confirmedPassword) {
    showPasswordMessage(
      "The new passwords do not match.",
      true
    );

    confirmPasswordInput.focus();
    return;
  }

  setPasswordFormBusy(true);

  showPasswordMessage(
    "Changing your password..."
  );

  try {
    const { error: passwordError } =
      await passwordClient.auth.updateUser({
        password: newPassword
      });

    if (passwordError) {
      showPasswordMessage(
        `Your password could not be changed: ${
          passwordError.message
        }`,
        true
      );

      return;
    }

    const { error: completionError } =
      await passwordClient.rpc(
        "complete_my_password_change"
      );

    if (completionError) {
      passwordForm.reset();
      passwordForm.hidden = true;

      passwordIntroduction.textContent =
        "Your account password was changed successfully.";

      showPasswordMessage(
        `Your password changed, but the Writing Lab password-change requirement could not be cleared: ${
          completionError.message
        }. An administrator may need to clear the requirement before you continue.`,
        true
      );

      return;
    }

    passwordForm.reset();
    passwordForm.hidden = true;

    passwordIntroduction.textContent =
      "Your password has been changed successfully.";

    showPasswordMessage(
      "Password change complete. You may now continue to the administrator or consultant page."
    );
  } catch (unexpectedError) {
    showPasswordMessage(
      `Your password could not be changed: ${
        getPasswordErrorMessage(unexpectedError)
      }`,
      true
    );
  } finally {
    setPasswordFormBusy(false);
  }
}

function setPasswordFormBusy(isBusy) {
  newPasswordInput.disabled = isBusy;
  confirmPasswordInput.disabled = isBusy;
  changePasswordButton.disabled = isBusy;

  changePasswordButton.textContent =
    isBusy
      ? "Changing password..."
      : "Change password";
}

function getPasswordErrorMessage(error) {
  if (
    error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function showPasswordMessage(
  message,
  isError = false
) {
  passwordMessage.textContent = message;

  passwordMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
