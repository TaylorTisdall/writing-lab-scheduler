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

dashboardRefreshButton.addEventListener(
  "click",
  loadAdministrators
);

adminRolesClient.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_OUT") {
      clearAdministrators();
      return;
    }

    if (event === "SIGNED_IN" && session) {
      setTimeout(loadAdministrators, 0);
    }
  }
);

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

function clearAdministrators() {
  administratorList.replaceChildren();
  administratorListMessage.textContent = "";
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
