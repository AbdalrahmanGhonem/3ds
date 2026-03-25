(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const API_BASE =
    window.__API_BASE ||
    (origin && origin !== "null" && !origin.startsWith("file:") ? origin : FALLBACK_API_BASE);

  const PRODUCT_SOURCE = "assets/products.json";
  const PRODUCT_IMAGE_FALLBACK = "assets/hero-keychain.svg";
  const CART_STORAGE_KEY = "cart";
  const GUEST_CART_KEY = "guest_cart_token";

  const state = {
    user: null,
    products: [],
    cart: [],
    orders: []
  };

  const currentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const getGuestToken = () => {
    let token = localStorage.getItem(GUEST_CART_KEY);
    if (!token) {
      token = `guest_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(GUEST_CART_KEY, token);
    }
    return token;
  };

  const authHeaders = () => {
    const user = currentUser();
    return {
      "Content-Type": "application/json",
      user_id: user?.id || "",
      is_admin: user?.is_admin ? "1" : "0"
    };
  };

  const cartHeaders = () => {
    const user = currentUser();
    return {
      "Content-Type": "application/json",
      user_id: user?.id || "",
      "x-guest-token": getGuestToken()
    };
  };

  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString("en-EG")} EGP`;
  const toBoolean = (value) => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";

  const normalizeProducts = (products = []) =>
    (Array.isArray(products) ? products : [])
      .map((product, index) => {
        const id = product?.id ?? product?.slug ?? `product-${index + 1}`;
        const name = String(product?.name || "").trim();
        const slug = String(product?.slug || "").trim();
        if (!id || !name) return null;
        return {
          id: String(id),
          slug,
          name,
          price: Number(product?.price_egp ?? product?.price ?? 0) || 0,
          image: String(product?.image_url || product?.image || PRODUCT_IMAGE_FALLBACK),
          color: String(product?.color || ""),
          featured: toBoolean(product?.featured)
        };
      })
      .filter(Boolean);

  const parseProductPayload = (payload) => {
    const products = normalizeProducts(payload);
    if (!products.length) throw new Error("Product source is empty");
    return products;
  };

  const loadProductsFromApi = async (base) => {
    const response = await fetch(`${base}/api/products`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load products API: HTTP ${response.status}`);
    return parseProductPayload(await response.json());
  };

  const loadProductsFromJson = async () => {
    const response = await fetch(PRODUCT_SOURCE, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load product source: HTTP ${response.status}`);
    return parseProductPayload(await response.json());
  };

  const loadProducts = async () => {
    try {
      state.products = await loadProductsFromApi(API_BASE);
      return;
    } catch {}

    try {
      state.products = await loadProductsFromJson();
    } catch {
      state.products = [];
    }
  };

  const loadLocalCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      state.cart = Array.isArray(saved)
        ? saved
            .filter((line) => line && line.id && Number(line.qty) > 0)
            .map((line) => ({ id: String(line.id), qty: Number(line.qty) }))
        : [];
    } catch {
      state.cart = [];
    }
  };

  const persistCart = () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  };

  const syncCartFromApi = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cart`, { headers: cartHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      state.cart = items
        .map((item) => ({ id: String(item.product_id), qty: Number(item.quantity) }))
        .filter((item) => item.qty > 0);
      persistCart();
    } catch {
      loadLocalCart();
    }
  };

  const loadAccount = async () => {
    const fallbackUser = currentUser();
    state.user = {
      id: String(fallbackUser?.id || ""),
      full_name: String(fallbackUser?.name || ""),
      email: String(fallbackUser?.email || ""),
      is_admin: Boolean(fallbackUser?.is_admin)
    };
    state.orders = [];

    try {
      const response = await fetch(`${API_BASE}/api/account`, {
        headers: authHeaders(),
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.user = {
        id: String(data?.user?.id || state.user.id || ""),
        full_name: String(data?.user?.full_name || state.user.full_name || ""),
        email: String(data?.user?.email || state.user.email || ""),
        is_admin: Boolean(data?.user?.is_admin)
      };
      state.orders = Array.isArray(data?.orders) ? data.orders : [];
    } catch {
      state.orders = [];
    }
  };

  const findProduct = (productId) => state.products.find((product) => product.id === String(productId));

  const cartSummary = () => {
    const itemCount = state.cart.reduce((sum, line) => sum + line.qty, 0);
    const total = state.cart.reduce((sum, line) => {
      const product = findProduct(line.id);
      return product ? sum + product.price * line.qty : sum;
    }, 0);
    return { itemCount, total };
  };

  const renderCartCount = () => {
    const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
    qsa("[data-cart-count]").forEach((node) => {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
  };

  const bindImageFallbacks = (parent = document) => {
    qsa("img[data-product-image]", parent).forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          if (image.dataset.fallbackApplied === "true") return;
          image.dataset.fallbackApplied = "true";
          image.src = PRODUCT_IMAGE_FALLBACK;
        },
        { once: true }
      );
    });
  };

  const renderProfile = () => {
    const wrap = qs("#account-profile-content");
    if (!wrap) return;
    const user = state.user || currentUser();
    wrap.innerHTML = `
      <div class="mock-account-profile">
        <div class="mock-summary-lines">
          <div class="mock-summary-line"><span>Full Name</span><span>${user.full_name || "-"}</span></div>
          <div class="mock-summary-line"><span>Email</span><span>${user.email || "-"}</span></div>
          <div class="mock-summary-line"><span>Account Type</span><span>${user.is_admin ? "Admin" : "Customer"}</span></div>
        </div>
        <div class="mock-account-actions">
          ${user.is_admin ? '<a href="admin-products.html" class="mock-secondary-button">Manage Products</a>' : ""}
          <button class="mock-secondary-button" type="button" data-account-logout>Log out</button>
        </div>
      </div>
    `;

    qs("[data-account-logout]", wrap)?.addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  };

  const renderCart = () => {
    const wrap = qs("#account-cart-content");
    if (!wrap) return;
    const { itemCount, total } = cartSummary();

    if (!state.cart.length) {
      wrap.innerHTML = `
        <div class="mock-empty-state">
          <p>Your cart is currently empty.</p>
          <a href="shop.html" class="mock-primary-button mock-empty-button">Continue Shopping</a>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="mock-account-cart-list">
        ${state.cart
          .map((line) => {
            const product = findProduct(line.id);
            if (!product) return "";
            return `
              <div class="mock-cart-item">
                <img src="${product.image || PRODUCT_IMAGE_FALLBACK}" alt="${product.name}" data-product-image>
                <div class="mock-cart-item__body">
                  <h3>${product.name}</h3>
                  <p>${formatMoney(product.price)} x ${line.qty}</p>
                  <strong>${formatMoney(product.price * line.qty)}</strong>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="mock-summary-lines">
        <div class="mock-summary-line"><span>Items</span><span>${itemCount}</span></div>
        <div class="mock-summary-line"><span>Total</span><span>${formatMoney(total)}</span></div>
      </div>
      <a href="cart.html" class="mock-primary-button mock-summary-button">Open Cart</a>
    `;
    bindImageFallbacks(wrap);
  };

  const renderOrders = () => {
    const wrap = qs("#account-orders-content");
    if (!wrap) return;

    if (!state.orders.length) {
      wrap.innerHTML = `
        <div class="mock-empty-state">
          <p>No previous orders yet.</p>
          <p class="mock-account-note">Your previous purchases will appear here when real orders exist for your account.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="mock-account-order-list">
        ${state.orders
          .map(
            (order) => `
              <article class="mock-account-order">
                <div class="mock-account-order__top">
                  <div>
                    <h3>Order #${order.id}</h3>
                    <p>${new Date(order.created_at).toLocaleDateString("en-GB")} · ${order.status}</p>
                  </div>
                  <strong>${formatMoney(order.total_egp)}</strong>
                </div>
                <div class="mock-summary-lines">
                  <div class="mock-summary-line"><span>Payment</span><span>${order.payment_method || "-"}</span></div>
                  <div class="mock-summary-line"><span>Shipping</span><span>${order.shipping_name || "-"}</span></div>
                </div>
                <div class="mock-account-order__items">
                  ${
                    order.items?.length
                      ? order.items
                          .map(
                            (item) => `
                              <div class="mock-account-order__item">
                                <img src="${item.image_url || PRODUCT_IMAGE_FALLBACK}" alt="${item.name}" data-product-image>
                                <div>
                                  <p>${item.name}</p>
                                  <span>${item.quantity} x ${formatMoney(item.unit_price)} · ${formatMoney(item.line_total)}</span>
                                </div>
                              </div>
                            `
                          )
                          .join("")
                      : '<p class="mock-account-note">No order items are available for this order.</p>'
                  }
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
    bindImageFallbacks(wrap);
  };

  document.addEventListener("DOMContentLoaded", async () => {
    loadLocalCart();
    renderCartCount();
    await Promise.allSettled([loadProducts(), syncCartFromApi(), loadAccount()]);
    renderCartCount();
    renderProfile();
    renderCart();
    renderOrders();
  });
})();
