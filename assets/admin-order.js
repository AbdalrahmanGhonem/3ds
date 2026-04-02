(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const hostname = window.location?.hostname || "";
  const hasHttpOrigin = origin && origin !== "null" && !origin.startsWith("file:");
  const isLocalDevelopmentHost = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$/i.test(hostname);
  const API_BASE = hasHttpOrigin && !isLocalDevelopmentHost ? origin : window.__API_BASE || (hasHttpOrigin ? origin : FALLBACK_API_BASE);
  const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

  const state = {
    order: null
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

  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString("en-EG")} EGP`;
  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const titleCase = (value) =>
    String(value || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const setStatus = (message, tone = "info") => {
    const status = qs("[data-admin-order-status]");
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

  const orderIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("id") || "").trim();
  };

  const renderOrderDetail = () => {
    const wrap = qs("#admin-order-page-detail");
    if (!wrap) return;

    const order = state.order;
    if (!order) {
      wrap.innerHTML = `
        <p class="mock-admin-empty">Order not found.</p>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="mock-admin-stack">
        <div class="mock-admin-order-summary">
          <div class="mock-admin-order-summary__top">
            <div>
              <h3>Order #${order.order_number || order.id}</h3>
              <p>${formatDate(order.created_at)}</p>
            </div>
            <span class="mock-pill-badge">${titleCase(order.status)}</span>
          </div>
          <div class="mock-admin-order-summary__grid">
            <p><strong>Order Number:</strong> ${order.order_number || order.id}</p>
            <p><strong>Customer:</strong> ${order.customer_name || "-"}</p>
            <p><strong>Phone:</strong> ${order.phone || "-"}</p>
            <p><strong>Governorate:</strong> ${order.governorate || "-"}</p>
            <p><strong>District:</strong> ${order.district || "-"}</p>
            <p><strong>Payment:</strong> ${titleCase(order.payment_method)}</p>
            <p><strong>Status:</strong> ${titleCase(order.status)}</p>
            <p><strong>Subtotal:</strong> ${formatMoney(order.subtotal_egp)}</p>
            <p><strong>Shipping:</strong> ${Number(order.shipping_egp) === 0 ? "Free" : formatMoney(order.shipping_egp)}</p>
            <p><strong>Total:</strong> ${formatMoney(order.total_egp)}</p>
            <p><strong>Created:</strong> ${formatDate(order.created_at)}</p>
            <p class="mock-admin-order-summary__address"><strong>Address:</strong> ${order.address || "-"}</p>
          </div>
        </div>

        <div class="mock-admin-order-status">
          <label class="mock-admin-field">
            <span>Status</span>
            <select class="mock-input" data-order-status>
              ${ORDER_STATUSES.map(
                (status) =>
                  `<option value="${status}"${status === order.status ? " selected" : ""}>${titleCase(status)}</option>`
              ).join("")}
            </select>
          </label>
          <button class="mock-primary-button" type="button" data-save-order-status>Update Status</button>
        </div>

        <div class="mock-admin-order-items">
          ${Array.isArray(order.items) && order.items.length
            ? order.items
                .map(
                  (item) => `
                    <article class="mock-admin-order-item">
                      <div class="mock-admin-order-item__media">
                        <img src="${item.product_image_url || "/assets/hero-keychain.svg"}" alt="${item.product_name}">
                      </div>
                      <div class="mock-admin-order-item__body">
                        <h4>${item.product_name}</h4>
                        <p>Quantity: ${item.quantity}</p>
                        <p>${formatMoney(item.unit_price_egp)} each</p>
                      </div>
                      <strong>${formatMoney(item.line_total_egp)}</strong>
                    </article>
                  `
                )
                .join("")
            : '<p class="mock-admin-empty">No order items recorded.</p>'}
        </div>
      </div>
    `;

    qs("[data-save-order-status]", wrap)?.addEventListener("click", () => {
      const nextStatus = qs("[data-order-status]", wrap)?.value || order.status;
      void updateOrderStatus(order.id, nextStatus);
    });
  };

  const loadOrder = async () => {
    const orderId = orderIdFromUrl();
    if (!orderId) {
      state.order = null;
      renderOrderDetail();
      setStatus("Order id is required in the URL.", "error");
      return;
    }

    setStatus("Loading order details...");
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}`, {
      headers: adminHeaders(),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Could not load the order.");
    }

    state.order = data?.order || null;
    renderOrderDetail();
    setStatus(`Loaded order #${state.order?.order_number || state.order?.id || orderId}.`, "success");
  };

  const updateOrderStatus = async (orderId, status) => {
    setStatus("Updating order status...");
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Could not update the order status.");
    }

    state.order = data?.order || state.order;
    renderOrderDetail();
    setStatus("Order status updated.", "success");
  };

  document.addEventListener("DOMContentLoaded", async () => {
    renderOrderDetail();
    try {
      await loadOrder();
    } catch (error) {
      setStatus(error.message || "Could not load the order.", "error");
    }
  });
})();
