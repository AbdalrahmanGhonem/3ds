(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const API_BASE =
    window.__API_BASE ||
    (origin && origin !== "null" && !origin.startsWith("file:") ? origin : FALLBACK_API_BASE);

  const CART_STORAGE_KEY = "cart";
  const GUEST_CART_KEY = "guest_cart_token";
  const PRODUCTS_CACHE_KEY = "products_cache_v1";
  const DEFAULT_IMAGE = "assets/hero-keychain.svg";
  const DEFAULT_FAQS = [
    {
      question: "How long does printing take?",
      answer: "Standard prints ship in 2-4 business days across Egypt."
    },
    {
      question: "Can I add custom text?",
      answer: "Yes, add your name or short text in the order notes."
    },
    {
      question: "Which materials do you use?",
      answer: "Premium PLA+/PETG with durable split rings and clean finishing."
    }
  ];
  const REFERENCE_SWATCHES = ["#d9d9d4", "#20b394", "#9c4fc3", "#6d9ead", "#6f767c"];
  const PRODUCT_COPY_LIBRARY = [
    {
      match: ["raccoon", "raco"],
      name: "Articulated Raccoon Keychain",
      description:
        "A high-quality 3D printed keychain with a flexible, articulated design that moves naturally. Perfect for keys, bags, and gifts."
    },
    {
      match: ["shark"],
      name: "Gray Shark Keychain",
      description:
        "A high-quality 3D printed shark keychain with a flexible articulated body and a clean gray finish. Perfect for keys, bags, and gifts."
    },
    {
      match: ["dog"],
      name: "Cute Dog Keychain",
      description:
        "A high-quality 3D printed dog keychain with a flexible articulated design and a smooth finish. Perfect for keys, bags, and gifts."
    },
    {
      match: ["chameleon"],
      name: "Multicolor Chameleon Keychain",
      description:
        "A high-quality 3D printed chameleon keychain with a flexible segmented design and bold color detail. Perfect for keys, bags, and gifts."
    },
    {
      match: ["ankylosaurus", "dino", "dinosaur"],
      name: "Teal Dinosaur Keychain",
      description:
        "A high-quality 3D printed dinosaur keychain with a flexible articulated design that moves naturally. Perfect for keys, bags, and gifts."
    }
  ];

  const state = {
    cart: [],
    products: [],
    theme: localStorage.getItem("theme") || "dark",
    holiday: localStorage.getItem("holiday") === "1"
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

  const refineProductContent = (product = {}) => {
    const haystack = `${product.slug || ""} ${product.name || ""}`.toLowerCase();
    const matched = PRODUCT_COPY_LIBRARY.find((entry) => entry.match.some((term) => haystack.includes(term)));
    return {
      name: matched?.name || product.name || "Flexible 3D Keychain",
      description:
        matched?.description ||
        "A high-quality 3D printed keychain with a flexible, articulated design that moves naturally. Perfect for keys, bags, and gifts."
    };
  };

  const normalizeProducts = (products = []) =>
    products.map((product, index) => {
      const refined = refineProductContent(product);
      return {
        id: String(product.id ?? product.slug ?? `product-${index}`),
        slug: product.slug || String(product.id ?? `product-${index}`),
        name: refined.name,
        price: 300,
        description: refined.description,
        image: product.image_url || product.image || DEFAULT_IMAGE,
        featured: Boolean(product.featured)
      };
    });

  const defaultProducts = () => [
    {
      id: "1",
      slug: "gray-raccoon-keychain",
      name: "Articulated Raccoon Keychain",
      price: 300,
      description: "A high-quality 3D printed keychain with a flexible, articulated design that moves naturally. Perfect for keys, bags, and gifts.",
      image: DEFAULT_IMAGE,
      featured: true
    },
    {
      id: "2",
      slug: "multicolor-chameleon-keychain",
      name: "Multicolor Chameleon Keychain",
      price: 300,
      description: "A high-quality 3D printed chameleon keychain with a flexible segmented design and bold color detail. Perfect for keys, bags, and gifts.",
      image: DEFAULT_IMAGE,
      featured: true
    },
    {
      id: "3",
      slug: "teal-ankylosaurus-keychain",
      name: "Teal Dinosaur Keychain",
      price: 300,
      description: "A high-quality 3D printed dinosaur keychain with a flexible articulated design that moves naturally. Perfect for keys, bags, and gifts.",
      image: DEFAULT_IMAGE,
      featured: true
    },
    {
      id: "4",
      slug: "gray-shark-keychain",
      name: "Gray Shark Keychain",
      price: 300,
      description: "A high-quality 3D printed shark keychain with a flexible articulated body and a clean gray finish. Perfect for keys, bags, and gifts.",
      image: DEFAULT_IMAGE,
      featured: true
    }
  ];

  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString("en-EG")} EGP`;

  const persistProductsCache = (products) => {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  };

  const loadCachedProducts = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || "[]");
      return Array.isArray(saved) ? normalizeProducts(saved) : [];
    } catch {
      return [];
    }
  };

  const loadCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        state.cart = saved
          .filter((line) => line && line.id && Number(line.qty) > 0)
          .map((line) => ({ id: String(line.id), qty: Number(line.qty) }));
      }
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
          .filter((item) => Number.isFinite(item.product_id) && item.product_id > 0 && item.quantity > 0);
        await fetch(`${API_BASE}/api/cart`, {
          method: "POST",
          headers: cartHeaders(),
          body: JSON.stringify({ items })
        });
      } catch (error) {
        console.warn("Failed to save cart", error);
      }
    }, 300);
  };

  const toggleCart = (show) => {
    const drawer = qs("[data-cart-drawer]");
    if (!drawer) return;
    drawer.classList.toggle("active", show);
    drawer.setAttribute("aria-hidden", show ? "false" : "true");
  };

  const animateBadge = () => {
    const badge = qs("[data-cart-count]");
    if (!badge) return;
    badge.classList.add("pulse");
    setTimeout(() => badge.classList.remove("pulse"), 220);
  };

  const addToCart = (id, quantity = 1) => {
    const existing = state.cart.find((line) => line.id === String(id));
    if (existing) {
      existing.qty += quantity;
    } else {
      state.cart.push({ id: String(id), qty: quantity });
    }
    animateBadge();
    renderCart(true);
  };

  const renderCart = (openDrawer = false) => {
    const wrap = qs("#cart-lines");
    const totalEl = qs("[data-cart-total]");
    const countEls = qsa("[data-cart-count]");
    if (!wrap || !totalEl || countEls.length === 0) return;

    wrap.innerHTML = "";
    let total = 0;
    let count = 0;

    if (state.cart.length === 0) {
      wrap.innerHTML = '<p class="text">Your cart is empty.</p>';
    } else {
      state.cart.forEach((line) => {
        const product = state.products.find((item) => item.id === line.id);
        if (!product) return;
        const lineTotal = product.price * line.qty;
        total += lineTotal;
        count += line.qty;

        const row = document.createElement("div");
        row.className = "cart-line";
        row.innerHTML = `
          <div>
            <div>${product.name}</div>
            <div class="price">${formatMoney(lineTotal)}</div>
          </div>
          <div class="qty">
            <button type="button" data-qty-change="-1">-</button>
            <span>${line.qty}</span>
            <button type="button" data-qty-change="1">+</button>
          </div>
          <button type="button" class="linklike" data-remove>Remove</button>
        `;

        qsa("[data-qty-change]", row).forEach((button) => {
          button.addEventListener("click", () => {
            line.qty = Math.max(1, line.qty + Number(button.dataset.qtyChange || 0));
            renderCart();
          });
        });
        qs("[data-remove]", row)?.addEventListener("click", () => {
          state.cart = state.cart.filter((item) => item.id !== line.id);
          renderCart();
        });
        wrap.appendChild(row);
      });
    }

    totalEl.textContent = formatMoney(total);
    countEls.forEach((el) => {
      el.textContent = String(count);
    });
    persistCart();
    scheduleCartSave();
    if (openDrawer && count > 0) toggleCart(true);
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
        renderCart();
      }
    } catch (error) {
      console.warn("Failed to load cart", error);
    }
  };

  const getSelectedProduct = () => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("id") || params.get("slug");
    return (
      state.products.find((product) => product.id === requested || product.slug === requested) ||
      state.products[0] ||
      null
    );
  };

  const renderHomeProducts = () => {
    const grid = qs("#home-product-grid");
    if (!grid) return;
    grid.innerHTML = "";

    state.products.forEach((product) => {
      const card = document.createElement("a");
      card.className = "reference-product-card";
      card.href = `shop.html?id=${encodeURIComponent(product.id)}`;
      card.innerHTML = `
        <div class="reference-product-card__image">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="reference-product-card__body">
          <p class="reference-product-card__title">${product.name}</p>
          <div class="reference-product-card__price">${formatMoney(product.price)}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  };

  const renderProductPage = () => {
    const page = qs("#product-page");
    if (!page) return;

    const product = getSelectedProduct();
    if (!product) {
      page.innerHTML = '<p class="text" style="padding:16px;">No product found.</p>';
      return;
    }

    page.innerHTML = `
      <article class="product-reference-card">
        <div class="product-reference-card__media">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-reference-card__body">
          <h1>${product.name}</h1>
          <strong class="price">${formatMoney(product.price)}</strong>
          <div class="product-trust-block">
            <div>4.8/5 customer rating</div>
            <div>Limited stock available</div>
            <div>Delivery within 2-3 days</div>
          </div>
          <div class="swatch-row" aria-label="Color selection">
            ${REFERENCE_SWATCHES.map((color, index) => `<button class="swatch${index === 0 ? " is-selected" : ""}" type="button" style="background:${color};" data-swatch aria-label="Color ${index + 1}"></button>`).join("")}
          </div>
          <div class="qty-control" aria-label="Quantity selector">
            <button type="button" data-product-qty-change="-1">-</button>
            <span data-product-qty>1</span>
            <button type="button" data-product-qty-change="1">+</button>
          </div>
          <h2 class="product-reference-section-title">Description</h2>
          <p class="product-reference-description">${product.description}</p>
          <button class="reference-primary-button" type="button" data-product-add>Buy Now - 300 EGP</button>
          <div class="product-reassurance-block">
            <div>Cash on Delivery Available</div>
            <div>Easy Returns</div>
            <div>Trusted by 100+ customers</div>
          </div>
        </div>
      </article>
    `;

    let quantity = 1;
    qsa("[data-swatch]", page).forEach((swatch) => {
      swatch.addEventListener("click", () => {
        qsa("[data-swatch]", page).forEach((item) => item.classList.remove("is-selected"));
        swatch.classList.add("is-selected");
      });
    });
    qsa("[data-product-qty-change]", page).forEach((button) => {
      button.addEventListener("click", () => {
        quantity = Math.max(1, quantity + Number(button.dataset.productQtyChange || 0));
        const qtyValue = qs("[data-product-qty]", page);
        if (qtyValue) qtyValue.textContent = String(quantity);
      });
    });
    qs("[data-product-add]", page)?.addEventListener("click", () => addToCart(product.id, quantity));
  };

  const renderFaq = () => {
    const wrap = qs("#faq-list");
    if (!wrap) return;
    wrap.innerHTML = "";

    DEFAULT_FAQS.forEach((item) => {
      const block = document.createElement("div");
      block.className = "accordion-item";
      block.innerHTML = `
        <button class="accordion-header" type="button" aria-expanded="false">
          <span>${item.question}</span>
          <span>+</span>
        </button>
        <div class="accordion-body">
          <p>${item.answer}</p>
        </div>
      `;
      qs("button", block)?.addEventListener("click", () => {
        const open = block.classList.toggle("open");
        qs("button", block)?.setAttribute("aria-expanded", open ? "true" : "false");
      });
      wrap.appendChild(block);
    });
  };

  const setThumb = (src) => {
    const thumb = qs("[data-image-thumb]");
    if (!thumb) return;
    if (!src) {
      thumb.hidden = true;
      thumb.innerHTML = "";
      return;
    }
    thumb.hidden = false;
    thumb.innerHTML = `<img src="${src}" alt="Preview">`;
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const bindImageUpload = () => {
    const dropzone = qs("[data-dropzone]");
    const input = qs("[data-image-input]");
    const trigger = qs("[data-image-trigger]");
    const form = qs("#product-form");
    if (!dropzone || !input || !form) return;

    const handleFile = async (file) => {
      if (!file || !file.type.startsWith("image/")) return;
      const dataUrl = await readFileAsDataUrl(file);
      form.dataset.imageData = dataUrl;
      setThumb(dataUrl);
    };

    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });
    dropzone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files?.[0]));
    input.addEventListener("change", (event) => handleFile(event.target.files?.[0]));
    trigger?.addEventListener("click", () => input.click());
  };

  const renderAdminTable = () => {
    const wrap = qs("#product-table");
    if (!wrap) return;
    wrap.innerHTML = "";

    if (state.products.length === 0) {
      wrap.innerHTML = '<p class="text">No products yet.</p>';
      return;
    }

    state.products.forEach((product) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div>
          <strong>${product.name}</strong>
          <div class="text">${formatMoney(product.price)}</div>
        </div>
        <div class="admin-actions">
          <button type="button" data-edit="${product.id}">Edit</button>
          <button type="button" data-delete="${product.id}">Delete</button>
        </div>
      `;
      qs("[data-edit]", row)?.addEventListener("click", () => loadIntoForm(product.id));
      qs("[data-delete]", row)?.addEventListener("click", () => deleteProduct(product.id));
      wrap.appendChild(row);
    });
  };

  const resetForm = () => {
    const form = qs("#product-form");
    const status = qs("#form-status");
    if (!form) return;
    form.reset();
    form.dataset.editing = "";
    form.dataset.imageData = "";
    setThumb("");
    const action = qs("[data-form-action]");
    if (action) action.textContent = "Save product";
    if (status) {
      status.hidden = true;
      status.textContent = "";
    }
  };

  const loadIntoForm = (id) => {
    const form = qs("#product-form");
    const status = qs("#form-status");
    if (!form) return;
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    form.name.value = product.name;
    form.price.value = product.price;
    form.description.value = product.description;
    form.featured.checked = Boolean(product.featured);
    form.dataset.editing = product.id;
    form.dataset.imageData = product.image;
    setThumb(product.image);
    const action = qs("[data-form-action]");
    if (action) action.textContent = "Update product";
    if (status) {
      status.hidden = false;
      status.textContent = "Editing product...";
    }
  };

  const refreshProductViews = () => {
    renderHomeProducts();
    renderProductPage();
    renderAdminTable();
    renderCart();
  };

  const setProducts = (products) => {
    state.products = normalizeProducts(products);
    refreshProductViews();
  };

  const fetchProducts = async () => {
    const fetchFrom = async (base) => {
      const response = await fetch(`${base}/api/products`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected response shape");
      return normalizeProducts(data);
    };

    try {
      const products = await fetchFrom(API_BASE);
      persistProductsCache(products);
      setProducts(products);
      return;
    } catch (error) {
      console.warn("Primary product fetch failed", error);
    }

    if (API_BASE !== FALLBACK_API_BASE) {
      try {
        const products = await fetchFrom(FALLBACK_API_BASE);
        persistProductsCache(products);
        setProducts(products);
        return;
      } catch (error) {
        console.warn("Fallback product fetch failed", error);
      }
    }

    const cached = loadCachedProducts();
    if (cached.length) {
      setProducts(cached);
      return;
    }

    setProducts(defaultProducts());
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: adminHeaders()
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchProducts();
    } catch (error) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const bindForm = () => {
    const form = qs("#product-form");
    const resetButton = qs("#reset-form");
    const status = qs("#form-status");
    if (!form) return;

    bindImageUpload();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const editingId = form.dataset.editing;
      const name = String(data.get("name") || "Untitled product").trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `product-${Date.now()}`;
      const payload = {
        slug,
        name,
        price_egp: Number(data.get("price")) || 300,
        description: String(data.get("description") || "").trim(),
        image_url: form.dataset.imageData || DEFAULT_IMAGE,
        featured: data.get("featured") === "on",
        is_active: 1
      };

      try {
        const response = await fetch(editingId ? `${API_BASE}/api/products/${editingId}` : `${API_BASE}/api/products`, {
          method: editingId ? "PUT" : "POST",
          headers: adminHeaders(),
          body: JSON.stringify(payload)
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        if (status) {
          status.hidden = false;
          status.textContent = "Saved!";
        }
        resetForm();
        await fetchProducts();
      } catch (error) {
        if (status) {
          status.hidden = false;
          status.textContent = error.message;
        }
      }
    });

    resetButton?.addEventListener("click", resetForm);
  };

  const exportProducts = () => {
    const blob = new Blob([JSON.stringify(state.products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const bindImportExport = () => {
    qs("[data-export-products]")?.addEventListener("click", exportProducts);
    qs("[data-import-products]")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed)) throw new Error("Invalid JSON file");
          const products = normalizeProducts(parsed);
          persistProductsCache(products);
          setProducts(products);
          const label = qs("[data-import-label]");
          if (label) label.textContent = file.name;
        } catch {
          alert("Could not read file.");
        }
      };
      reader.readAsText(file);
    });
  };

  const bindCheckoutForm = () => {
    const form = qs("[data-checkout-form]");
    const status = qs("[data-checkout-status]");
    const paymentHint = qs("[data-payment-hint]");
    const cardFields = qs("[data-card-fields]");
    if (!form || !status) return;

    const paymentSelect = form.querySelector('select[name="payment"]');
    const updatePaymentState = () => {
      const value = paymentSelect?.value || "";
      if (paymentHint) paymentHint.hidden = !(value === "instapay" || value === "vodafone");
      if (cardFields) cardFields.hidden = value !== "card";
    };

    paymentSelect?.addEventListener("change", updatePaymentState);
    updatePaymentState();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      status.hidden = false;
      status.textContent = state.cart.length ? "Order received! We will contact you shortly." : "Add items to your cart before checkout.";
      if (state.cart.length) form.reset();
      updatePaymentState();
    });
  };

  const bindContactForm = () => {
    const form = qs("#contact-form");
    const status = qs("#contact-status");
    if (!form || !status) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      status.hidden = false;
      status.textContent = "Sent! We'll get back to you soon.";
      form.reset();
    });
  };

  const bindThemeToggle = () => {
    qs("[data-theme-toggle]")?.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.body.classList.toggle("light", state.theme === "light");
      localStorage.setItem("theme", state.theme);
      const label = qs("[data-theme-label]");
      if (label) label.textContent = state.theme === "light" ? "Dark" : "Light";
    });
  };

  const bindHolidayToggle = () => {
    qs("[data-holiday-toggle]")?.addEventListener("click", () => {
      state.holiday = !state.holiday;
      document.body.classList.toggle("holiday", state.holiday);
      localStorage.setItem("holiday", state.holiday ? "1" : "0");
      const label = qs("[data-holiday-label]");
      if (label) label.textContent = state.holiday ? "Holiday off" : "Holiday";
    });
  };

  const bindLanguageSelect = () => {
    qs("[data-language-select]")?.addEventListener("change", (event) => {
      document.documentElement.lang = event.target.value;
      document.documentElement.dir = event.target.value === "ar" ? "rtl" : "ltr";
    });
  };

  const bindCartDrawer = () => {
    qsa("[data-cart-open]").forEach((button) => button.addEventListener("click", () => toggleCart(true)));
    qsa("[data-cart-close]").forEach((button) => button.addEventListener("click", () => toggleCart(false)));
    qs(".cart-backdrop")?.addEventListener("click", () => toggleCart(false));
  };

  const setYear = () => {
    const year = qs("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  };

  document.addEventListener("DOMContentLoaded", async () => {
    document.body.classList.toggle("light", state.theme === "light");
    document.body.classList.toggle("holiday", state.holiday);
    setYear();
    bindLanguageSelect();
    bindThemeToggle();
    bindHolidayToggle();
    bindCartDrawer();
    bindForm();
    bindImportExport();
    bindCheckoutForm();
    bindContactForm();
    renderFaq();
    loadCart();
    renderCart();

    const cachedProducts = loadCachedProducts();
    if (cachedProducts.length) {
      setProducts(cachedProducts);
    }

    await fetchProducts();
    syncCartFromApi();
  });
})();
