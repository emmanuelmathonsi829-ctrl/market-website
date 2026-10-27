
const API_BASE_URL = "https://market-website-f3k0.onrender.com";

(() => {
  const $ = (selector) => document.querySelector(selector);

  const loginPanel = $("#loginPanel");
  const dashboardPanel = $("#dashboardPanel");
  const loginForm = $("#adminLoginForm");
  const loginMessage = $("#loginMessage");
  const accountsTable = $("#accountsTable");
  const searchInput = $("#searchInput");
  const message = $("#message");
  const logoutBtn = $("#logoutBtn");

  let accounts = [];

  function showMessage(element, text, type = "") {
    element.textContent = text;
    element.className = `admin-message ${type}`.trim();
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    logoutBtn.hidden = true;
  }

  function showDashboard(admin) {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    logoutBtn.hidden = false;

    $("#adminName").textContent = admin.name || "Administrator";
    $("#adminEmailDisplay").textContent = admin.email || "";
    $("#adminIdentity").hidden = false;
    $(".admin-avatar").textContent =
      (admin.name || "A").trim().charAt(0).toUpperCase();
  }

  async function api(path, options = {}) {
    const headers = { ...options.headers };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include"
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error || data.message || "Request failed."
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  function updateStats() {
    $("#totalAccounts").textContent = accounts.length;

    $("#verifiedAccounts").textContent =
      accounts.filter(user => user.is_verified).length;

    $("#unverifiedAccounts").textContent =
      accounts.filter(user => !user.is_verified).length;
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "");
    row.appendChild(cell);
  }

  function renderAccounts() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = accounts.filter(user =>
      String(user.id).includes(query) ||
      user.email.toLowerCase().includes(query)
    );

    accountsTable.replaceChildren();

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.className = "admin-empty";
      cell.textContent = accounts.length
        ? "No matching accounts found."
        : "No registered accounts yet.";

      row.appendChild(cell);
      accountsTable.appendChild(row);
      return;
    }

    filtered.forEach(user => {
      const row = document.createElement("tr");

      addCell(row, user.id);
      addCell(row, user.email);

      const statusCell = document.createElement("td");
      const status = document.createElement("span");

      status.className = `admin-status ${
        user.is_verified ? "verified" : "unverified"
      }`;

      status.textContent = user.is_verified
        ? "Verified"
        : "Not verified";

      statusCell.appendChild(status);
      row.appendChild(statusCell);

      addCell(
        row,
        user.created_at
          ? new Date(user.created_at).toLocaleString()
          : "Unknown"
      );

      const actionCell = document.createElement("td");
      const button = document.createElement("button");

      button.type = "button";
      button.className = "admin-delete-button";
      button.textContent = "Delete";
      button.addEventListener("click", () =>
        deleteAccount(user, button)
      );

      actionCell.appendChild(button);
      row.appendChild(actionCell);
      accountsTable.appendChild(row);
    });
  }

  async function loadAccounts() {
    showMessage(message, "Loading accounts...");

    try {
      const data = await api("/api/admin/users");

      accounts = Array.isArray(data.users) ? data.users : [];

      updateStats();
      renderAccounts();
      showMessage(message, "");
    } catch (error) {
      showMessage(message, error.message, "error");

      if (error.status === 401 || error.status === 403) {
        showLogin();
      }
    }
  }

  async function checkSession() {
    try {
      const data = await api("/api/admin/session");

      if (data.authenticated !== true || !data.admin) {
        showLogin();
        return;
      }

      showDashboard(data.admin);
      await loadAccounts();
    } catch {
      showLogin();
    }
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = loginForm.querySelector('button[type="submit"]');

    button.disabled = true;
    showMessage(loginMessage, "Signing in...");

    try {
      const data = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: $("#adminEmail").value.trim(),
          password: $("#adminPassword").value
        })
      });

      if (!data.admin) {
        throw new Error("Invalid administrator response.");
      }

      loginForm.reset();
      showDashboard(data.admin);
      await loadAccounts();
    } catch (error) {
      showMessage(loginMessage, error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  async function deleteAccount(user, button) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) {
      return;
    }

    button.disabled = true;

    try {
      await api(
        `/api/admin/users/${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );

      accounts = accounts.filter(item => item.id !== user.id);

      updateStats();
      renderAccounts();

      showMessage(message, "Account deleted successfully.", "success");
    } catch (error) {
      showMessage(message, error.message, "error");
      button.disabled = false;
    }
  }

  $("#refreshBtn").addEventListener("click", loadAccounts);
  searchInput.addEventListener("input", renderAccounts);

  logoutBtn.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch (error) {
      showMessage(message, error.message, "error");
      return;
    }

    showLogin();
    $("#adminIdentity").hidden = true;

    showMessage(loginMessage, "You have been logged out.", "success");
  });

  checkSession();
})();
