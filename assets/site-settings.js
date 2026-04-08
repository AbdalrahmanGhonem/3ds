(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const API_BASE =
    window.__API_BASE ||
    (origin && origin !== "null" && !origin.startsWith("file:") ? origin : FALLBACK_API_BASE);

  const state = {
    settings: null,
    isEditing: false,
    saving: false
  };

  const currentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const adminHeaders = () => {
    const user = currentUser();
    return {
      "Content-Type": "application/json",
      user_id: user?.id || "",
      is_admin: user?.is_admin ? "1" : "0"
    };
  };

  const normalizeContact = (contact = {}) => ({
    phone: String(contact?.phone || "").trim(),
    email: String(contact?.email || "").trim(),
    address: String(contact?.address || "").trim()
  });

  const setStatus = (message, tone = "info") => {
    const status = qs("[data-site-settings-status]");
    if (!status) return;
    if (!message) {
      status.hidden = true;
      status.textContent = "";
      status.removeAttribute("data-tone");
      return;
    }
    status.hidden = false;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const syncFormState = () => {
    const form = qs("[data-site-settings-form]");
    const editButton = qs("[data-edit-settings]");
    const saveButton = qs("[data-save-settings]");
    const cancelButton = qs("[data-cancel-settings]");
    if (!form || !editButton || !saveButton || !cancelButton) return;

    [...form.elements].forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
      field.disabled = !state.isEditing || state.saving;
    });

    editButton.hidden = state.isEditing;
    editButton.disabled = state.saving;
    saveButton.hidden = !state.isEditing;
    saveButton.disabled = state.saving;
    saveButton.textContent = state.saving ? "Saving..." : "Save";
    cancelButton.hidden = !state.isEditing;
    cancelButton.disabled = state.saving;
  };

  const applySettingsToForm = () => {
    const form = qs("[data-site-settings-form]");
    if (!form || !state.settings) return;
    const contact = normalizeContact(state.settings.contact);
    form.elements.phone.value = contact.phone;
    form.elements.email.value = contact.email;
    form.elements.address.value = contact.address;
  };

  const readFormContact = () => {
    const form = qs("[data-site-settings-form]");
    if (!form) throw new Error("Settings form is missing.");
    const contact = normalizeContact({
      phone: form.elements.phone?.value,
      email: form.elements.email?.value,
      address: form.elements.address?.value
    });

    if (!contact.phone) throw new Error("Phone number is required.");
    if (!contact.email) throw new Error("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error("Enter a valid email address.");
    if (!contact.address) throw new Error("Address is required.");

    return contact;
  };

  const loadSettings = async () => {
    const response = await fetch(`${API_BASE}/api/admin/site-settings`, {
      headers: adminHeaders(),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Could not load site settings.");
    }
    state.settings = data?.settings || { contact: normalizeContact() };
    applySettingsToForm();
    syncFormState();
  };

  const saveContactSettings = async () => {
    const contact = readFormContact();
    state.saving = true;
    syncFormState();
    setStatus("Saving contact settings...");

    try {
      const response = await fetch(`${API_BASE}/api/admin/site-settings/contact`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify(contact)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not save site settings.");
      }

      state.settings = data?.settings || { contact };
      state.isEditing = false;
      applySettingsToForm();
      setStatus("Contact settings saved.", "success");
    } finally {
      state.saving = false;
      syncFormState();
    }
  };

  const bindForm = () => {
    const form = qs("[data-site-settings-form]");
    const editButton = qs("[data-edit-settings]");
    const cancelButton = qs("[data-cancel-settings]");
    if (!form || !editButton || !cancelButton) return;

    editButton.addEventListener("click", () => {
      state.isEditing = true;
      syncFormState();
      setStatus("");
    });

    cancelButton.addEventListener("click", () => {
      state.isEditing = false;
      applySettingsToForm();
      syncFormState();
      setStatus("Changes discarded.");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveContactSettings();
      } catch (error) {
        setStatus(error.message || "Could not save site settings.", "error");
      }
    });
  };

  document.addEventListener("DOMContentLoaded", async () => {
    bindForm();
    syncFormState();
    try {
      await loadSettings();
    } catch (error) {
      setStatus(error.message || "Could not load site settings.", "error");
    }
  });
})();
