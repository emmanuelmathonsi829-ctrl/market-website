
const API_BASE_URL = "https://market-website-f3k0.onrender.com";

(() => {
  const $ = selector => document.querySelector(selector);

  const currentPage = window.location.pathname;
  const isDashboard = currentPage.endsWith("admin-dashboard.html");
  const isLoginPage = currentPage.endsWith("admin-login.html");

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

  function showMessage(element, text, type = "") {
    if (!element) return;
    element.textContent = text;
    element.className = `admin-message ${type}`.trim();
  }

  async function handleLogin() {
    const form = $("#adminLoginForm");
    const loginMessage = $("#loginMessage");

    if (!form) return;

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const button = form.querySelector('button[type="submit"]');
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
          throw new Error("The server did not return administrator details.");
        }

        window.location.href = "admin-dashboard.html";
      } catch (error) {
        showMessage(loginMessage, error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    try {
      const data = await api("/api/admin/session");

      if (data.authenticated && data.admin) {
        window.location.replace("admin-dashboard.html");
      }
    } catch {}
  }

  async function handleDashboard() {
    const dashboard = $("#dashboardPanel");
    const logoutButton = $("#logoutBtn");
    const accountsTable = $("#accountsTable");
    const searchInput = $("#searchInput");
    const message = $("#message");
    const refreshButton = $("#refreshBtn");

    if (!dashboard || !accountsTable || !searchInput || !logoutButton) {
      return;
    }

    let accounts = [];

    async function loadAccounts() {
      showMessage(message, "Loading accounts...");

      try {
        const data = await api("/api/admin/users");
        accounts = Array.isArray(data.users) ? data.users : [];

        $("#totalAccounts").textContent = accounts.length;
        $("#verifiedAccounts").textContent =
          accounts.filter(user => user.is_verified).length;
        $("#unverifiedAccounts").textContent =
          accounts.filter(user => !user.is_verified).length;

        renderAccounts();
        showMessage(message, "");
      } catch (error) {
        showMessage(message, error.message, "error");

        if (error.status === 401 || error.status === 403) {
          window.location.replace("admin-login.html");
        }
      }
    }

    function renderAccounts() {
      const query = searchInput.value.trim().toLowerCase();

      const filtered = accounts.filter(user =>
        String(user.id).includes(query) ||
        String(user.email || "").toLowerCase().includes(query)
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

        const addCell = value => {
          const cell = document.createElement("td");
          cell.textContent = String(value ?? "");
          row.appendChild(cell);
        };

        addCell(user.id);
        addCell(user.email);

        const statusCell = document.createElement("td");
        const status = document.createElement("span");

        status.className = `admin-status ${
          user.is_verified ? "verified" : "unverified"
        }`;
        status.textContent = user.is_verified ? "Verified" : "Not verified";

        statusCell.appendChild(status);
        row.appendChild(statusCell);

        addCell(
          user.created_at
            ? new Date(user.created_at).toLocaleString()
            : "Unknown"
        );

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "admin-delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () =>
          deleteAccount(user, deleteButton)
        );

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        accountsTable.appendChild(row);
      });
    }

    async function deleteAccount(user, button) {
      if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;

      button.disabled = true;

      try {
        await api(`/api/admin/users/${encodeURIComponent(user.id)}`, {
          method: "DELETE"
        });

        accounts = accounts.filter(item => item.id !== user.id);

        $("#totalAccounts").textContent = accounts.length;
        $("#verifiedAccounts").textContent =
          accounts.filter(item => item.is_verified).length;
        $("#unverifiedAccounts").textContent =
          accounts.filter(item => !item.is_verified).length;

        renderAccounts();
        showMessage(message, "Account deleted successfully.", "success");
      } catch (error) {
        showMessage(message, error.message, "error");
        button.disabled = false;

        if (error.status === 401 || error.status === 403) {
          window.location.replace("admin-login.html");
        }
      }
    }

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;

      try {
        await api("/api/admin/logout", { method: "POST" });
        window.location.replace("admin-login.html");
      } catch (error) {
        showMessage(message, error.message, "error");
        logoutButton.disabled = false;
      }
    });

    refreshButton?.addEventListener("click", loadAccounts);
    searchInput.addEventListener("input", renderAccounts);

    try {
      const data = await api("/api/admin/session");

      if (!data.authenticated || !data.admin) {
        window.location.replace("admin-login.html");
        return;
      }

      $("#adminName").textContent = data.admin.name || "Administrator";
      $("#adminEmailDisplay").textContent = data.admin.email || "";
      $("#adminIdentity").hidden = false;
      $(".admin-avatar").textContent =
        (data.admin.name || "A").trim().charAt(0).toUpperCase();

      await loadAccounts();
    } catch {
      window.location.replace("admin-login.html");
    }
  }

  if (isLoginPage) {
    handleLogin();
  } else if (isDashboard) {
    handleDashboard();
  }
})();
