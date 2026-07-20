const administratorManagementClient =
  window.writingLabAdminClient;

const promoteAdministratorForm =
  document.getElementById(
    "promote-administrator-form"
  );

const promoteAdministratorEmail =
  document.getElementById(
    "promote-administrator-email"
  );

const promoteAdministratorName =
  document.getElementById(
    "promote-administrator-name"
  );

const promoteAdministratorTitle =
  document.getElementById(
    "promote-administrator-title"
  );

const promoteAdministratorButton =
  document.getElementById(
    "promote-administrator-button"
  );

const promoteAdministratorMessage =
  document.getElementById(
    "promote-administrator-message"
  );

const administratorManagementList =
  document.getElementById(
    "administrator-management-list"
  );

const administratorManagementMessage =
  document.getElementById(
    "administrator-management-message"
  );

const administratorManagementRefreshButton =
  document.getElementById(
    "refresh-dashboard-button"
  );

promoteAdministratorForm.addEventListener(
  "submit",
  promoteExistingAdministrator
);

administratorManagementRefreshButton.addEventListener(
  "click",
  loadAdministratorManagement
);

administratorManagementClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearAdministratorManagement();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(
        loadAdministratorManagement,
        0
      );
    }
  }
);

initializeAdministratorManagement();

async function initializeAdministratorManagement() {
  const { data, error } =
    await administratorManagementClient.auth.getSession();

  if (error) {
    showAdministratorManagementMessage(
      `Administrator management could not be initialized: ${
        error.message
      }`,
      true
    );

    return;
  }

  if (data.session) {
    await loadAdministratorManagement();
  }
}

async function loadAdministratorManagement() {
  showAdministratorManagementMessage(
    "Loading administrator controls..."
  );

  const [
    sessionResult,
    administratorsResult
  ] = await Promise.all([
    administratorManagementClient.auth.getSession(),

    administratorManagementClient
      .from("administrators")
      .select(
        [
          "id",
          "name",
          "email",
          "role_title",
          "active",
          "user_id"
        ].join(",")
      )
      .order("name")
  ]);

  if (sessionResult.error) {
    showAdministratorManagementMessage(
      `The current account could not be checked: ${
        sessionResult.error.message
      }`,
      true
    );

    return;
  }

  if (administratorsResult.error) {
    showAdministratorManagementMessage(
      `Administrator controls could not be loaded: ${
        administratorsResult.error.message
      }`,
      true
    );

    return;
  }

  const currentUserId =
    sessionResult.data.session?.user?.id;

  renderAdministratorManagement(
    administratorsResult.data,
    currentUserId
  );
}

function renderAdministratorManagement(
  administrators,
  currentUserId
) {
  administratorManagementList.replaceChildren();

  if (administrators.length === 0) {
    showAdministratorManagementMessage(
      "No administrators are available to manage."
    );

    return;
  }

  for (const administrator of administrators) {
    const section =
      document.createElement("section");

    section.setAttribute(
      "aria-labelledby",
      `manage-administrator-${administrator.id}`
    );

    const heading =
      document.createElement("h4");

    heading.id =
      `manage-administrator-${administrator.id}`;

    heading.textContent = administrator.name;

    const summary =
      document.createElement("p");

    summary.textContent = [
      administrator.email,
      administrator.role_title ||
        "Administrator",
      administrator.active
        ? "Active"
        : "Inactive",
      administrator.user_id
        ? "Login connected"
        : "No login"
    ].join(" — ");

    const detailsForm =
      createAdministratorDetailsForm(
        administrator
      );

    const statusButton =
      createAdministratorStatusButton(
        administrator,
        currentUserId
      );

    section.append(
      heading,
      summary,
      detailsForm,
      statusButton,
      document.createElement("hr")
    );

    administratorManagementList.append(
      section
    );
  }

  const administratorWord =
    administrators.length === 1
      ? "administrator"
      : "administrators";

  showAdministratorManagementMessage(
    `${administrators.length} ${administratorWord} available to manage.`
  );
}

