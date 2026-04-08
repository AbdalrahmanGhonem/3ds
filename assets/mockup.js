(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const hostname = window.location?.hostname || "";
  const isFileRuntime = window.location?.protocol === "file:";
  const hasHttpOrigin = origin && origin !== "null" && !origin.startsWith("file:");
  const isLocalDevelopmentHost = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$/i.test(hostname);
  const isProductionRuntime = hasHttpOrigin && !isLocalDevelopmentHost;
  const API_BASE = isProductionRuntime
    ? origin
    : window.__API_BASE || (hasHttpOrigin ? origin : FALLBACK_API_BASE);
  const PRODUCT_SOURCE = "/assets/products.json";
  const PRODUCT_IMAGE_FALLBACK = "/assets/hero-keychain.svg";
  const ORDER_SUCCESS_STORAGE_KEY = "last_order_success_v1";
  const ORDER_WHATSAPP_NUMBER = String(window.__ORDER_WHATSAPP_NUMBER || "201003520303").replace(/\D/g, "");
  const PAYMENT_METHODS = {
    cash_on_delivery: {
      label: "Cash on Delivery",
      badge: "Available",
      description: "Cash on Delivery is fully supported right now."
    },
    vodafone_cash: {
      label: "Vodafone Cash",
      badge: "Manual",
      description: "Your order is saved and the payment step is confirmed manually after placement."
    },
    instapay: {
      label: "Instapay",
      badge: "Manual",
      description: "Your order is created first. Transfer the exact amount, then submit your transfer details for manual review."
    },
    stripe: {
      label: "Stripe",
      badge: "Prep Only",
      description: "Stripe is stored as your preferred payment method. No online charge is taken yet."
    }
  };
  const PAYMENT_STATUS_META = {
    pending: { label: "Pending", tone: "neutral" },
    pending_confirmation: { label: "Pending Confirmation", tone: "warning" },
    awaiting_review: { label: "Awaiting Review", tone: "warning" },
    confirmed: { label: "Confirmed", tone: "success" },
    rejected: { label: "Rejected", tone: "error" }
  };
  const INSTAPAY_DESTINATION_LABEL = String(window.__INSTAPAY_DESTINATION_LABEL || "InstaPay ID").trim() || "InstaPay ID";
  const INSTAPAY_DESTINATION_VALUE = String(window.__INSTAPAY_DESTINATION_VALUE || "your@instapay").trim() || "your@instapay";
  const INSTAPAY_OPEN_URL = String(window.__INSTAPAY_OPEN_URL || "https://ipn.eg/S/bassel.hana/instapay/5XCHJZ").trim();
  const DEFAULT_SELECTED_COLOR = "Default";
  const DEFAULT_PRODUCT_SWATCHES = [
    { name: "Ivory", hex: "#E6E6E1" },
    { name: "Teal", hex: "#27B494" },
    { name: "Violet", hex: "#9445BD" },
    { name: "Blue Gray", hex: "#79A8B7" },
    { name: "Slate", hex: "#6B747D" },
    { name: "Mint", hex: "#84D1B5" },
    { name: "Sand", hex: "#D9C3A0" }
  ];
  const PRODUCT_COLOR_HEX_BY_NAME = {
    gray: "#E6E6E1",
    grey: "#E6E6E1",
    white: "#F4F4F1",
    ivory: "#E6E6E1",
    teal: "#27B494",
    violet: "#9445BD",
    purple: "#9445BD",
    "blue gray": "#79A8B7",
    slate: "#6B747D",
    black: "#2F3740",
    brown: "#8B6B4A",
    red: "#C45D5D",
    mint: "#84D1B5",
    sand: "#D9C3A0"
  };

  const CART_STORAGE_KEY = "cart";
  const GUEST_CART_KEY = "guest_cart_token";
  const MANAGED_PRODUCTS_KEY = "managed_products_v2";
  const PRODUCTS_CACHE_KEY = "products_cache_v7";
  const LEGACY_MANAGED_PRODUCTS_KEYS = ["managed_products_v1"];
  const LEGACY_PRODUCTS_CACHE_KEYS = ["products_cache_v6"];
  const PRODUCTS_CACHE_VERSION_KEY = "storefront_products_cache_version";
  const PRODUCTS_CACHE_VERSION = "2026-03-27-live-catalog-v1";

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
  const DEFAULT_CONTACT_SETTINGS = {
    phone: "+20 100 000 0000",
    email: "hello@3ds-store.com",
    address: "Cairo, Egypt"
  };

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
  const escapeHtml = (value) =>
    String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const normalizeSelectedColor = (value) => String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const selectedColorLabel = (value, fallback = DEFAULT_SELECTED_COLOR) => normalizeSelectedColor(value || fallback) || fallback;
  const selectedColorKey = (value, fallback = DEFAULT_SELECTED_COLOR) => selectedColorLabel(value, fallback).toLowerCase();
  const colorHexForName = (name, fallback = DEFAULT_PRODUCT_SWATCHES[0].hex) =>
    PRODUCT_COLOR_HEX_BY_NAME[selectedColorKey(name, "")] || fallback;
  const buildProductColorOptions = (product) => {
    const primaryName = selectedColorLabel(product?.color, DEFAULT_PRODUCT_SWATCHES[0].name);
    const options = [{ name: primaryName, hex: colorHexForName(primaryName) }, ...DEFAULT_PRODUCT_SWATCHES];
    const seen = new Set();
    return options.filter((option) => {
      const key = selectedColorKey(option.name, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  };
  const toBoolean = (value) => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
  const currentPage = () => document.body?.dataset.page || "";
  const formatPaymentMethod = (value) =>
    PAYMENT_METHODS[String(value || "").trim().toLowerCase()]?.label ||
    String(value || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const getPaymentMethodMeta = (value) =>
    PAYMENT_METHODS[String(value || "").trim().toLowerCase()] || PAYMENT_METHODS.cash_on_delivery;
  const getPaymentStatusMeta = (value) =>
    PAYMENT_STATUS_META[String(value || "").trim().toLowerCase()] || PAYMENT_STATUS_META.pending;
  const formatPaymentStatus = (value) => getPaymentStatusMeta(value).label;
  const paymentStatusTone = (value) => getPaymentStatusMeta(value).tone;
  const isInstapayOrder = (order) => String(order?.payment_method || "").trim().toLowerCase() === "instapay";
  const isInstapayPaymentConfirmed = (order) => String(order?.payment_status || "").trim().toLowerCase() === "confirmed";
  const canSubmitInstapayTransfer = (order) =>
    isInstapayOrder(order) && ["pending", "pending_confirmation", "rejected"].includes(String(order?.payment_status || "").trim().toLowerCase());
  const featuredProducts = () => state.products.filter((product) => product.featured === true);
  const isExternalImageUrl = (value) => /^(?:[a-z]+:)?\/\//i.test(String(value || "").trim());
  const isDirectImageSource = (value) => /^(?:data:|blob:)/i.test(String(value || "").trim());

  const resolveProductImage = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
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

  const getProductImageSrc = (product) => String(product?.image || "").trim() || PRODUCT_IMAGE_FALLBACK;

  const state = {
    products: [],
    cart: [],
    productRefreshNotice: "",
    referenceProducts: []
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
          image: resolveProductImage(product?.image_url || product?.image),
          description: String(product?.description || "").trim(),
          featured: toBoolean(product?.featured)
        };
      })
      .filter(Boolean);

  const productImageMarkup = (product) =>
    `<img src="${getProductImageSrc(product)}" alt="${product.name}" data-product-image>`;

  const loadProductsFromStorageKey = (key) => {
    try {
      return normalizeProducts(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      return [];
    }
  };

  const loadCachedProducts = () => {
    return loadProductsFromStorageKey(PRODUCTS_CACHE_KEY);
  };

  const loadManagedProducts = () => loadProductsFromStorageKey(MANAGED_PRODUCTS_KEY);

  const removeProductStorageKeys = (keys = []) => {
    keys.forEach((key) => localStorage.removeItem(key));
  };

  const clearPersistedProductCatalog = ({ includeVersion = false } = {}) => {
    const keys = [
      MANAGED_PRODUCTS_KEY,
      PRODUCTS_CACHE_KEY,
      ...LEGACY_MANAGED_PRODUCTS_KEYS,
      ...LEGACY_PRODUCTS_CACHE_KEYS
    ];
    if (includeVersion) keys.push(PRODUCTS_CACHE_VERSION_KEY);
    removeProductStorageKeys(keys);
  };

  const persistProductsCache = (products, referenceProducts = state.referenceProducts) => {
    if (isProductionRuntime) return;
    const catalog = resolveStorefrontCatalog(products, referenceProducts);
    if (!catalog.hasRealProducts) {
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      return;
    }
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(catalog.products));
  };

  const clearManagedProductCache = () => {
    removeProductStorageKeys([MANAGED_PRODUCTS_KEY, ...LEGACY_MANAGED_PRODUCTS_KEYS]);
  };

  const persistRegisteredCatalog = (products, referenceProducts = state.referenceProducts) => {
    const catalog = resolveStorefrontCatalog(products, referenceProducts);
    if (!catalog.hasRealProducts) return catalog;
    if (isProductionRuntime) {
      clearPersistedProductCatalog();
      return catalog;
    }

    persistProductsCache(catalog.products, referenceProducts);
    clearManagedProductCache();
    return catalog;
  };

  const parseProductPayload = (payload) => {
    const products = normalizeProducts(payload);
    if (!products.length) throw new Error("Product source is empty");
    return products;
  };

  const buildReferenceCatalogIndex = (products = state.referenceProducts) => {
    const bySlug = new Map();
    const byName = new Map();

    normalizeProducts(products).forEach((product) => {
      const slug = String(product?.slug || "").trim();
      const name = String(product?.name || "").trim().toLowerCase();
      if (slug) bySlug.set(slug, product);
      if (name) byName.set(name, product);
    });

    return { bySlug, byName };
  };

  const resolveReferenceCatalogProduct = (product, referenceIndex = buildReferenceCatalogIndex()) => {
    const slug = String(product?.slug || "").trim();
    const name = String(product?.name || "").trim().toLowerCase();

    return (
      (slug ? referenceIndex.bySlug.get(slug) : null) ||
      (name ? referenceIndex.byName.get(name) : null) ||
      null
    );
  };

  const isReferenceCatalogProduct = (product, referenceIndex = buildReferenceCatalogIndex()) => {
    const referenceProduct = resolveReferenceCatalogProduct(product, referenceIndex);
    if (!referenceProduct) return false;

    const productSlug = String(product?.slug || "").trim();
    const productName = String(product?.name || "").trim().toLowerCase();
    const referenceSlug = String(referenceProduct?.slug || "").trim();
    const referenceName = String(referenceProduct?.name || "").trim().toLowerCase();

    return (
      (productSlug && referenceSlug && productSlug === referenceSlug) ||
      (productName && referenceName && productName === referenceName)
    );
  };

  const resolveStorefrontCatalog = (products = [], referenceProducts = state.referenceProducts) => {
    const normalized = normalizeProducts(products);
    const referenceIndex = buildReferenceCatalogIndex(referenceProducts);
    const realProducts = normalized.filter((product) => !isReferenceCatalogProduct(product, referenceIndex));

    return {
      allProducts: normalized,
      products: realProducts.length ? realProducts : normalized,
      hasRealProducts: realProducts.length > 0
    };
  };

  const sanitizeCachedCatalog = (key, referenceProducts = state.referenceProducts) => {
    const cachedProducts = loadProductsFromStorageKey(key);

    if (!cachedProducts.length) {
      localStorage.removeItem(key);
      return [];
    }

    const catalog = resolveStorefrontCatalog(cachedProducts, referenceProducts);
    if (!catalog.hasRealProducts) {
      localStorage.removeItem(key);
      return [];
    }

    localStorage.setItem(key, JSON.stringify(catalog.products));
    return catalog.products;
  };

  const migrateStorefrontProductCache = (referenceProducts = state.referenceProducts) => {
    const version = localStorage.getItem(PRODUCTS_CACHE_VERSION_KEY);
    const managedKeys = [MANAGED_PRODUCTS_KEY, ...LEGACY_MANAGED_PRODUCTS_KEYS];
    const cacheKeys = [PRODUCTS_CACHE_KEY, ...LEGACY_PRODUCTS_CACHE_KEYS];

    const migratedManagedProducts =
      managedKeys.map((key) => sanitizeCachedCatalog(key, referenceProducts)).find((products) => products.length) || [];
    const migratedCachedProducts =
      cacheKeys.map((key) => sanitizeCachedCatalog(key, referenceProducts)).find((products) => products.length) || [];

    removeProductStorageKeys([...LEGACY_MANAGED_PRODUCTS_KEYS, ...LEGACY_PRODUCTS_CACHE_KEYS]);

    if (migratedManagedProducts.length) {
      localStorage.setItem(MANAGED_PRODUCTS_KEY, JSON.stringify(migratedManagedProducts));
    } else {
      localStorage.removeItem(MANAGED_PRODUCTS_KEY);
    }

    if (migratedCachedProducts.length) {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(migratedCachedProducts));
    } else {
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
    }

    if (version !== PRODUCTS_CACHE_VERSION) {
      localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_CACHE_VERSION);
    }
  };

  const isFallbackProductImage = (value) => {
    const resolved = resolveProductImage(value);
    return !resolved || resolved === PRODUCT_IMAGE_FALLBACK;
  };

  const buildReferenceProductMap = (products = []) => {
    const map = new Map();
    products.forEach((product) => {
      const image = resolveProductImage(product?.image);
      if (!image || isFallbackProductImage(image)) return;

      const slug = String(product?.slug || "").trim();
      const id = String(product?.id || "").trim();
      const name = String(product?.name || "").trim().toLowerCase();

      if (slug) map.set(`slug:${slug}`, image);
      if (id) map.set(`id:${id}`, image);
      if (name) map.set(`name:${name}`, image);
    });
    return map;
  };

  const resolveReferenceProductImage = (product, referenceMap = new Map()) => {
    const slug = String(product?.slug || "").trim();
    const id = String(product?.id || "").trim();
    const name = String(product?.name || "").trim().toLowerCase();

    return (
      (slug ? referenceMap.get(`slug:${slug}`) : "") ||
      (id ? referenceMap.get(`id:${id}`) : "") ||
      (name ? referenceMap.get(`name:${name}`) : "") ||
      ""
    );
  };

  const applyReferenceImages = (products = [], referenceProducts = state.referenceProducts) => {
    const referenceMap = buildReferenceProductMap(referenceProducts);
    if (!referenceMap.size) return normalizeProducts(products);

    return normalizeProducts(products).map((product) => {
      const referenceImage = resolveReferenceProductImage(product, referenceMap);
      if (!referenceImage) return product;
      if (!product.image || isFallbackProductImage(product.image)) {
        return { ...product, image: referenceImage };
      }
      return product;
    });
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

  const productCatalogEmptyMarkup = (message) =>
    `<div class="mock-empty-state"><p>${message}</p></div>`;

  const loadCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      state.cart = Array.isArray(saved)
        ? saved
            .filter((line) => line && line.id && Number(line.qty) > 0)
            .map((line) => ({
              id: String(line.id),
              qty: Number(line.qty),
              selected_color: normalizeSelectedColor(line.selected_color || line.color || "")
            }))
        : [];
    } catch {
      state.cart = [];
    }
  };

  const persistCart = () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  };

  const persistSuccessfulOrder = (order) => {
    try {
      sessionStorage.setItem(ORDER_SUCCESS_STORAGE_KEY, JSON.stringify({
        order,
        saved_at: Date.now()
      }));
    } catch {}
  };

  const readSuccessfulOrder = () => {
    try {
      return JSON.parse(sessionStorage.getItem(ORDER_SUCCESS_STORAGE_KEY) || "{}")?.order || null;
    } catch {
      return null;
    }
  };

  let cartSaveTimer = null;
  const scheduleCartSave = () => {
    if (cartSaveTimer) clearTimeout(cartSaveTimer);
    cartSaveTimer = setTimeout(async () => {
      try {
        const items = state.cart
          .map((line) => ({
            product_id: Number(line.id),
            quantity: Number(line.qty),
            selected_color: cartLineSelectedColor(line)
          }))
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
          .map((item) => ({
            id: String(item.product_id),
            qty: Number(item.quantity),
            selected_color: normalizeSelectedColor(item.selected_color || "")
          }))
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
  const cartLineSelectedColor = (line) => selectedColorLabel(line?.selected_color, findProduct(line?.id)?.color || DEFAULT_SELECTED_COLOR);
  const cartLineKey = (productId, selectedColor = "") => `${String(productId)}::${selectedColorKey(selectedColor, DEFAULT_SELECTED_COLOR)}`;
  const cartLineKeyFromLine = (line) => cartLineKey(line?.id || line?.product_id, cartLineSelectedColor(line));

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

  const addToCart = (product, qty = 1, redirect = false, button = null, selectedColor = "") => {
    const normalizedSelectedColor = selectedColorLabel(selectedColor, product?.color || DEFAULT_SELECTED_COLOR);
    const existing = state.cart.find(
      (item) => cartLineKey(item.id, cartLineSelectedColor(item)) === cartLineKey(product.id, normalizedSelectedColor)
    );
    if (existing) existing.qty += qty;
    else state.cart.push({ id: product.id, qty, selected_color: normalizedSelectedColor });
    persistCart();
    scheduleCartSave();
    refreshCartUi();
    flashAddButton(button);
    if (redirect) window.location.href = "cart.html";
  };

  const updateCartQuantity = (lineKey, delta) => {
    const line = state.cart.find((item) => cartLineKeyFromLine(item) === String(lineKey));
    if (!line) return;
    line.qty = Math.max(1, line.qty + delta);
    persistCart();
    scheduleCartSave();
    refreshCartUi();
  };

  const removeCartItem = (lineKey) => {
    state.cart = state.cart.filter((item) => cartLineKeyFromLine(item) !== String(lineKey));
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
    if (!products.length) {
      wrap.innerHTML = productCatalogEmptyMarkup(state.productRefreshNotice || "No products available right now.");
      return;
    }
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
      if (state.products.length) {
        gridWrap.innerHTML = state.products.map(productCardMarkup).join("");
        bindProductImageFallbacks(gridWrap);
        bindProductCardEvents(gridWrap);
      } else {
        gridWrap.innerHTML = productCatalogEmptyMarkup(state.productRefreshNotice || "No products available right now.");
      }
    }

    if (!productWrap || !gridView || !productView) return;
    if (!state.products.length) {
      gridView.hidden = false;
      productView.hidden = true;
      if (productWrap) {
        productWrap.innerHTML = productCatalogEmptyMarkup(state.productRefreshNotice || "No products available right now.");
      }
      return;
    }
    if (!key) {
      gridView.hidden = false;
      productView.hidden = true;
      return;
    }

    const product = findProduct(key) || state.products[0];
    if (!product) return;
    const productColorOptions = buildProductColorOptions(product);

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
          <div class="mock-color-row">
            ${productColorOptions
              .map(
                (option, index) => `
                  <button
                    class="mock-color-swatch${index === 0 ? " is-selected" : ""}"
                    style="background:${option.hex}"
                    type="button"
                    data-color-name="${option.name}"
                    aria-label="${option.name}"
                    title="${option.name}"
                  ></button>
                `
              )
              .join("")}
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
        </div>
      </article>
    `;
    bindProductImageFallbacks(productWrap);

    let qty = 1;
    let selectedColor = productColorOptions[0]?.name || selectedColorLabel(product.color);
    qsa(".mock-color-swatch", productWrap).forEach((button) => {
      button.addEventListener("click", () => {
        qsa(".mock-color-swatch", productWrap).forEach((node) => node.classList.remove("is-selected"));
        button.classList.add("is-selected");
        selectedColor = selectedColorLabel(button.dataset.colorName, product.color || DEFAULT_SELECTED_COLOR);
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
      addToCart(product, qty, true, event.currentTarget, selectedColor);
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
                        const lineKey = cartLineKeyFromLine(line);
                        return `
                          <div class="mock-cart-item">
                            ${productImageMarkup(product)}
                            <div class="mock-cart-item__body">
                              <h3>${product.name}</h3>
                              <p>Color: ${cartLineSelectedColor(line)}</p>
                              <p>${formatMoney(product.price)} x ${line.qty}</p>
                              <strong>${formatMoney(product.price * line.qty)}</strong>
                              <div class="mock-cart-actions">
                                <div class="mock-cart-qty-control">
                                  <button type="button" data-cart-qty="-1" data-cart-line="${lineKey}" aria-label="Decrease quantity">${iconMarkup("minus")}</button>
                                  <span>${line.qty}</span>
                                  <button type="button" data-cart-qty="1" data-cart-line="${lineKey}" aria-label="Increase quantity">${iconMarkup("plus")}</button>
                                </div>
                                <button type="button" class="mock-cart-remove" data-cart-remove="${lineKey}">Remove</button>
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
        updateCartQuantity(button.dataset.cartLine, Number(button.dataset.cartQty || 0));
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
              return `<div class="mock-summary-mini-line"><span>${product.name} (${cartLineSelectedColor(line)}) x ${line.qty}</span><strong>${formatMoney(product.price * line.qty)}</strong></div>`;
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

  const buildWhatsAppMessage = (order) => {
    if (!order) return "";
    const items = Array.isArray(order.items) ? order.items : [];
    const lines = [
      "New 3DS Order",
      `Order Number: ${order.order_number || order.id || "-"}`,
      `Customer: ${order.customer_name || "-"}`,
      `Phone: ${order.phone || "-"}`,
      `Address: ${[order.address, order.district, order.governorate].filter(Boolean).join(", ") || "-"}`,
      `Payment Method: ${formatPaymentMethod(order.payment_method)}`,
      `Payment Status: ${formatPaymentStatus(order.payment_status)}`,
      "",
      "Items:",
      ...items.map((item) => `- ${item.product_name} (${selectedColorLabel(item.selected_color)}) x ${item.quantity} = ${formatMoney(item.line_total_egp)}`),
      "",
      `Subtotal: ${formatMoney(order.subtotal_egp)}`,
      `Shipping: ${Number(order.shipping_egp) === 0 ? "Free" : formatMoney(order.shipping_egp)}`,
      `Total: ${formatMoney(order.total_egp)}`
    ];
    return lines.join("\n");
  };

  const createWhatsAppUrl = (order) => {
    if (!ORDER_WHATSAPP_NUMBER) return "";
    const message = buildWhatsAppMessage(order);
    if (!message) return "";
    return `https://wa.me/${ORDER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const copyText = async (value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const didCopy = document.execCommand("copy");
    textarea.remove();
    return didCopy;
  };

  const loadOrderForSuccessPage = async () => {
    const params = new URLSearchParams(window.location.search);
    const orderNumber = String(params.get("order_number") || "").trim();
    const savedOrder = readSuccessfulOrder();

    if (savedOrder && !orderNumber) {
      return savedOrder;
    }

    if (!orderNumber) return null;

    try {
      const response = await fetch(`${API_BASE}/api/orders/number/${encodeURIComponent(orderNumber)}`, {
        headers: cartHeaders(),
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not load your order details.");
      }
      if (data?.order) persistSuccessfulOrder(data.order);
      return data?.order || null;
    } catch (error) {
      if (savedOrder && savedOrder.order_number === orderNumber) {
        return savedOrder;
      }
      throw error;
    }
  };

  const submitInstapayTransfer = async (order, form, statusNode) => {
    const submitButton = qs("[data-submit-instapay]", form);
    const setStatus = (message, tone = "info") => {
      if (!statusNode) return;
      statusNode.hidden = !message;
      statusNode.textContent = message || "";
      if (message) statusNode.dataset.tone = tone;
      else delete statusNode.dataset.tone;
    };

    const paymentReference = String(form.elements.payment_reference?.value || "").trim();
    const payerMobile = String(form.elements.payer_mobile?.value || "").trim();
    if (!paymentReference && !payerMobile) {
      setStatus("Enter a transfer reference or the sender mobile number.", "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }
    setStatus("Submitting your transfer details...");

    try {
      const response = await fetch(
        `${API_BASE}/api/orders/number/${encodeURIComponent(order.order_number || order.id || "")}/payment-submission`,
        {
          method: "POST",
          headers: cartHeaders(),
          body: JSON.stringify({
            payment_reference: paymentReference,
            payer_mobile: payerMobile
          })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not submit your transfer details.");
      }

      if (data?.order) persistSuccessfulOrder(data.order);
      await renderOrderSuccessPage();
    } catch (error) {
      setStatus(error.message || "Could not submit your transfer details.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "I Have Transferred";
      }
    }
  };

  const renderOrderSuccessPage = async () => {
    const wrap = qs("#order-success-content");
    if (!wrap) return;

    wrap.innerHTML = `
      <article class="mock-surface-card">
        <div class="mock-surface-card__content mock-simple-content">
          <p class="mock-page-subtitle">Loading your order summary...</p>
        </div>
      </article>
    `;

    try {
      const order = await loadOrderForSuccessPage();
      if (!order) {
        wrap.innerHTML = `
          <article class="mock-surface-card">
            <div class="mock-surface-card__content mock-simple-content mock-success-card">
              <h1 class="mock-page-title">Order Summary</h1>
              <p class="mock-success-copy">We could not find a recent order summary on this device.</p>
              <div class="mock-success-actions">
                <a href="shop.html" class="mock-primary-button">Back to Shop</a>
              </div>
            </div>
          </article>
        `;
        return;
      }

      const paymentMeta = getPaymentMethodMeta(order.payment_method);
      const whatsappUrl = createWhatsAppUrl(order);
      const paymentStatus = String(order.payment_status || "").trim().toLowerCase() || "pending";
      const instapayOrder = isInstapayOrder(order);
      const paymentConfirmed = isInstapayPaymentConfirmed(order);
      const heroKicker = instapayOrder
        ? paymentConfirmed
          ? "Payment confirmed"
          : paymentStatus === "awaiting_review"
            ? "Transfer submitted"
            : paymentStatus === "rejected"
              ? "Transfer needs review"
              : "Complete your InstaPay transfer"
        : "Order placed successfully";
      const heroTitle = instapayOrder
        ? paymentConfirmed
          ? `Payment received for ${order.customer_name || "your order"}.`
          : `Complete payment for order ${order.order_number || order.id || "-"}.`
        : `Thanks, ${order.customer_name || "there"}.`;
      const heroCopy = instapayOrder
        ? paymentConfirmed
          ? "Your InstaPay payment has been manually confirmed. Your order is now confirmed in the system."
          : paymentStatus === "awaiting_review"
            ? "Your transfer details were submitted successfully. We will review the transfer before confirming payment."
            : paymentStatus === "rejected"
              ? "Your last transfer submission was not confirmed yet. Review the note below, then submit updated transfer details."
              : "Transfer the exact order total to the InstaPay destination below, then submit your transfer details for manual review."
        : "Your order is saved in the system. Keep the order number below in case you need support or want to follow up on WhatsApp.";
      const submittedReference = escapeHtml(order.payment_reference || "");
      const submittedPayerMobile = escapeHtml(order.payer_mobile || "");
      const reviewNote = escapeHtml(order.payment_review_note || "");
      const submittedAt = order.payment_submitted_at ? new Date(order.payment_submitted_at).toLocaleString("en-GB") : "";
      const openInstapayLabel = INSTAPAY_OPEN_URL ? "Open InstaPay" : "Open InstaPay";

      const instapayPanelMarkup = instapayOrder
        ? `
            <div class="mock-payment-proof-panel">
              <div class="mock-payment-proof-panel__header">
                <div>
                  <p class="mock-payment-proof-panel__eyebrow">InstaPay Instructions</p>
                  <h2 class="mock-summary-title">Transfer ${formatMoney(order.total_egp)}</h2>
                </div>
                <span class="mock-pill-badge" data-tone="${paymentStatusTone(order.payment_status)}">${formatPaymentStatus(order.payment_status)}</span>
              </div>
              <div class="mock-payment-proof-destination">
                <span>${escapeHtml(INSTAPAY_DESTINATION_LABEL)}</span>
                <strong>${escapeHtml(INSTAPAY_DESTINATION_VALUE)}</strong>
              </div>
              <p class="mock-payment-proof-copy">
                Transfer the exact amount, then return here and confirm you transferred. Payment is reviewed manually before it is confirmed.
              </p>
              <div class="mock-success-actions">
                <button class="mock-primary-button" type="button" data-instapay-open>${openInstapayLabel}</button>
                <button class="mock-secondary-button" type="button" data-copy-instapay>Copy Payment Info</button>
              </div>
              <p class="mock-form-status" data-instapay-inline-status hidden></p>
              ${
                order.payment_reference || order.payer_mobile || order.payment_submitted_at
                  ? `
                    <div class="mock-payment-proof-summary">
                      <h3>Submitted Transfer Details</h3>
                      ${submittedReference ? `<p><strong>Reference:</strong> ${submittedReference}</p>` : ""}
                      ${submittedPayerMobile ? `<p><strong>Payer Mobile:</strong> ${submittedPayerMobile}</p>` : ""}
                      ${submittedAt ? `<p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>` : ""}
                      ${reviewNote ? `<p><strong>Review Note:</strong> ${reviewNote}</p>` : ""}
                    </div>
                  `
                  : ""
              }
              ${
                canSubmitInstapayTransfer(order)
                  ? `
                    <form class="mock-payment-proof-form" data-instapay-form>
                      <div class="mock-payment-proof-fields">
                        <input
                          class="mock-input"
                          type="text"
                          name="payment_reference"
                          maxlength="120"
                          placeholder="Transfer reference or last 4 digits"
                          value="${submittedReference}"
                        >
                        <input
                          class="mock-input"
                          type="text"
                          name="payer_mobile"
                          maxlength="32"
                          placeholder="Sender mobile number"
                          value="${submittedPayerMobile}"
                        >
                      </div>
                      <button class="mock-primary-button" type="submit" data-submit-instapay>I Have Transferred</button>
                      <p class="mock-form-status" data-instapay-status hidden></p>
                    </form>
                  `
                  : ""
              }
            </div>
          `
        : "";
      wrap.innerHTML = `
        <div class="mock-success-layout">
          <article class="mock-surface-card">
            <div class="mock-surface-card__content mock-simple-content mock-success-card">
              <div class="mock-success-hero">
                <p class="mock-success-kicker">${heroKicker}</p>
                <h1 class="mock-page-title">${heroTitle}</h1>
                <p class="mock-success-copy">${heroCopy}</p>
              </div>
              <div class="mock-success-grid">
                <div class="mock-success-stat">
                  <span>Order Number</span>
                  <strong>${order.order_number || order.id || "-"}</strong>
                </div>
                <div class="mock-success-stat">
                  <span>Total</span>
                  <strong>${formatMoney(order.total_egp)}</strong>
                </div>
                <div class="mock-success-stat">
                  <span>Payment Method</span>
                  <strong>${formatPaymentMethod(order.payment_method)}</strong>
                </div>
                <div class="mock-success-stat">
                  <span>Payment Status</span>
                  <strong>${formatPaymentStatus(order.payment_status)}</strong>
                </div>
              </div>
              <p class="mock-success-note">${paymentMeta.description}</p>
              ${instapayPanelMarkup}
              <div class="mock-success-actions">
                <a href="shop.html" class="mock-primary-button">Back to Shop</a>
                ${whatsappUrl ? `<a href="${whatsappUrl}" class="mock-secondary-button" target="_blank" rel="noreferrer">Send on WhatsApp</a>` : ""}
              </div>
            </div>
          </article>
          <article class="mock-surface-card">
            <div class="mock-surface-card__content mock-simple-content mock-success-card">
              <h2 class="mock-summary-title">Order Details</h2>
              <div class="mock-success-items">
                ${(Array.isArray(order.items) ? order.items : [])
                  .map(
                    (item) => `
                      <div class="mock-success-item">
                        <div>
                          <strong>${item.product_name}</strong>
                          <p>Color: ${selectedColorLabel(item.selected_color)}</p>
                          <p>${formatMoney(item.unit_price_egp)} x ${item.quantity}</p>
                        </div>
                        <strong>${formatMoney(item.line_total_egp)}</strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>
              <div class="mock-summary-lines">
                <div class="mock-summary-line"><span>Subtotal</span><span>${formatMoney(order.subtotal_egp)}</span></div>
                <div class="mock-summary-line"><span>Shipping</span><span>${Number(order.shipping_egp) === 0 ? "Free" : formatMoney(order.shipping_egp)}</span></div>
                <div class="mock-summary-line mock-summary-line--total"><span>Total</span><span>${formatMoney(order.total_egp)}</span></div>
              </div>
            </div>
          </article>
        </div>
      `;

      const inlineStatus = qs("[data-instapay-inline-status]", wrap);
      const setInlineStatus = (message, tone = "info") => {
        if (!inlineStatus) return;
        inlineStatus.hidden = !message;
        inlineStatus.textContent = message || "";
        if (message) inlineStatus.dataset.tone = tone;
        else delete inlineStatus.dataset.tone;
      };

      qs("[data-instapay-open]", wrap)?.addEventListener("click", () => {
        window.open(INSTAPAY_OPEN_URL, "_blank", "noopener,noreferrer");
      });

      qs("[data-copy-instapay]", wrap)?.addEventListener("click", async () => {
        try {
          await copyText(INSTAPAY_DESTINATION_VALUE);
          setInlineStatus("Payment info copied.", "success");
        } catch {
          setInlineStatus("Could not copy the payment info on this device.", "error");
        }
      });

      qs("[data-instapay-form]", wrap)?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitInstapayTransfer(order, event.currentTarget, qs("[data-instapay-status]", event.currentTarget));
      });
    } catch (error) {
      wrap.innerHTML = `
        <article class="mock-surface-card">
          <div class="mock-surface-card__content mock-simple-content mock-success-card">
            <h1 class="mock-page-title">Order Summary</h1>
            <p class="mock-success-copy">${error.message || "Could not load your order details."}</p>
            <div class="mock-success-actions">
              <a href="shop.html" class="mock-primary-button">Back to Shop</a>
            </div>
          </div>
        </article>
      `;
    }
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

  const normalizeContactSettings = (contact = {}) => ({
    phone: String(contact?.phone || DEFAULT_CONTACT_SETTINGS.phone).trim() || DEFAULT_CONTACT_SETTINGS.phone,
    email: String(contact?.email || DEFAULT_CONTACT_SETTINGS.email).trim() || DEFAULT_CONTACT_SETTINGS.email,
    address: String(contact?.address || DEFAULT_CONTACT_SETTINGS.address).trim() || DEFAULT_CONTACT_SETTINGS.address
  });

  const loadContactSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/site-settings`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return normalizeContactSettings(data?.settings?.contact || {});
    } catch (error) {
      console.warn("Failed to load public contact settings", error);
      return { ...DEFAULT_CONTACT_SETTINGS };
    }
  };

  const renderContactSettings = async () => {
    const phoneNode = qs("[data-contact-phone]");
    const emailNode = qs("[data-contact-email]");
    const addressNode = qs("[data-contact-address]");
    if (!phoneNode || !emailNode || !addressNode) return;

    const contact = await loadContactSettings();
    phoneNode.textContent = contact.phone;
    emailNode.textContent = contact.email;
    addressNode.textContent = contact.address;
  };

  const bindPaymentMethodControls = () => {
    const options = qsa(".mock-payment-option");
    if (!options.length) return;
    const subtitle = qs("[data-payment-method-copy]");
    const badge = qs("[data-payment-method-badge]");

    const applySelection = () => {
      const selected = qs('input[name="payment_method"]:checked');
      const selectedValue = selected?.value || "cash_on_delivery";
      const meta = getPaymentMethodMeta(selectedValue);
      options.forEach((option) => {
        const input = qs('input[name="payment_method"]', option);
        option.classList.toggle("is-selected", input?.value === selectedValue);
      });
      if (subtitle) subtitle.textContent = meta.description;
      if (badge) badge.textContent = meta.badge;
    };

    options.forEach((option) => {
      const input = qs('input[name="payment_method"]', option);
      input?.addEventListener("change", applySelection);
    });

    applySelection();
  };

  const bindCheckoutForm = () => {
    const button = qs("[data-checkout-submit]");
    const status = qs("[data-checkout-status]");
    const form = qs("[data-checkout-form]");
    if (!button || !status || !form) return;
    button.addEventListener("click", async () => {
      if (!form.reportValidity()) return;

      if (!state.cart.length) {
        status.hidden = false;
        status.dataset.tone = "error";
        status.textContent = "Your cart is empty.";
        return;
      }

      const payload = {
        full_name: String(form.elements.full_name?.value || "").trim(),
        phone: String(form.elements.phone?.value || "").trim(),
        city: String(form.elements.city?.value || "").trim(),
        district: String(form.elements.district?.value || "").trim(),
        address: String(form.elements.address?.value || "").trim(),
        payment_method: String(form.elements.payment_method?.value || "cash_on_delivery").trim()
      };
      const checkoutItems = state.cart.map((line) => ({
          product_id: Number(line.id),
          quantity: Number(line.qty),
          selected_color: cartLineSelectedColor(line)
        }));

      button.disabled = true;
      button.textContent = "Submitting...";
      status.hidden = true;
      status.textContent = "";
      delete status.dataset.tone;

      try {
        console.info("[checkout] syncing cart before order", checkoutItems);
        const cartSyncResponse = await fetch(`${API_BASE}/api/cart`, {
          method: "POST",
          headers: cartHeaders(),
          body: JSON.stringify({ items: checkoutItems })
        });
        const cartSyncText = await cartSyncResponse.text();
        let cartSyncData = {};
        try {
          cartSyncData = JSON.parse(cartSyncText);
        } catch {
          cartSyncData = {};
        }
        if (!cartSyncResponse.ok) {
          console.error("[checkout] cart sync failed", {
            status: cartSyncResponse.status,
            body: cartSyncText
          });
          throw new Error(cartSyncData?.error || cartSyncText || "Could not sync your cart before checkout.");
        }

        const cartVerifyResponse = await fetch(`${API_BASE}/api/cart`, { headers: cartHeaders() });
        const cartVerifyText = await cartVerifyResponse.text();
        let cartVerifyData = {};
        try {
          cartVerifyData = JSON.parse(cartVerifyText);
        } catch {
          cartVerifyData = {};
        }
        console.info("[checkout] backend cart after sync", cartVerifyData?.items || []);
        if (!cartVerifyResponse.ok) {
          throw new Error(cartVerifyData?.error || cartVerifyText || "Could not verify your cart before checkout.");
        }

        console.info("[checkout] creating order", payload);
        const response = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: cartHeaders(),
          body: JSON.stringify(payload)
        });
        const responseText = await response.text();
        let data = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
        if (!response.ok) {
          console.error("[checkout] order create failed", {
            status: response.status,
            body: responseText
          });
          throw new Error(data?.error || responseText || "Could not submit your order right now.");
        }

        console.info("[checkout] order created", data?.order || null);
        persistSuccessfulOrder(data?.order || null);
        form.reset();
        state.cart = [];
        persistCart();
        refreshCartUi();
        const orderNumber = String(data?.order?.order_number || "").trim();
        window.location.href = orderNumber
          ? `order-success.html?order_number=${encodeURIComponent(orderNumber)}`
          : "order-success.html";
      } catch (error) {
        status.hidden = false;
        status.dataset.tone = "error";
        status.textContent = error.message || "Could not submit your order right now.";
      } finally {
        button.disabled = false;
        button.textContent = "Submit Order";
      }
    });
  };

  const refreshCartUi = () => {
    renderCartCount();
    renderCartPage();
    renderCheckoutSummary();
  };

  const setProducts = (products, source = "unknown") => {
    const catalog = resolveStorefrontCatalog(products);
    state.products = applyReferenceImages(catalog.products);
    console.log("[storefront] final catalog before render", {
      source,
      count: state.products.length,
      products: state.products
    });
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
    if (isProductionRuntime) return false;
    const managedProducts = loadManagedProducts();
    const managedCatalog = resolveStorefrontCatalog(managedProducts);
    if (managedCatalog.hasRealProducts) {
      setProducts(managedCatalog.products, "managed-cache");
      return true;
    }

    const cachedProducts = loadCachedProducts();
    const cachedCatalog = resolveStorefrontCatalog(cachedProducts);
    if (cachedCatalog.hasRealProducts) {
      setProducts(cachedCatalog.products, "products-cache");
      return true;
    }

    return false;
  };

  const fetchProducts = async () => {
    if (isProductionRuntime) {
      clearPersistedProductCatalog({ includeVersion: true });
      state.referenceProducts = [];
      state.productRefreshNotice = "";

      try {
        const products = await loadProductsFromApi(API_BASE);
        const catalog = persistRegisteredCatalog(products, []);
        setProducts(catalog.products, `api:${API_BASE}`);
        return;
      } catch (error) {
        logProductLoadError(`production API (${API_BASE})`, error);
        state.productRefreshNotice = "Products are temporarily unavailable. Please try again soon.";
        setProducts([], `api-error:${API_BASE}`);
        return;
      }
    }

    try {
      state.referenceProducts = await loadProductsFromJson();
    } catch (error) {
      console.warn("[storefront] Could not preload reference product images", error);
      state.referenceProducts = [];
    }

    migrateStorefrontProductCache(state.referenceProducts);
    const hasSafeHydration = hydrateProductsFromSafeFallback();
    state.productRefreshNotice = "";

    try {
      const products = await loadProductsFromApi(API_BASE);
      const catalog = persistRegisteredCatalog(products);
      setProducts(catalog.products, `api:${API_BASE}`);
      return;
    } catch (error) {
      logProductLoadError(`primary API (${API_BASE})`, error);
    }

    if (API_BASE !== FALLBACK_API_BASE) {
      try {
        const products = await loadProductsFromApi(FALLBACK_API_BASE);
        const catalog = persistRegisteredCatalog(products);
        setProducts(catalog.products, `api:${FALLBACK_API_BASE}`);
        return;
      } catch (error) {
        logProductLoadError(`fallback API (${FALLBACK_API_BASE})`, error);
      }
    }

    const managedProducts = loadManagedProducts();
    const managedCatalog = resolveStorefrontCatalog(managedProducts);
    if (managedCatalog.hasRealProducts) {
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      setProducts(managedCatalog.products, "managed-cache-fallback");
      return;
    }

    try {
      const products = await loadProductsFromJson();
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      setProducts(products, "products.json-fallback");
      return;
    } catch (error) {
      logProductLoadError("JSON fallback", error);
    }

    if (isFileRuntime) {
      try {
        const products = await loadProductsFromLocalFile();
        state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
        setProducts(products, "local-file-fallback");
        return;
      } catch (error) {
        logProductLoadError("local file fallback", error);
      }
    }

    const cachedProducts = loadCachedProducts();
    const cachedCatalog = resolveStorefrontCatalog(cachedProducts);
    if (cachedCatalog.hasRealProducts) {
      state.productRefreshNotice = "Some products may be outdated. Failed to refresh.";
      setProducts(cachedCatalog.products, "products-cache-fallback");
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
    await renderContactSettings();
    bindContactForm();
    bindPaymentMethodControls();
    bindCheckoutForm();
    if (currentPage() === "order-success") {
      await renderOrderSuccessPage();
      syncCartFromApi();
      return;
    }
    try {
      await fetchProducts();
    } catch (error) {
      console.error(error);
    }
    syncCartFromApi();
  });
})();
