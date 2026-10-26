const API_BASE_URL = "https://vertex-market-kk3y.onrender.com"

(() => {


  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $("#loginPanel");
  const dashboardPanel = $("#dashboardPanel");
  const loginForm = $("#adminLoginForm");
  const loginMessage = $("#loginMessage");
  const table = $("#accountsTable");
  const searchInput = $("#searchInput");
  const message = $("#message");
  const TOKEN_KEY = "vertex_admin_jwt";
  let accounts = [];

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function setAdminIdentity(admin) {
    const identity = $("#adminIdentity");
    identity.hidden = !admin;
    if (admin) {
      $("#adminName").textContent = admin.name || "Administrator";
      $("#adminEmailDisplay").textContent = admin.email || "";
      $(".admin-avatar").textContent = (admin.name || "A").trim().charAt(0).toUpperCase();
    }
  }

  function setMessage(element, text, type = "") {
    element.textContent = text;
    element.className = `admin-message ${type}`.trim();
  }

  async function api(path, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status}).`);
    return data;
  }

  function formatDate(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
  }

  function updateStats() {
    $("#totalAccounts").textContent = accounts.length;
    $("#verifiedAccounts").textContent = accounts.filter((user) => user.is_verified).length;
    $("#unverifiedAccounts").textContent = accounts.filter((user) => !user.is_verified).length;
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function renderAccounts() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = accounts.filter((user) =>
      String(user.id).includes(query) || user.email.toLowerCase().includes(query)
    );
    table.replaceChildren();

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = addCell(row, accounts.length ? "No matching accounts found." : "No registered accounts yet.");
      cell.colSpan = 5;
      cell.className = "admin-empty";
      table.appendChild(row);
      return;
    }

    filtered.forEach((user) => {
      const row = document.createElement("tr");
      addCell(row, String(user.id));
      addCell(row, user.email);

      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = `admin-status ${user.is_verified ? "verified" : "unverified"}`;
      status.textContent = user.is_verified ? "Verified" : "Not verified";
      statusCell.appendChild(status);
      row.appendChild(statusCell);

      addCell(row, formatDate(user.created_at));
      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-delete-button";
      button.textContent = "Delete";
      button.addEventListener("click", () => deleteAccount(user, button));
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      table.appendChild(row);
    });
  }

  async function loadAccounts() {
    setMessage(message, "Loading accounts…");
    try {
      const data = await api("/api/admin/users");
      accounts = Array.isArray(data.users) ? data.users : [];
      updateStats();
      renderAccounts();
      setMessage(message, "");
    } catch (error) {
      setMessage(message, error.message, "error");
      if (/administrator login|required|unauthorized/i.test(error.message)) {
        sessionStorage.removeItem(TOKEN_KEY);
        dashboardPanel.hidden = true;
        loginPanel.hidden = false;
        $("#logoutBtn").hidden = true;
        setAdminIdentity(null);
      }
    }
  }

  async function checkSession() {
    try {
      const data = await api("/api/admin/session");
      const authenticated = data.authenticated === true;
      loginPanel.hidden = authenticated;
      dashboardPanel.hidden = !authenticated;
      $("#logoutBtn").hidden = !authenticated;
      setAdminIdentity(authenticated ? data.admin : null);
      if (!authenticated) sessionStorage.removeItem(TOKEN_KEY);
      if (authenticated) await loadAccounts();
    } catch (error) {
      loginPanel.hidden = false;
      dashboardPanel.hidden = true;
      setMessage(loginMessage, error.message, "error");
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Signing in…";
    setMessage(loginMessage, "");
    try {
      const result = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: $("#adminEmail").value.trim(), password: $("#adminPassword").value })
      });
      if (!result.token || !result.admin) throw new Error("The server did not return an administrator token.");
      sessionStorage.setItem(TOKEN_KEY, result.token);
      loginForm.reset();
      loginPanel.hidden = true;
      dashboardPanel.hidden = false;
      $("#logoutBtn").hidden = false;
      setAdminIdentity(result.admin);
      await loadAccounts();
    } catch (error) {
      setMessage(loginMessage, error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  async function deleteAccount(user, button) {
    if (!window.confirm(`Permanently delete ${user.email} (ID ${user.id})? This cannot be undone.`)) return;
    button.disabled = true;
    try {
      await api(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
      accounts = accounts.filter((item) => item.id !== user.id);
      updateStats();
      renderAccounts();
      setMessage(message, "Account deleted successfully.", "success");
    } catch (error) {
      setMessage(message, error.message, "error");
      button.disabled = false;
    }
  }

  $("#refreshBtn").addEventListener("click", loadAccounts);
  searchInput.addEventListener("input", renderAccounts);
  $("#logoutBtn").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
      sessionStorage.removeItem(TOKEN_KEY);
      dashboardPanel.hidden = true;
      loginPanel.hidden = false;
      $("#logoutBtn").hidden = true;
      setAdminIdentity(null);
      setMessage(loginMessage, "You have been logged out.", "success");
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  checkSession();
})();
