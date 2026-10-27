const API_BASE_URL = "https://market-website-f3k0.onrender.com";
const registerForm = document.getElementById("registerForm");
const registerButton = registerForm.querySelector('button[type="submit"]');
const registerMessage = document.getElementById("registerMessage");

function showRegisterMessage(message, type = "error") {
  registerMessage.textContent = message;
  registerMessage.className = `register-message ${type}`;
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const originalText = registerButton.textContent;

  if (password.length < 8) {
    showRegisterMessage("Your password must contain at least 8 characters.");
    return;
  }

  showRegisterMessage("");
  registerButton.disabled = true;
  registerButton.textContent = "Creating account…";

  try {
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Unable to create your account. Please try again.");
    }

    registerForm.reset();
    showRegisterMessage(
      data.message || "Your account has been created. You can now sign in.",
      "success"
    );

    window.setTimeout(() => {
      window.location.assign("login.html");
    }, 1200);
  } catch (error) {
    showRegisterMessage(
      error.message || "Unable to connect to the server. Please try again."
    );
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = originalText;
  }
});
