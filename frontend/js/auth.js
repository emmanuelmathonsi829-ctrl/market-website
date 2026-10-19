

const API_BASE_URL = "https://vertex-market-kk3y.onrender.com";

const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");

const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");

const formTitle = document.querySelector("#formTitle");
const formSubtitle = document.querySelector("#formSubtitle");
const message = document.querySelector("#message");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message ${type}`;
    message.hidden = false;
}

function clearMessage() {
    message.textContent = "";
    message.hidden = true;
    message.className = "message";
}

function switchForm(mode) {
    const isLogin = mode === "login";

    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;

    loginTab.classList.toggle("active", isLogin);
    signupTab.classList.toggle("active", !isLogin);

    formTitle.textContent = isLogin
        ? "Welcome back."
        : "Create your account.";

    formSubtitle.textContent = isLogin
        ? "Sign in."
        : "";

    clearMessage();
}

loginTab.addEventListener("click", () => switchForm("login"));
signupTab.addEventListener("click", () => switchForm("signup"));

async function sendAuthRequest(endpoint, email, password, button) {
    const originalText = button.innerHTML;

    button.disabled = true;
    button.textContent = "Please wait...";
    clearMessage();

    try {
        const base = API_BASE_URL.trim().replace(/\/+$/, "");

        if (!base || base.includes("YOUR-BACKEND")) {
            throw new Error(
                "Your backend URL is not configured yet. Set API_BASE_URL in auth.js."
            );
        }

        const response = await fetch(`${base}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || data.error || "The request could not be completed."
            );
        }

        return data;

    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// SIGN UP
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const email = document.querySelector("#signupEmail")
        .value.trim();

    const password = document.querySelector("#signupPassword")
        .value;

    const confirmPassword = document.querySelector("#confirmPassword")
        .value;

    const button = signupForm.querySelector('button[type="submit"]');

    if (password.length < 8) {
        showMessage("Your password must contain at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Your passwords do not match.");
        return;
    }

    try {
        await sendAuthRequest(
            "/api/signup",
            email,
            password,
            button
        );

        signupForm.reset();
        switchForm("login");

        document.querySelector("#loginEmail").value = email;

        showMessage(
            "Your account has been created. You can now log in.",
            "success"
        );

    } catch (error) {
        showMessage(error.message || "Unable to create your account.");
    }
});

// LOG IN
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const email = document.querySelector("#loginEmail")
        .value.trim();

    const password = document.querySelector("#loginPassword")
        .value;

    const button = loginForm.querySelector('button[type="submit"]');

    try {
        const data = await sendAuthRequest(
            "/api/login",
            email,
            password,
            button
        );



        showMessage("Login successful!", "success");

        const allowedPages = [
            "dashboard.html",
            "index.html"
        ];

        const destination = allowedPages.includes(data.redirect)
            ? data.redirect
            : "index.html";

        window.location.assign(destination);

    } catch (error) {
        showMessage(error.message || "Unable to log in. Please try again.");
    }
});
