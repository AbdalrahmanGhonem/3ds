const FALLBACK_API_BASE = "http://localhost:4000";
const origin = window.location?.origin;
const API_BASE =
  window.__API_BASE ||
  (origin && origin !== "null" && !origin.startsWith("file:")
    ? origin
    : FALLBACK_API_BASE);

const setStatus = (el, message, ok = true) => {
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.style.background = ok ? "rgba(124, 245, 197, 0.12)" : "rgba(255, 107, 107, 0.12)";
};

const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const applyAdminVisibility = () => {
  const user = currentUser();
  const isAdmin = Boolean(user?.is_admin);
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    if (!isAdmin) {
      el.setAttribute("hidden", "hidden");
      el.style.display = "none";
    } else {
      el.removeAttribute("hidden");
      el.style.display = "";
    }
  });

  if (document.body?.dataset?.page === "manage" && !isAdmin) {
    window.location.href = "login.html";
  }
};

const syncAuthLinks = () => {
  const user = currentUser();
  const isLoggedIn = Boolean(user?.id);
  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (isLoggedIn) {
      link.textContent = "Log out";
      link.setAttribute("href", "#");
      link.dataset.authState = "logout";
      link.removeAttribute("aria-current");
    } else {
      link.textContent = "Log in";
      link.setAttribute("href", "login.html");
      link.dataset.authState = "login";
    }
  });
};

const bindAuthLinks = () => {
  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.dataset.authState !== "logout") return;
      event.preventDefault();
      localStorage.removeItem("user");
      applyAdminVisibility();
      syncAuthLinks();
      window.location.href = "index.html";
    });
  });
};

const authHeaders = () => {
  const user = currentUser();
  return {
    "Content-Type": "application/json",
    "user_id": user?.id || "",
    "is_admin": user?.is_admin ? "1" : "0"
  };
};

applyAdminVisibility();
syncAuthLinks();
bindAuthLinks();

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const body = Object.fromEntries(formData.entries());
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(loginStatus, data.error || "Login failed", false);
      return;
    }
    localStorage.setItem("user", JSON.stringify(data));
    applyAdminVisibility();
    setStatus(loginStatus, "Logged in");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 600);
  } catch (err) {
    setStatus(loginStatus, err.message || "Network error", false);
  }
});

const signupForm = document.getElementById("signup-form");
const signupStatus = document.getElementById("signup-status");

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const body = Object.fromEntries(formData.entries());

  if (body.password !== body.confirm) {
    setStatus(signupStatus, "Passwords do not match", false);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(signupStatus, data.error || "Signup failed", false);
      return;
    }
    localStorage.setItem("user", JSON.stringify(data));
    applyAdminVisibility();
    setStatus(signupStatus, "Account created, redirecting...");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  } catch (err) {
    setStatus(signupStatus, err.message || "Network error", false);
  }
});
