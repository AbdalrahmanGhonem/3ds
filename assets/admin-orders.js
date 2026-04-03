(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const hostname = window.location?.hostname || "";
  const hasHttpOrigin = origin && origin !== "null" && !origin.startsWith("file:");
  const isLocalDevelopmentHost = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$/i.test(hostname);
  const API_BASE = hasHttpOrigin && !isLocalDevelopmentHost ? origin : window.__API_BASE || (hasHttpOrigin ? origin : FALLBACK_API_BASE);

  const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

  const state = {
    orders: [],
    selectedOrder: null,
    selectedOrderId: null,
    filters: {
      status: "",
      q: ""
    }
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
  const selectedColorLabel = (value) => String(value || "").trim() || "Default";

  const orderDetailHref = (orderId) => `admin-order.html?id=${encodeURIComponent(orderId)}`;

  const setStatus = (message, tone = "info") => {
    const status = qs("[data-admin-status]");
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

  const setAuthUi = () => {
    const badge = qs("[data-admin-mode-badge]");
    const note = qs("[data-admin-note]");
    const authLink = qs("[data-auth-link]");
    const user = currentUser();
    const isAdmin = Boolean(user?.is_admin);

    if (badge) badge.textContent = isAdmin ? "Admin" : "Login Required";
    if (note) {
      note.textContent = isAdmin
        ? "Orders are loaded from the backend database. Select an order to view its items and update the delivery status."
        : "Log in with an admin account to access order management.";
    }
    if (authLink) {
      authLink.textContent = isAdmin ? "Account" : "Log in";
      authLink.href = isAdmin ? "account.html" : "login.html";
    }
  };

  const ordersUrl = () => {
    const params = new URLSearchParams();
    if (state.filters.status) params.set("status", state.filters.status);
    if (state.filters.q) params.set("q", state.filters.q);
    const query = params.toString();
    return `${API_BASE}/api/admin/orders${query ? `?${query}` : ""}`;
  };

  const syncFiltersFromDom = () => {
    state.filters.status = String(qs("[data-admin-filter-status]")?.value || "").trim().toLowerCase();
    state.filters.q = String(qs("[data-admin-filter-query]")?.value || "").trim();
  };

  const bindFilterControls = () => {
    const form = qs("[data-admin-filter-form]");
    const resetButton = qs("[data-admin-filter-reset]");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      syncFiltersFromDom();
      void loadOrders();
    });

    resetButton?.addEventListener("click", () => {
      form.reset();
      state.filters.status = "";
      state.filters.q = "";
      void loadOrders();
    });
  };

  const renderOrderList = () => {
    const list = qs("#admin-order-list");
    if (!list) return;

    if (!state.orders.length) {
      list.innerHTML = '<p class="mock-admin-empty">No orders yet.</p>';
      return;
    }

    const orderItemCount = (order) => {
      if (Number.isFinite(Number(order?.item_count)) && Number(order.item_count) > 0) {
        return Number(order.item_count);
      }
      if (Array.isArray(order?.items)) {
        return order.items.length;
      }
      return 0;
    };

    list.innerHTML = state.orders
      .map(
        (order) => `
          <article class="mock-admin-order${state.selectedOrderId === order.id ? " is-selected" : ""}">
            <button class="mock-admin-order__select" type="button" data-order-id="${order.id}">
              <div class="mock-admin-order__top">
                <div>
                  <h3>#${order.order_number || order.id}</h3>
                  <p>${order.customer_name || "Unknown customer"}</p>
                </div>
                <span class="mock-pill-badge">${titleCase(order.status)}</span>
              </div>
              <div class="mock-admin-order__meta">
                <span>${order.phone || "-"}</span>
                <span>${formatMoney(order.total_egp)}</span>
                <span>${titleCase(order.payment_method)}</span>
                <span>${formatDate(order.created_at)}</span>
              </div>
            </button>
            <div class="mock-admin-order__footer">
              <span>${orderItemCount(order)} item${orderItemCount(order) === 1 ? "" : "s"}</span>
              <a class="mock-admin-order__view" href="${orderDetailHref(order.id)}">View details</a>
            </div>
          </article>
        `
      )
      .join("");

    qsa("[data-order-id]", list).forEach((button) => {
      button.addEventListener("click", () => {
        void loadOrderDetail(button.dataset.orderId);
      });
    });
  };

  const renderOrderDetail = () => {
    const wrap = qs("#admin-order-detail");
    if (!wrap) return;

    const order = state.selectedOrder;
    if (!order) {
      wrap.innerHTML = '<p class="mock-admin-empty">Select an order to inspect it.</p>';
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
            <p><strong>Created:</strong> ${formatDate(order.created_at)}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
            <p><strong>Governorate:</strong> ${order.governorate || "-"}</p>
            <p><strong>District:</strong> ${order.district || "-"}</p>
            <p><strong>Subtotal:</strong> ${formatMoney(order.subtotal_egp)}</p>
            <p><strong>Shipping:</strong> ${Number(order.shipping_egp) === 0 ? "Free" : formatMoney(order.shipping_egp)}</p>
            <p><strong>Payment:</strong> ${titleCase(order.payment_method)}</p>
            <p><strong>Total:</strong> ${formatMoney(order.total_egp)}</p>
            <p><strong>Status:</strong> ${titleCase(order.status)}</p>
            <p class="mock-admin-order-summary__address"><strong>Address:</strong> ${order.address}</p>
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
          ${order.items.length
            ? order.items
                .map(
                  (item) => `
                    <article class="mock-admin-order-item">
                      <div class="mock-admin-order-item__media">
                        <img src="${item.product_image_url || "/assets/hero-keychain.svg"}" alt="${item.product_name}">
                      </div>
                      <div class="mock-admin-order-item__body">
                        <h4>${item.product_name}</h4>
                        <p>Color: ${selectedColorLabel(item.selected_color)}</p>
                        <p>Slug: ${item.product_slug || "-"}</p>
                        <p>${formatMoney(item.unit_price_egp)} x ${item.quantity}</p>
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

  const loadOrders = async () => {
    setStatus("Loading orders...");
    const response = await fetch(ordersUrl(), {
      headers: adminHeaders(),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Could not load orders.");
    }

    state.orders = Array.isArray(data?.orders) ? data.orders : [];
    renderOrderList();

    if (!state.orders.length) {
      state.selectedOrder = null;
      state.selectedOrderId = null;
      renderOrderDetail();
      setStatus("No orders match the current filters.");
      return;
    }

    const nextOrderId = state.selectedOrderId && state.orders.some((order) => order.id === state.selectedOrderId)
      ? state.selectedOrderId
      : state.orders[0].id;
    await loadOrderDetail(nextOrderId, false);
    const filterSummary = [state.filters.status ? `status: ${titleCase(state.filters.status)}` : "", state.filters.q ? `search: "${state.filters.q}"` : ""]
      .filter(Boolean)
      .join(" | ");
    setStatus(
      `Loaded ${state.orders.length} order${state.orders.length === 1 ? "" : "s"}${filterSummary ? ` (${filterSummary})` : ""}.`,
      "success"
    );
  };

  const loadOrderDetail = async (orderId, showLoading = true) => {
    if (showLoading) setStatus("Loading order details...");
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}`, {
      headers: adminHeaders(),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Could not load the order.");
    }

    state.selectedOrder = data?.order || null;
    state.selectedOrderId = state.selectedOrder?.id || null;
    renderOrderList();
    renderOrderDetail();
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

    state.selectedOrder = data?.order || state.selectedOrder;
    state.selectedOrderId = state.selectedOrder?.id || state.selectedOrderId;
    state.orders = state.orders.map((order) =>
      order.id === state.selectedOrderId ? { ...order, status: state.selectedOrder.status, total_egp: state.selectedOrder.total_egp } : order
    );
    renderOrderList();
    renderOrderDetail();
    setStatus("Order status updated.", "success");
  };

  document.addEventListener("DOMContentLoaded", async () => {
    setAuthUi();
    bindFilterControls();
    renderOrderList();
    renderOrderDetail();

    try {
      await loadOrders();
    } catch (error) {
      setStatus(error.message || "Could not load orders.", "error");
    }
  });
})();
