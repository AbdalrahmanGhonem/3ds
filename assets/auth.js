const FALLBACK_API_BASE = "http://localhost:4000";
const origin = window.location?.origin;
const API_BASE =
  window.__API_BASE ||
  (origin && origin !== "null" && !origin.startsWith("file:")
    ? origin
    : FALLBACK_API_BASE);

const iconPaths = {
  search: '<circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l5 5"></path>',
  user: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.8-3 4.2-4.5 7-4.5S17.2 16 19 19"></path>',
  cart: '<path d="M3 5h2l2.1 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7"></path><circle cx="10" cy="19" r="1.5"></circle><circle cx="18" cy="19" r="1.5"></circle>',
  menu: '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>'
};

const renderStorefrontIcons = () => {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const icon = iconPaths[node.dataset.icon];
    if (!icon) return;
    node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
  });
};

const syncLocalCartCount = () => {
  let count = 0;
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (Array.isArray(cart)) {
      count = cart.reduce((sum, line) => sum + (Number(line?.qty) || 0), 0);
    }
  } catch {
    count = 0;
  }

  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(count);
    node.hidden = count === 0;
  });
};

const nextLoginTarget = () => {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next || "";
};

const hasSignupSuccess = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("signup") === "success";
};

const hasPasswordResetSuccess = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("reset") === "success";
};

const resetTokenFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("token") || "").trim();
};

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

const accountDestination = () => {
  const user = currentUser();
  if (!user?.id) return "login.html";
  return "account.html";
};

const bindHeaderActions = () => {
  document.querySelectorAll('.mock-header__icons [aria-label="Search"]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      window.location.href = "shop.html";
    });
  });

  document.querySelectorAll('.mock-header__icons [aria-label="Account"]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      window.location.href = accountDestination();
    });
  });

  document.querySelectorAll(".mock-cart-link").forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    link.setAttribute("href", "cart.html");
  });
};

const syncAdminNavLinks = () => {
  const user = currentUser();
  const isAdmin = Boolean(user?.is_admin);
  const currentPage = document.body?.dataset?.page;

  document.querySelectorAll(".mock-nav").forEach((nav) => {
    const adminLinks = [
      {
        key: "products",
        href: "admin-products.html",
        label: "Manage Products",
        isActive: currentPage === "admin-products" || currentPage === "manage"
      },
      {
        key: "orders",
        href: "admin-orders.html",
        label: "Order Details",
        isActive: currentPage === "admin-orders" || currentPage === "admin-order"
      }
    ];

    if (!isAdmin) {
      nav.querySelectorAll("[data-admin-nav-link]").forEach((link) => link.remove());
      return;
    }

    adminLinks.forEach(({ key, href, label, isActive }) => {
      let adminLink = nav.querySelector(`[data-admin-nav-link="${key}"]`);

      if (!(adminLink instanceof HTMLAnchorElement)) {
        adminLink = document.createElement("a");
        adminLink.dataset.adminOnly = "true";
        adminLink.dataset.adminNavLink = key;
        nav.append(adminLink);
      }

      adminLink.href = href;
      adminLink.textContent = label;
      adminLink.classList.toggle("is-active", isActive);
      adminLink.removeAttribute("hidden");
      adminLink.style.display = "";
    });
  });
};

const applyAdminVisibility = () => {
  const user = currentUser();
  const isAdmin = Boolean(user?.is_admin);
  const isLoggedIn = Boolean(user?.id);
  const adminPages = new Set(["manage", "admin-products", "admin-orders", "admin-order"]);
  const accountPages = new Set(["account"]);
  syncAdminNavLinks();
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    if (!isAdmin) {
      el.setAttribute("hidden", "hidden");
      el.style.display = "none";
    } else {
      el.removeAttribute("hidden");
      el.style.display = "";
    }
  });

  if (accountPages.has(document.body?.dataset?.page) && !isLoggedIn) {
    const currentPath = `${window.location.pathname.split("/").pop() || "account.html"}${window.location.search || ""}`;
    window.location.href = `login.html?next=${encodeURIComponent(currentPath)}`;
    return;
  }

  if (adminPages.has(document.body?.dataset?.page) && !isAdmin) {
    const currentPath = `${window.location.pathname.split("/").pop() || "admin-products.html"}${window.location.search || ""}`;
    window.location.href = `login.html?next=${encodeURIComponent(currentPath)}`;
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
      window.location.href = target.dataset.logoutDestination || "index.html";
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

const clearFieldValidation = (input) => {
  if (!(input instanceof HTMLInputElement)) return;
  input.setCustomValidity("");
};

const showFieldValidation = (input, statusEl, message) => {
  if (!(input instanceof HTMLInputElement)) return false;
  input.setCustomValidity(message);
  setStatus(statusEl, message, false);
  input.reportValidity();
  input.focus();
  return false;
};

const isValidEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

applyAdminVisibility();
syncAuthLinks();
bindAuthLinks();
bindHeaderActions();
renderStorefrontIcons();
syncLocalCartCount();

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

if (loginStatus && hasSignupSuccess()) {
  setStatus(loginStatus, "Account created successfully. Log in with your new email and password.");
}

if (loginStatus && hasPasswordResetSuccess()) {
  setStatus(loginStatus, "Password updated successfully. Log in with your new password.");
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const body = {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || "")
  };
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
    const next = nextLoginTarget();
    const redirectTarget = next || (data.is_admin ? "admin-products.html" : "index.html");
    setTimeout(() => {
      window.location.href = redirectTarget;
    }, 600);
  } catch (err) {
    setStatus(loginStatus, err.message || "Network error", false);
  }
});

