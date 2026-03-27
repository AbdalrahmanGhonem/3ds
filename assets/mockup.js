(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const API_BASE =
    window.__API_BASE ||
    (origin && origin !== "null" && !origin.startsWith("file:") ? origin : FALLBACK_API_BASE);
  const PRODUCT_SOURCE = "/assets/products.json";
  const PRODUCT_IMAGE_FALLBACK = "/assets/hero-keychain.svg";

  const CART_STORAGE_KEY = "cart";
  const GUEST_CART_KEY = "guest_cart_token";
  const MANAGED_PRODUCTS_KEY = "managed_products_v1";
  const PRODUCTS_CACHE_KEY = "products_cache_v6";

  const trustItems = [
    { icon: "truck", text: "Fast Delivery (2-3 Days)" },
    { icon: "credit-card", text: "Cash on Delivery Available" },
    { icon: "shield-check", text: "Trusted by 100+ customers" },
    { icon: "rotate-ccw", text: "Easy Returns" }
  ];

  const faqs = [
    { q: "How long does delivery take?", a: "Orders are usually delivered within 2-3 business days." },
    { q: "Do you offer cash on delivery?", a: "Yes, cash on delivery is available for all eligible orders." },
    { q: "Can I return the product?", a: "Yes, returns are available based on the return policy and product condition." },
    { q: "How can I place an order?", a: "Choose your product, add it to cart, then complete the checkout form." }
  ];

  const iconPaths = {
    search: '<circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l5 5"></path>',
    user: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.8-3 4.2-4.5 7-4.5S17.2 16 19 19"></path>',
    cart: '<path d="M3 5h2l2.1 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7"></path><circle cx="10" cy="19" r="1.5"></circle><circle cx="18" cy="19" r="1.5"></circle>',
    menu: '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>',
    heart: '<path d="M12 20s-6.7-4.3-8.5-8C2 9 3.7 6 7 6c2 0 3.2 1.1 5 3 1.8-1.9 3-3 5-3 3.3 0 5 3 3.5 6-1.8 3.7-8.5 8-8.5 8Z"></path>',
    "chevron-right": '<path d="m9 18 6-6-6-6"></path>',
    plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    minus: '<path d="M5 12h14"></path>',
    truck: '<path d="M10 17h4"></path><path d="M2 7h11v7H2z"></path><path d="M13 10h4l3 3v1h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>',
    "credit-card": '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18"></path>',
    "shield-check": '<path d="M12 3 5 6v5c0 5 3.4 8.4 7 10 3.6-1.6 7-5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path>',
    phone: '<path d="M9.5 7.5 11 6l3 3-1.4 1.4a12 12 0 0 0 4 4L18 13l3 3-1.5 1.5c-.6.6-1.5.8-2.3.5-2.4-.8-4.6-2.2-6.6-4.2A16.6 16.6 0 0 1 6.4 7.8C6 7 6.2 6 6.8 5.4L8.3 4l3 3-1.8 1.8Z"></path>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path>',
    "map-pin": '<path d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"></path><circle cx="12" cy="10" r="2"></circle>',
    question: '<circle cx="12" cy="12" r="9"></circle><path d="M9.3 9a2.7 2.7 0 1 1 4.8 1.7c-.8.9-1.6 1.3-1.6 2.8"></path><path d="M12 17h.01"></path>'
  };

  const iconMarkup = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || ""}</svg>`;
  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString("en-EG")} EGP`;
  const toBoolean = (value) => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
  const featuredProducts = () => state.products.filter((product) => product.featured === true);
  const isExternalImageUrl = (value) => /^(?:[a-z]+:)?\/\//i.test(String(value || "").trim());
  const isDirectImageSource = (value) => /^(?:data:|blob:)/i.test(String(value || "").trim());

  const resolveProductImage = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return PRODUCT_IMAGE_FALLBACK;
    if (isExternalImageUrl(raw) || isDirectImageSource(raw)) return raw;

    const normalized = raw.replace(/\\/g, "/");
    if (normalized.startsWith("/")) return normalized;

    const uploadsMatch = normalized.match(/(?:^|.*?)(uploads\/.+)$/i);
    if (uploadsMatch?.[1]) {
      return `/${uploadsMatch[1].replace(/^\/+/, "")}`;
    }

    const assetsMatch = normalized.match(/(?:^|.*?)(assets\/.+)$/i);
    if (assetsMatch?.[1]) {
      return `/${assetsMatch[1].replace(/^\/+/, "")}`;
    }

    return `/${normalized.replace(/^\.?\//, "")}`;
  };

  const state = {
    products: [],
    cart: [],
    productRefreshNotice: ""
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

  const cartHeaders = () => {
    const user = currentUser();
    return {
      "Content-Type": "application/json",
      user_id: user?.id || "",
      "x-guest-token": getGuestToken()
    };
  };

  const normalizeProducts = (products = []) =>
    (Array.isArray(products) ? products : [])
      .map((product, index) => {
        const id = product?.id ?? product?.slug ?? `product-${index + 1}`;
        const name = String(product?.name || "").trim();
        const slug = String(product?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).trim();
        if (!id || !name || !slug) return null;
        return {
          id: String(id),
          slug,
          name,
          price: Number(product?.price_egp ?? product?.price ?? 300) || 300,
          color: String(product?.color || ""),
          image: resolveProductImage(product?.image_url || product?.image || PRODUCT_IMAGE_FALLBACK),
          description: String(product?.description || "").trim(),
          featured: toBoolean(product?.featured)
        };
      })
      .filter(Boolean);

  const productImageMarkup = (product) =>
    `<img src="${String(product?.image || PRODUCT_IMAGE_FALLBACK)}" alt="${product.name}" data-product-image>`;

  const loadCachedProducts = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || "[]");
      return normalizeProducts(saved);
    } catch {
      return [];
    }
  };

  const loadManagedProducts = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(MANAGED_PRODUCTS_KEY) || "[]");
      return normalizeProducts(saved);
    } catch {
      return [];
    }
  };

  const persistProductsCache = (products) => {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(normalizeProducts(products)));
  };

  const parseProductPayload = (payload) => {
    const products = normalizeProducts(payload);
    if (!products.length) throw new Error("Product source is empty");
    return products;
  };

  const logProductLoadError = (source, error) => {
    console.error(`[storefront] Product load failed from ${source}`, error);
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

  const loadProductsFromLocalFile = () =>
    new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", PRODUCT_SOURCE, true);
      request.responseType = "text";
      request.onload = () => {
        const isSuccessful =
          (request.status >= 200 && request.status < 300) ||
          (window.location.protocol === "file:" && request.status === 0 && request.responseText);
        if (!isSuccessful) {
          reject(new Error(`Failed to load local product source: HTTP ${request.status}`));
          return;
        }
        try {
          resolve(parseProductPayload(JSON.parse(request.responseText)));
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(new Error("Failed to load local product source"));
      request.send();
    });

  const bindProductImageFallbacks = (parent = document) => {
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

  const loadCart = () => {
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

  let cartSaveTimer = null;
  const scheduleCartSave = () => {
    if (cartSaveTimer) clearTimeout(cartSaveTimer);
    cartSaveTimer = setTimeout(async () => {
      try {
        const items = state.cart
          .map((line) => ({ product_id: Number(line.id), quantity: Number(line.qty) }))
          .filter((item) => item.product_id > 0 && item.quantity > 0);
        await fetch(`${API_BASE}/api/cart`, {
          method: "POST",
          headers: cartHeaders(),
          body: JSON.stringify({ items })
        });
      } catch (error) {
        console.warn("Failed to save cart", error);
      }
    }, 250);
  };

  const syncCartFromApi = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cart`, { headers: cartHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length) {
        state.cart = items
          .map((item) => ({ id: String(item.product_id), qty: Number(item.quantity) }))
          .filter((item) => item.qty > 0);
        persistCart();
        refreshCartUi();
      }
    } catch (error) {
      console.warn("Failed to load cart", error);
    }
  };

  const findProduct = (idOrSlug) =>
    state.products.find((product) => product.id === String(idOrSlug) || product.slug === idOrSlug);

  const cartCount = () => state.cart.reduce((sum, item) => sum + item.qty, 0);

  const totals = () => {
    const subtotal = state.cart.reduce((sum, line) => {
      const product = findProduct(line.id);
      return product ? sum + product.price * line.qty : sum;
    }, 0);
    const shipping = subtotal >= 500 || subtotal === 0 ? 0 : 60;
    return { subtotal, shipping, total: subtotal + shipping };
  };

  const renderIcons = (parent = document) => {
    qsa("[data-icon]", parent).forEach((node) => {
      node.innerHTML = iconMarkup(node.dataset.icon);
    });
  };

  const renderCartCount = () => {
    const count = cartCount();
    qsa("[data-cart-count]").forEach((node) => {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
  };

  const renderProductRefreshNotice = () => {
    const main = qs("main");
    if (!main) return;

    let notice = qs("[data-product-refresh-notice]");
    if (!state.productRefreshNotice) {
      notice?.remove();
      return;
    }

    if (!notice) {
      notice = document.createElement("div");
      notice.className = "mock-container";
      notice.dataset.productRefreshNotice = "true";
      notice.innerHTML = '<p class="mock-store-notice" data-store-notice-text></p>';
      main.prepend(notice);
    }

    const text = qs("[data-store-notice-text]", notice);
    if (text) {
      text.textContent = state.productRefreshNotice;
    }
  };

  const flashAddButton = (button) => {
    if (!button) return;
    const original = button.textContent;
    button.textContent = "Added";
    button.disabled = true;
    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 700);
  };

  const addToCart = (product, qty = 1, redirect = false, button = null) => {
    const existing = state.cart.find((item) => item.id === product.id);
    if (existing) existing.qty += qty;
    else state.cart.push({ id: product.id, qty });
    persistCart();
    scheduleCartSave();
    refreshCartUi();
    flashAddButton(button);
    if (redirect) window.location.href = "cart.html";
  };

  const updateCartQuantity = (productId, delta) => {
    const line = state.cart.find((item) => item.id === String(productId));
    if (!line) return;
    line.qty = Math.max(1, line.qty + delta);
    persistCart();
    scheduleCartSave();
    refreshCartUi();
  };

  const removeCartItem = (productId) => {
    state.cart = state.cart.filter((item) => item.id !== String(productId));
    persistCart();
    scheduleCartSave();
    refreshCartUi();
  };

  const productCardMarkup = (product) => `
    <article class="mock-product-card" data-product-card>
      <button class="mock-product-card__open" type="button" data-open-product="${product.slug}">
        <div class="mock-product-card__media-wrap">
          <div class="mock-product-card__media">
            ${productImageMarkup(product)}
          </div>
        </div>
        <div class="mock-product-card__body">
          <div class="mock-product-card__top">
            <h3>${product.name}</h3>
            <span class="mock-heart-button" aria-hidden="true">${iconMarkup("heart")}</span>
          </div>
          <div class="mock-product-card__meta">
            <p class="mock-product-card__price">${formatMoney(product.price)}</p>
            <span class="mock-pill-badge">${product.color}</span>
          </div>
        </div>
      </button>
      <div class="mock-product-card__cta">
        <button class="mock-primary-button" type="button" data-add-product="${product.slug}">Add to Cart</button>
      </div>
    </article>
  `;

  const bindProductCardEvents = (parent) => {
    qsa("[data-open-product]", parent).forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href = `shop.html?slug=${encodeURIComponent(button.dataset.openProduct)}`;
      });
    });
    qsa("[data-add-product]", parent).forEach((button) => {
      button.addEventListener("click", () => {
        const product = findProduct(button.dataset.addProduct);
        if (product) addToCart(product, 1, false, button);
      });
    });
  };

  const renderTrustBar = () => {
    const wrap = qs("#trust-bar");
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="mock-trust-grid">
        ${trustItems
          .map(
            (item) => `
              <div class="mock-trust-card">
                <div class="mock-trust-icon">${iconMarkup(item.icon)}</div>
                <p>${item.text}</p>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  };

  const renderProductGrid = (selector, products = state.products) => {
    const wrap = qs(selector);
    if (!wrap) return;
    wrap.innerHTML = products.map(productCardMarkup).join("");
    bindProductImageFallbacks(wrap);
    bindProductCardEvents(wrap);
  };

  const renderShopPage = () => {
    const gridWrap = qs("#shop-product-grid");
    const gridView = qs("#shop-grid-view");
    const productView = qs("#shop-product-view");
    const productWrap = qs("#product-page-content");
    const priceBadge = qs("[data-shop-price-badge]");
    const params = new URLSearchParams(window.location.search);
    const key = params.get("id") || params.get("slug");

    if (priceBadge) {
      const prices = state.products.map((product) => Number(product.price) || 0).filter((price) => price > 0);
      if (!prices.length) priceBadge.textContent = "Products";
      else if (new Set(prices).size === 1) priceBadge.textContent = `All Products ${formatMoney(prices[0])}`;
      else priceBadge.textContent = `From ${formatMoney(Math.min(...prices))}`;
    }

    if (gridWrap) {
      gridWrap.innerHTML = state.products.map(productCardMarkup).join("");
      bindProductImageFallbacks(gridWrap);
      bindProductCardEvents(gridWrap);
    }

    if (!productWrap || !gridView || !productView) return;
    if (!key) {
      gridView.hidden = false;
      productView.hidden = true;
      return;
    }

    const product = findProduct(key) || state.products[0];
    if (!product) return;

    gridView.hidden = true;
    productView.hidden = false;
    productWrap.innerHTML = `
      <article class="mock-product-layout">
        <div class="mock-product-media-column">
          <div class="mock-product-media-frame">
            ${productImageMarkup(product)}
          </div>
        </div>
        <div class="mock-product-content">
          <h1>${product.name}</h1>
          <p class="mock-product-price">${formatMoney(product.price)}</p>
          <div class="mock-detail-list">
            <p>4.8/5 customer rating</p>
            <p>Limited stock available</p>
            <p>Delivery within 2-3 days</p>
          </div>
          <div class="mock-color-row">
            <button class="mock-color-swatch is-selected" style="background:#E6E6E1" type="button"></button>
            <button class="mock-color-swatch" style="background:#27B494" type="button"></button>
            <button class="mock-color-swatch" style="background:#9445BD" type="button"></button>
            <button class="mock-color-swatch" style="background:#79A8B7" type="button"></button>
            <button class="mock-color-swatch" style="background:#6B747D" type="button"></button>
          </div>
          <div class="mock-qty-control">
            <button type="button" data-product-qty-change="-1">${iconMarkup("minus")}</button>
            <span data-product-qty>1</span>
            <button type="button" data-product-qty-change="1">${iconMarkup("plus")}</button>
          </div>
          <div class="mock-product-description">
            <h2>Description</h2>
            <p>${product.description}</p>
          </div>
          <button class="mock-primary-button mock-product-buy" type="button" data-buy-product="${product.slug}">Buy Now - ${formatMoney(product.price)}</button>
          <div class="mock-product-reassurance">
            <p>Cash on Delivery Available</p>
            <p>Easy Returns</p>
            <p>Trusted by 100+ customers</p>
          </div>
        </div>
      </article>
    `;
    bindProductImageFallbacks(productWrap);

    let qty = 1;
    qsa(".mock-color-swatch", productWrap).forEach((button) => {
      button.addEventListener("click", () => {
        qsa(".mock-color-swatch", productWrap).forEach((node) => node.classList.remove("is-selected"));
        button.classList.add("is-selected");
      });
    });
    qsa("[data-product-qty-change]", productWrap).forEach((button) => {
      button.addEventListener("click", () => {
        qty = Math.max(1, qty + Number(button.dataset.productQtyChange || 0));
        qs("[data-product-qty]", productWrap).textContent = String(qty);
        qs("[data-buy-product]", productWrap).textContent = `Buy Now - ${formatMoney(product.price * qty)}`;
      });
    });
    qs("[data-buy-product]", productWrap)?.addEventListener("click", (event) => {
      addToCart(product, qty, true, event.currentTarget);
    });
  };

  const renderCartPage = () => {
    const wrap = qs("#cart-page-content");
    if (!wrap) return;
    const { subtotal, shipping, total } = totals();
    wrap.innerHTML = `
      <div class="mock-two-column-layout">
        <article class="mock-surface-card">
          <div class="mock-surface-card__content">
            <h1 class="mock-page-title">Your Cart</h1>
            <div class="mock-cart-list">
              ${
                state.cart.length
                  ? state.cart
                      .map((line) => {
                        const product = findProduct(line.id);
                        if (!product) return "";
                        return `
                          <div class="mock-cart-item">
                            ${productImageMarkup(product)}
                            <div class="mock-cart-item__body">
                              <h3>${product.name}</h3>
                              <p>${formatMoney(product.price)} x ${line.qty}</p>
                              <strong>${formatMoney(product.price * line.qty)}</strong>
                              <div class="mock-cart-actions">
                                <div class="mock-cart-qty-control">
                                  <button type="button" data-cart-qty="-1" data-cart-product="${product.id}" aria-label="Decrease quantity">${iconMarkup("minus")}</button>
                                  <span>${line.qty}</span>
                                  <button type="button" data-cart-qty="1" data-cart-product="${product.id}" aria-label="Increase quantity">${iconMarkup("plus")}</button>
                                </div>
                                <button type="button" class="mock-cart-remove" data-cart-remove="${product.id}">Remove</button>
                              </div>
                            </div>
                          </div>
                        `;
                      })
                      .join("")
                  : '<div class="mock-empty-state"><p>Your cart is empty.</p><a href="shop.html" class="mock-primary-button mock-empty-button">Continue Shopping</a></div>'
              }
            </div>
          </div>
        </article>
        <aside class="mock-surface-card mock-summary-card">
          <div class="mock-surface-card__content">
            <h2 class="mock-summary-title">Order Summary</h2>
            <div class="mock-summary-lines">
              <div class="mock-summary-line"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
              <div class="mock-summary-line"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatMoney(shipping)}</span></div>
              <div class="mock-summary-line mock-summary-line--total"><span>Total</span><span>${formatMoney(total)}</span></div>
            </div>
            <p class="mock-summary-note">Free delivery on orders above 500 EGP</p>
            <a href="checkout.html" class="mock-primary-button mock-summary-button">Checkout</a>
          </div>
        </aside>
      </div>
    `;
    bindProductImageFallbacks(wrap);
    qsa("[data-cart-qty]", wrap).forEach((button) => {
      button.addEventListener("click", () => {
        updateCartQuantity(button.dataset.cartProduct, Number(button.dataset.cartQty || 0));
      });
    });
    qsa("[data-cart-remove]", wrap).forEach((button) => {
      button.addEventListener("click", () => {
        removeCartItem(button.dataset.cartRemove);
      });
    });
  };

  const renderCheckoutSummary = () => {
    const wrap = qs("#checkout-summary");
    if (!wrap) return;
    const { subtotal, shipping, total } = totals();
    wrap.innerHTML = `
      <div class="mock-surface-card__content">
        <h2 class="mock-summary-title">Order Summary</h2>
        <div class="mock-summary-mini-list">
          ${state.cart
            .map((line) => {
              const product = findProduct(line.id);
              if (!product) return "";
              return `<div class="mock-summary-mini-line"><span>${product.name} x ${line.qty}</span><strong>${formatMoney(product.price * line.qty)}</strong></div>`;
            })
            .join("")}
        </div>
        <div class="mock-summary-lines">
          <div class="mock-summary-line"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
          <div class="mock-summary-line"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatMoney(shipping)}</span></div>
          <div class="mock-summary-line mock-summary-line--total"><span>Total</span><span>${formatMoney(total)}</span></div>
        </div>
      </div>
    `;
  };

  const renderAboutPage = () => {
    const wrap = qs("#about-trust-grid");
    if (!wrap) return;
    wrap.innerHTML = trustItems
      .slice(0, 3)
      .map(
        (item) => `
          <div class="mock-info-card">
            <div class="mock-info-icon">${iconMarkup(item.icon)}</div>
            <p>${item.text}</p>
          </div>
        `
      )
      .join("");
  };

  const renderFaqPage = () => {
    const wrap = qs("#faq-list");
    if (!wrap) return;
    wrap.innerHTML = faqs
      .map(
        (item) => `
          <div class="mock-faq-item">
            <span>${iconMarkup("question")}</span>
            <div>
              <h3>${item.q}</h3>
              <p>${item.a}</p>
            </div>
          </div>
        `
      )
      .join("");
  };

  const bindContactForm = () => {
    const form = qs("#contact-form");
    const status = qs("#contact-status");
    if (!form || !status) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      status.hidden = false;
      status.textContent = "Message sent. We will get back to you soon.";
      form.reset();
    });
  };

  const bindCheckoutForm = () => {
    const button = qs("[data-checkout-submit]");
    const status = qs("[data-checkout-status]");
    const form = qs("[data-checkout-form]");
    if (!button || !status || !form) return;
    button.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      status.hidden = false;
      status.textContent = "Order submitted successfully.";
      form.reset();
      state.cart = [];
      persistCart();
      scheduleCartSave();
      refreshCartUi();
    });
  };

  const refreshCartUi = () => {
    renderCartCount();
    renderCartPage();
    renderCheckoutSummary();
  };

  const setProducts = (products) => {
    state.products = normalizeProducts(products);
    renderTrustBar();
    renderProductGrid("#home-product-grid", featuredProducts());
    renderShopPage();
    renderCartPage();
    renderCheckoutSummary();
    renderAboutPage();
    renderFaqPage();
    renderCartCount();
    renderIcons();
    renderProductRefreshNotice();
  };

  const hydrateProductsFromSafeFallback = () => {
    const cachedProducts = loadCachedProducts();
    if (cachedProducts.length) {
      setProducts(cachedProducts);
      return true;
    }

    const managedProducts = loadManagedProducts();
    if (managedProducts.length) {
      setProducts(managedProducts);
      return true;
    }

    return false;
  };

  const fetchProducts = async () => {
    const hasSafeHydration = hydrateProductsFromSafeFallback();
    state.productRefreshNotice = "";

    try {
      const products = await loadProductsFromApi(API_BASE);
      persistProductsCache(products);
      setProducts(products);
      return;
    } catch (error) {
      logProductLoadError(`primary API (${API_BASE})`, error);
    }

    if (API_BASE !== FALLBACK_API_BASE) {
      try {
        const products = await loadProductsFromApi(FALLBACK_API_BASE);
        persistProductsCache(products);
        setProducts(products);
        return;
      } catch (error) {
        logProductLoadError(`fallback API (${FALLBACK_API_BASE})`, error);
      }
    }

    const managedProducts = loadManagedProducts();
    if (managedProducts.length) {
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      setProducts(managedProducts);
      return;
    }

    try {
      const products = await loadProductsFromJson();
      persistProductsCache(products);
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      setProducts(products);
      return;
    } catch (error) {
      logProductLoadError("JSON fallback", error);
    }

    if (window.location.protocol === "file:") {
      try {
        const products = await loadProductsFromLocalFile();
        persistProductsCache(products);
        state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
        setProducts(products);
        return;
      } catch (error) {
        logProductLoadError("local file fallback", error);
      }
    }

    const cachedProducts = loadCachedProducts();
    if (cachedProducts.length) {
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      setProducts(cachedProducts);
      return;
    }

    if (hasSafeHydration && state.products.length) {
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      renderProductRefreshNotice();
      console.warn("[storefront] Keeping previously hydrated products after all live product sources failed.");
      return;
    }

    throw new Error("No products could be loaded from API, managed local data, JSON, or cache.");
  };

  document.addEventListener("DOMContentLoaded", async () => {
    renderIcons();
    loadCart();
    renderCartCount();
    bindContactForm();
    bindCheckoutForm();
    try {
      await fetchProducts();
    } catch (error) {
      console.error(error);
    }
    syncCartFromApi();
  });
})();
