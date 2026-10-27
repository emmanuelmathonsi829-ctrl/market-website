const API_BASE_URL = window.location.origin;
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

function showLoginMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.className = `login-message ${type}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;
  const originalText = loginButton.textContent;

  showLoginMessage("");
  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";

  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password, remember })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Unable to sign in. Please try again.");
    }

    showLoginMessage("Login successful. Redirecting…", "success");
    window.location.assign(data.redirect || "index.html");
  } catch (error) {
    showLoginMessage(
      error.message || "Unable to connect to the server. Please try again.",
      "error"
    );
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = originalText;
  }
});
