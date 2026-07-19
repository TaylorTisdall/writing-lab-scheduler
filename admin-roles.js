const adminRolesClient =
  window.writingLabAdminClient;

const administratorList =
  document.getElementById(
    "administrator-list"
  );

const administratorListMessage =
  document.getElementById(
    "administrator-list-message"
  );

const dashboardRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

const createAccountForm =
  document.getElementById(
    "create-account-form"
  );

const newAccountName =
  document.getElementById(
    "new-account-name"
  );

const newAccountEmail =
  document.getElementById(
    "new-account-email"
  );

const newAccountType =
  document.getElementById(
    "new-account-type"
  );

const roleTitleContainer =
  document.getElementById(
    "new-role-title-container"
  );

const newRoleTitle =
  document.getElementById(
    "new-role-title"
  );

const newAccountPassword =
  document.getElementById(
    "new-account-password"
  );

const confirmAccountPassword =
  document.getElementById(
    "confirm-account-password"
  );

const createAccountButton =
  document.getElementById(
    "create-account-button"
  );

const createAccountMessage =
  document.getElementById(
    "create-account-message"
  );

dashboardRefreshButton.addEventListener(
  "click",
  loadAdministrators
);

createAccountForm.addEventListener(
  "submit",
  createWritingLabAccount
);

newAccountType.addEventListener(
  "change",
  updateAccountRoleFields
);

adminRolesClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearAdministrators();
      clearCreateAccountForm();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(loadAdministrators, 0);
    }
  }
);

updateAccountRoleFields();
initializeAdministratorList();

async function initializeAdministratorList() {
  const { data, error } =
    await adminRolesClient.auth.getSession();

  if (error) {
    showAdministratorMessage(
      `Administrator roles could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadAdministrators();
  }
}

async function loadAdministrators() {
  administratorList.replaceChildren();

  showAdministratorMessage(
    "Loading administrators..."
  );

  const { data, error } =
    await adminRolesClient
      .from("administrators")
      .select(
        [
          "id",
          "name",
          "email",
          "role_title",
          "active",
          "must_change_password",
          "user_id"
        ].join(",")
      )
      .order("name");

  if (error) {
    showAdministratorMessage(
      `Administrators could not be loaded: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.length === 0) {
    showAdministratorMessage(
      "No administrator records are available."
    );

    return;
  }

  const list =
    document.createElement("ul");

  for (const administrator of data) {
    const labels = [
      administrator.name,
      administrator.email,
      administrator.role_title ||
        "Administrator",
      administrator.active
        ? "Active"
        : "Inactive",
      administrator.user_id
        ? "Login connected"
        : "No login"
    ];

    if (administrator.must_change_password) {
      labels.push("Password change required");
    }

    const item =
      document.createElement("li");

    item.textContent = labels.join(" — ");
    list.append(item);
  }

  administratorList.append(list);

  const administratorWord =
    data.length === 1
      ? "administrator"
      : "administrators";

  showAdministratorMessage(
    `${data.length} ${administratorWord}.`
  );
}

function updateAccountRoleFields() {
  const needsAdministratorDetails =
    newAccountType.value === "administrator" ||
    newAccountType.value === "both";

  roleTitleContainer.hidden =
    !needsAdministratorDetails;

  newRoleTitle.required =
    needsAdministratorDetails;

  if (!needsAdministratorDetails) {
    newRoleTitle.value = "";
  }
}

async function createWritingLabAccount(event) {
  event.preventDefault();

  const password =
    newAccountPassword.value;

  const confirmedPassword =
    confirmAccountPassword.value;

  if (password.length < 12) {
    showCreateAccountMessage(
      "The temporary password must contain at least 12 characters.",
      true
    );

    newAccountPassword.focus();
    return;
  }

  if (password !== confirmedPassword) {
    showCreateAccountMessage(
      "The temporary passwords do not match.",
      true
    );

    confirmAccountPassword.focus();
    return;
  }

  const accountType =
    newAccountType.value;

  const needsAdministratorDetails =
    accountType === "administrator" ||
    accountType === "both";

  const roleTitle =
    newRoleTitle.value.trim();

  if (
    needsAdministratorDetails &&
    !roleTitle
  ) {
    showCreateAccountMessage(
      "Enter the administrator role title.",
      true
    );

    newRoleTitle.focus();
    return;
  }

  createAccountButton.disabled = true;
  createAccountButton.textContent =
    "Creating account...";

  showCreateAccountMessage(
    "Creating the Writing Lab account..."
  );

  const { data, error } =
    await adminRolesClient.functions.invoke(
      "admin-create-account",
      {
        body: {
          email:
            newAccountEmail.value.trim(),
          password,
          name:
            newAccountName.value.trim(),
          account_type: accountType,
          role_title:
            needsAdministratorDetails
              ? roleTitle
              : undefined
        }
      }
    );

  createAccountButton.disabled = false;
  createAccountButton.textContent =
    "Create account";

  newAccountPassword.value = "";
  confirmAccountPassword.value = "";

  if (error) {
    const message =
      await getFunctionErrorMessage(error);

    showCreateAccountMessage(
      `The account could not be created: ${message}`,
      true
    );

    return;
  }

  if (!data || data.success !== true) {
    showCreateAccountMessage(
      data?.message ||
        "The account could not be created.",
      true
    );

    return;
  }

  const createdName =
    newAccountName.value.trim();

  createAccountForm.reset();
  updateAccountRoleFields();

  showCreateAccountMessage(
    `${createdName}'s account was created successfully.`
  );

  await loadDashboard();
  await loadAdministrators();
}

async function getFunctionErrorMessage(error) {
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

function clearAdministrators() {
  administratorList.replaceChildren();
  administratorListMessage.textContent = "";
}

function clearCreateAccountForm() {
  createAccountForm.reset();
  updateAccountRoleFields();
  createAccountMessage.textContent = "";
}

function showAdministratorMessage(
  message,
  isError = false
) {
  administratorListMessage.textContent =
    message;

  administratorListMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showCreateAccountMessage(
  message,
  isError = false
) {
  createAccountMessage.textContent =
    message;

  createAccountMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