const signupForm = document.getElementById("signup-form");
const signupStatus = document.getElementById("signup-status");

if (signupForm instanceof HTMLFormElement) {
  const signupInputs = ["name", "email", "password", "confirm"]
    .map((field) => signupForm.elements.namedItem(field))
    .filter((input) => input instanceof HTMLInputElement);

  signupInputs.forEach((input) => {
    input.addEventListener("input", () => {
      clearFieldValidation(input);
      if (signupStatus) signupStatus.hidden = true;
    });
  });
}

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const nameInput = signupForm.elements.namedItem("name");
  const emailInput = signupForm.elements.namedItem("email");
  const passwordInput = signupForm.elements.namedItem("password");
  const confirmInput = signupForm.elements.namedItem("confirm");
  const body = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
    confirm: String(formData.get("confirm") || "")
  };

  clearFieldValidation(nameInput);
  clearFieldValidation(emailInput);
  clearFieldValidation(passwordInput);
  clearFieldValidation(confirmInput);

  if (!body.name) {
    showFieldValidation(nameInput, signupStatus, "Please enter your full name.");
    return;
  }

  if (!body.email) {
    showFieldValidation(emailInput, signupStatus, "Please enter your email address.");
    return;
  }

  if (!isValidEmailAddress(body.email)) {
    showFieldValidation(emailInput, signupStatus, "Please enter a valid email address.");
    return;
  }

  if (!body.password) {
    showFieldValidation(passwordInput, signupStatus, "Please enter a password.");
    return;
  }

  if (body.password.length < 6) {
    showFieldValidation(passwordInput, signupStatus, "Password must be at least 6 characters.");
    return;
  }

  if (!body.confirm) {
    showFieldValidation(confirmInput, signupStatus, "Please confirm your password.");
    return;
  }

  if (body.password !== body.confirm) {
    showFieldValidation(confirmInput, signupStatus, "Passwords do not match.");
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
    localStorage.removeItem("user");
    applyAdminVisibility();
    syncAuthLinks();
    setStatus(signupStatus, "Account created successfully. Redirecting to login...");
    signupForm.reset();
    setTimeout(() => {
      window.location.href = "login.html?signup=success";
    }, 800);
  } catch (err) {
    setStatus(signupStatus, err.message || "Network error", false);
  }
});

const forgotPasswordForm = document.getElementById("forgot-password-form");
const forgotPasswordStatus = document.getElementById("forgot-password-status");

forgotPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(forgotPasswordForm);
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    setStatus(forgotPasswordStatus, "Email is required", false);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(forgotPasswordStatus, data.error || "Could not send reset email", false);
      return;
    }
    setStatus(forgotPasswordStatus, data.message || "Check your email");
    forgotPasswordForm.reset();
  } catch (err) {
    setStatus(forgotPasswordStatus, err.message || "Network error", false);
  }
});

const resetPasswordForm = document.getElementById("reset-password-form");
const resetPasswordStatus = document.getElementById("reset-password-status");

if (resetPasswordForm && !resetTokenFromUrl()) {
  setStatus(resetPasswordStatus, "Reset link is invalid or expired", false);
}

resetPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = resetTokenFromUrl();
  const formData = new FormData(resetPasswordForm);
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token) {
    setStatus(resetPasswordStatus, "Reset link is invalid or expired", false);
    return;
  }
  if (!password || !confirm) {
    setStatus(resetPasswordStatus, "All fields are required", false);
    return;
  }
  if (password !== confirm) {
    setStatus(resetPasswordStatus, "Passwords do not match", false);
    return;
  }
  if (password.length < 6) {
    setStatus(resetPasswordStatus, "Password must be at least 6 characters", false);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(resetPasswordStatus, data.error || "Could not reset password", false);
      return;
    }
    setStatus(resetPasswordStatus, data.message || "Password reset successfully");
    resetPasswordForm.reset();
    setTimeout(() => {
      window.location.href = "login.html?reset=success";
    }, 900);
  } catch (err) {
    setStatus(resetPasswordStatus, err.message || "Network error", false);
  }
});