function createAdministratorDetailsForm(
  administrator
) {
  const form =
    document.createElement("form");

  const nameLabel =
    document.createElement("label");

  const nameInput =
    document.createElement("input");

  const titleLabel =
    document.createElement("label");

  const titleInput =
    document.createElement("input");

  const button =
    document.createElement("button");

  const nameId =
    `administrator-name-${administrator.id}`;

  const titleId =
    `administrator-title-${administrator.id}`;

  nameLabel.htmlFor = nameId;
  nameLabel.textContent = "Display name";

  nameInput.id = nameId;
  nameInput.type = "text";
  nameInput.value = administrator.name;
  nameInput.maxLength = 100;
  nameInput.required = true;

  titleLabel.htmlFor = titleId;
  titleLabel.textContent = "Role title";

  titleInput.id = titleId;
  titleInput.type = "text";
  titleInput.value =
    administrator.role_title || "";
  titleInput.maxLength = 100;
  titleInput.required = true;

  button.type = "submit";
  button.textContent = "Save administrator details";

  form.append(
    nameLabel,
    document.createElement("br"),
    nameInput,
    document.createElement("br"),
    titleLabel,
    document.createElement("br"),
    titleInput,
    document.createElement("br"),
    button
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      button.disabled = true;
      button.textContent = "Saving...";

      showAdministratorManagementMessage(
        `Updating ${administrator.name}...`
      );

      const { error } =
        await administratorManagementClient.rpc(
          "admin_update_administrator_details",
          {
            p_administrator_id:
              administrator.id,
            p_name: nameInput.value.trim(),
            p_role_title:
              titleInput.value.trim()
          }
        );

      button.disabled = false;
      button.textContent =
        "Save administrator details";

      if (error) {
        showAdministratorManagementMessage(
          `The administrator details could not be updated: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAdministratorDisplays();

      showAdministratorManagementMessage(
        "The administrator details were updated."
      );
    }
  );

  return form;
}

function createAdministratorStatusButton(
  administrator,
  currentUserId
) {
  const button =
    document.createElement("button");

  button.type = "button";

  const isCurrentAccount =
    administrator.user_id === currentUserId;

  if (
    isCurrentAccount &&
    administrator.active
  ) {
    button.textContent =
      "Current account cannot deactivate itself";

    button.disabled = true;
    return button;
  }

  button.textContent =
    administrator.active
      ? "Deactivate administrator"
      : "Reactivate administrator";

  button.addEventListener(
    "click",
    async () => {
      const newStatus =
        !administrator.active;

      const actionWord =
        newStatus
          ? "reactivate"
          : "deactivate";

      const confirmed =
        window.confirm(
          `Are you sure you want to ${actionWord} administrator access for ${administrator.name}?`
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      showAdministratorManagementMessage(
        `${newStatus ? "Reactivating" : "Deactivating"} ${
          administrator.name
        }...`
      );

      const { error } =
        await administratorManagementClient.rpc(
          "admin_set_administrator_active",
          {
            p_administrator_id:
              administrator.id,
            p_active: newStatus
          }
        );

      button.disabled = false;

      if (error) {
        showAdministratorManagementMessage(
          `Administrator access could not be changed: ${
            error.message
          }`,
          true
        );

        return;
      }

      await refreshAdministratorDisplays();

      showAdministratorManagementMessage(
        `${administrator.name}'s administrator access is now ${
          newStatus ? "active" : "inactive"
        }.`
      );
    }
  );

  return button;
}

async function promoteExistingAdministrator(
  event
) {
  event.preventDefault();

  promoteAdministratorButton.disabled = true;
  promoteAdministratorButton.textContent =
    "Granting access...";

  showPromoteAdministratorMessage(
    "Granting administrator access..."
  );

  const { error } =
    await administratorManagementClient.rpc(
      "admin_promote_existing_user",
      {
        p_email:
          promoteAdministratorEmail.value.trim(),
        p_name:
          promoteAdministratorName.value.trim(),
        p_role_title:
          promoteAdministratorTitle.value.trim()
      }
    );

  promoteAdministratorButton.disabled = false;
  promoteAdministratorButton.textContent =
    "Grant administrator access";

  if (error) {
    showPromoteAdministratorMessage(
      `Administrator access could not be granted: ${
        error.message
      }`,
      true
    );

    return;
  }

  const promotedName =
    promoteAdministratorName.value.trim();

  promoteAdministratorForm.reset();

  await refreshAdministratorDisplays();

  showPromoteAdministratorMessage(
    `${promotedName} now has administrator access.`
  );
}

async function refreshAdministratorDisplays() {
  await loadAdministratorManagement();

  if (
    typeof loadAdministrators === "function"
  ) {
    await loadAdministrators();
  }
}

function clearAdministratorManagement() {
  administratorManagementList.replaceChildren();
  administratorManagementMessage.textContent = "";
  promoteAdministratorMessage.textContent = "";
  promoteAdministratorForm.reset();
}

function showAdministratorManagementMessage(
  message,
  isError = false
) {
  administratorManagementMessage.textContent =
    message;

  administratorManagementMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function showPromoteAdministratorMessage(
  message,
  isError = false
) {
  promoteAdministratorMessage.textContent =
    message;

  promoteAdministratorMessage.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}
