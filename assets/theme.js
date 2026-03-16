(() => {
  const qs = (s, p = document) => p.querySelector(s);
  const qsa = (s, p = document) => [...p.querySelectorAll(s)];

  const baseProducts = [];

  const faqs = [
    {
      question: {
        en: "How long does printing take?",
        ar: "كم يستغرق الطباعة؟"
      },
      answer: {
        en: "Standard prints ship in 2-4 business days across Egypt.",
        ar: "يتم الشحن خلال ٢-٤ أيام عمل داخل مصر."
      }
    },
    {
      question: {
        en: "Can I add custom text?",
        ar: "هل يمكن إضافة نص مخصص؟"
      },
      answer: {
        en: "Yes, add your name or short text in the order notes.",
        ar: "نعم، أضف الاسم أو النص القصير في ملاحظات الطلب."
      }
    },
    {
      question: {
        en: "Which materials do you use?",
        ar: "ما هي المواد المستخدمة؟"
      },
      answer: {
        en: "Premium PLA+/PETG with durable split rings; metallic and neon finishes available.",
        ar: "PLA+/PETG عالية الجودة مع حلقات معدنية متينة؛ تتوفر لمسات معدنية ونيوون."
      }
    }
  ];

  const translations = {
    en: {
      "theme.light": "Light",
      "theme.dark": "Dark",
      "holiday.on": "Holiday on",
      "holiday.off": "Holiday off",
      "header.keychains": "3D Keychains",
      "navigation.home": "Home",
      "navigation.shop": "Shop",
      "navigation.about": "About",
      "navigation.faq": "FAQ",
      "navigation.contact": "Contact",
      "hero.tagline": "3D printed in Cairo",
      "hero.heading": "3D Printed Keychains",
      "hero.copy": "Personalized 3D printed keychains made in Egypt with premium materials and bold finishes.",
      "hero.primary": "Shop keychains",
      "hero.secondary": "View collection",
      "hero.badge_print": "Printed in Cairo",
      "hero.badge_delivery": "Delivery in 2-4 days",
      "hero.badge_materials": "Premium PLA+/PETG",
      "payments.heading": "Pay securely with cards, InstaPay, or Vodafone Cash",
      "payments.badge": "EGP only",
      "featured.tag": "Best sellers",
      "featured.heading": "Featured keychains",
      "featured.copy": "Top-selling personalized 3D keychains, printed with premium materials and ready for delivery.",
      "featured.view_all": "View all",
      "featured.cta": "Add to cart",
      "shop.tag": "Shop",
      "shop.heading": "All keychains",
      "shop.badge": "Hover to preview",
      "story.tag": "Our story",
      "story.heading": "Bold, durable, personal.",
      "story.copy": "We design and 3D print keychains in Cairo with meticulous finishing, premium plastics, and quality control on every order.",
      "story.card_one_title": "Local & fast",
      "story.card_one_body": "Printed and shipped from Egypt with delivery updates in EN/AR.",
      "story.card_two_title": "Custom finishes",
      "story.card_two_body": "Matte, neon, metallic accents with durable split rings.",
      "faq.tag": "FAQ",
      "faq.heading": "Questions, answered.",
      "faq.copy": "Shipping, materials, and customization details for your 3D printed keychains.",
      "contact.tag": "Contact us",
      "contact.heading": "Tell us your idea.",
      "contact.copy": "Need a bulk order or custom shape? Send us a note and we’ll reply in EN or AR.",
      "contact.badge": "Replies in <24h",
      "contact.name": "Name",
      "contact.email": "Email",
      "contact.message": "Your message",
      "contact.submit": "Send",
      "footer.tagline": "Premium 3D printed keychains made in Egypt.",
      "footer.payments": "Payments",
      "cart.title": "Cart",
      "cart.close": "Close",
      "cart.total": "Total",
      "cart.checkout": "Checkout",
      "cart.empty": "Your cart is empty.",
      "product.price_note": "Standard price: 300 EGP"
    },
    ar: {
      "theme.light": "فاتح",
      "theme.dark": "داكن",
      "holiday.on": "تفعيل الأجواء",
      "holiday.off": "إيقاف الأجواء",
      "header.keychains": "ميداليات ثلاثية الأبعاد",
      "navigation.home": "الرئيسية",
      "navigation.shop": "المتجر",
      "navigation.about": "من نحن",
      "navigation.faq": "الأسئلة",
      "navigation.contact": "تواصل",
      "hero.tagline": "تصنيع ثلاثي الأبعاد في القاهرة",
      "hero.heading": "ميداليات مطبوعة ثلاثياً",
      "hero.copy": "ميداليات مفاتيح مخصصة مطبوعة في مصر بمواد ممتازة وتشطيبات جريئة.",
      "hero.primary": "تسوق الميداليات",
      "hero.secondary": "عرض المجموعة",
      "hero.badge_print": "تصنيع في القاهرة",
      "hero.badge_delivery": "التسليم خلال ٢-٤ أيام",
      "hero.badge_materials": "مواد عالية الجودة",
      "payments.heading": "ادفع ببطاقة أو إنستا باي أو فودافون كاش",
      "payments.badge": "جنيه مصري فقط",
      "featured.tag": "الأكثر مبيعاً",
      "featured.heading": "ميداليات مميزة",
      "featured.copy": "أفضل الميداليات المخصصة، مطبوعة بمواد ممتازة وجاهزة للتسليم.",
      "featured.view_all": "عرض الكل",
      "featured.cta": "أضف للسلة",
      "shop.tag": "المتجر",
      "shop.heading": "كل الميداليات",
      "shop.badge": "معاينة عند المرور",
      "story.tag": "قصتنا",
      "story.heading": "جريئة، متينة، شخصية.",
      "story.copy": "نصمم ونطبع الميداليات في القاهرة مع تشطيب دقيق ومواد ممتازة وفحص جودة لكل طلب.",
      "story.card_one_title": "محلي وسريع",
      "story.card_one_body": "طباعة وشحن من مصر مع تحديثات تسليم بالعربية والإنجليزية.",
      "story.card_two_title": "تشطيبات مخصصة",
      "story.card_two_body": "تشطيبات مطفية، نيون، أو معدنية مع حلقات متينة.",
      "faq.tag": "الأسئلة الشائعة",
      "faq.heading": "أسئلتك مجابة.",
      "faq.copy": "تفاصيل الشحن والمواد والتخصيص لميدالياتك المطبوعة ثلاثياً.",
      "contact.tag": "تواصل معنا",
      "contact.heading": "أخبرنا فكرتك.",
      "contact.copy": "تحتاج طلبية كبيرة أو شكل مخصص؟ أرسل لنا رسالة ونرد بالإنجليزية أو العربية.",
      "contact.badge": "رد خلال <٢٤ ساعة",
      "contact.name": "الاسم",
      "contact.email": "البريد الإلكتروني",
      "contact.message": "رسالتك",
      "contact.submit": "إرسال",
      "footer.tagline": "ميداليات مفاتيح مطبوعة ثلاثياً في مصر.",
      "footer.payments": "طرق الدفع",
      "cart.title": "السلة",
      "cart.close": "إغلاق",
      "cart.total": "الإجمالي",
      "cart.checkout": "الدفع",
      "cart.empty": "سلتك فارغة.",
      "product.price_note": "السعر القياسي: ٣٠٠ جنيه"
    }
  };

  const FALLBACK_API_BASE = "http://localhost:4000";
  const origin = window.location?.origin;
  const API_BASE =
    window.__API_BASE ||
    (origin && origin !== "null" && !origin.startsWith("file:")
      ? origin
      : FALLBACK_API_BASE);

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

  const CART_STORAGE_KEY = "cart";
  const GUEST_CART_KEY = "guest_cart_token";
  const PRODUCTS_CACHE_KEY = "products_cache_v1";

  const state = {
    lang: "en",
    cart: [],
    theme: "dark",
    holiday: false,
    products: []
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

  let cartSaveTimer = null;
  const scheduleCartSave = () => {
    if (cartSaveTimer) clearTimeout(cartSaveTimer);
    cartSaveTimer = setTimeout(async () => {
      try {
        const items = state.cart.map((line) => ({
          product_id: Number(line.id),
          quantity: Number(line.qty)
        })).filter((item) => Number.isFinite(item.product_id) && item.product_id > 0 && Number.isFinite(item.quantity) && item.quantity > 0);
        await fetch(`${API_BASE}/api/cart`, {
          method: "POST",
          headers: cartHeaders(),
          body: JSON.stringify({ items })
        });
      } catch (err) {
        console.warn("Failed to save cart", err);
      }
    }, 300);
  };

  const syncCartFromApi = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cart`, { headers: cartHeaders() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length) {
        state.cart = items.map((item) => ({
          id: String(item.product_id),
          qty: Number(item.quantity)
        })).filter((line) => Number.isFinite(line.qty) && line.qty > 0);
        persistCart();
        renderCart();
        return;
      }
      if (state.cart.length) {
        scheduleCartSave();
      }
    } catch (err) {
      console.warn("Failed to load cart", err);
    }
  };

  const normalizeProducts = (products = []) =>
    products.map((p, index) => ({
      id: String(p.id ?? p.slug ?? `prod-${Date.now()}-${index}`),
      slug: p.slug || `prod-${Date.now()}-${index}`,
      name: p.name || "Untitled product",
      price: Number(p.price_egp ?? p.price ?? 0),
      description: p.description || "",
      image: p.image_url || p.image || "assets/hero-keychain.svg",
      featured: Boolean(p.featured)
    }));

  const loadCachedProducts = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || "[]");
      return Array.isArray(saved) ? normalizeProducts(saved) : [];
    } catch {
      return [];
    }
  };

  const persistProductsCache = (products = []) => {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  };

  const setProducts = (products = []) => {
    state.products = products;
    renderProducts();
    renderAdminTable();
    renderCart();
  };

  const fetchProductsFile = async () => {
    const fetchFrom = async (base) => {
      const res = await fetch(`${base}/api/products`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = normalizeProducts(data);
        persistProductsCache(mapped);
        setProducts(mapped);
        return;
      }
      throw new Error("Unexpected response shape");
    };

    try {
      await fetchFrom(API_BASE);
      return;
    } catch (err) {
      if (API_BASE !== FALLBACK_API_BASE) {
        try {
          await fetchFrom(FALLBACK_API_BASE);
          return;
        } catch (fallbackErr) {
          console.warn("Falling back to built-in products", fallbackErr);
        }
      } else {
        console.warn("Falling back to built-in products", err);
      }
    }
    const cachedProducts = loadCachedProducts();
    if (cachedProducts.length) {
      setProducts(cachedProducts);
      return;
    }

    // final fallback when no API or cached products are available
    setProducts([
      {
        id: "cube",
        name: "Neon Cube Keychain",
        price: 300,
        description: "Matte neon finish with beveled edges and stainless split ring.",
        image: "assets/hero-keychain.svg",
        featured: true
      },
      {
        id: "ring",
        name: "Orbit Ring",
        price: 300,
        description: "Dual-color orbit design with floating core and glossy highlights.",
        image: "assets/hero-keychain.svg",
        featured: true
      },
      {
        id: "mono",
        name: "Monogram Block",
        price: 300,
        description: "Personalized block letters with recessed engraving.",
        image: "assets/hero-keychain.svg",
        featured: true
      },
      {
        id: "retro",
        name: "Retro Badge",
        price: 300,
        description: "Throwback badge silhouette with soft-touch finish.",
        image: "assets/hero-keychain.svg",
        featured: false
      },
      {
        id: "metallic",
        name: "Metallic Edge",
        price: 300,
        description: "Edge-highlighted form with metallic accents.",
        image: "assets/hero-keychain.svg",
        featured: false
      },
      {
        id: "glyph",
        name: "Glyph Tag",
        price: 300,
        description: "Minimal tag with etched glyph and satin texture.",
        image: "assets/hero-keychain.svg",
        featured: false
      }
    ]);
  };

  const formatMoney = (amount) => `${amount.toLocaleString("en-EG")} EGP`;

  const setLang = (lang) => {
    state.lang = lang;
    const rtl = lang === "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", rtl);
    qs("#LanguageSelect").value = lang;
    qsa("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const value = translations[lang]?.[key];
      if (value) el.textContent = value;
    });
    qsa("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      const value = translations[lang]?.[key];
      if (value) el.placeholder = value;
    });
    renderFaq();
    renderProducts();
    renderCart();
    updateHolidayLabel();
  };

  const setTheme = (theme) => {
    state.theme = theme;
    const label = qs("[data-theme-label]");
    document.body.classList.toggle("light", theme === "light");
    if (label) {
      const key = theme === "light" ? "theme.dark" : "theme.light";
      label.textContent = translations[state.lang]?.[key] || (theme === "light" ? "Dark" : "Light");
    }
    localStorage.setItem("theme", theme);
  };

  const updateHolidayLabel = () => {
    const label = qs("[data-holiday-label]");
    if (!label) return;
    const key = state.holiday ? "holiday.off" : "holiday.on";
    label.textContent = translations[state.lang]?.[key] || (state.holiday ? "Holiday off" : "Holiday on");
  };

  let snowActive = false;
  const startSnow = () => {
    const layer = qs("[data-snow]");
    if (!layer || snowActive) return;
    snowActive = true;
    const count = 60;
    layer.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const flake = document.createElement("div");
      flake.className = "snowflake";
      flake.textContent = "*";
      const size = Math.random() * 8 + 6; // 6-14px
      const duration = Math.random() * 8 + 8; // 8-16s
      const delay = Math.random() * -12; // start mid-fall
      const drift = Math.random() * 30 - 15;
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.fontSize = `${size}px`;
      flake.style.animationDuration = `${duration}s`;
      flake.style.animationDelay = `${delay}s`;
      flake.style.setProperty("--drift", `${drift}px`);
      layer.appendChild(flake);
    }
  };

  const stopSnow = () => {
    const layer = qs("[data-snow]");
    if (layer) layer.innerHTML = "";
    snowActive = false;
  };

  const setHoliday = (enabled) => {
    state.holiday = enabled;
    document.body.classList.toggle("holiday", enabled);
    enabled ? startSnow() : stopSnow();
    updateHolidayLabel();
    localStorage.setItem("holiday", enabled ? "1" : "0");
  };

  const renderProducts = () => {
    const featuredWrap = qs("#featured-grid");
    const productWrap = qs("#product-grid");
    if (!featuredWrap || !productWrap) return;
    featuredWrap.innerHTML = "";
    productWrap.innerHTML = "";

    const templateCard = (product) => {
      const card = document.createElement("article");
      card.className = "card product-card animate";
      card.innerHTML = `
        <div class="hero-visual" style="padding: 12px;">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info">
          <div>
            <strong>${product.name}</strong>
            <div class="price">${formatMoney(product.price)}</div>
          </div>
          <button class="button secondary" type="button" data-add="${product.id}" data-i18n="featured.cta">${translations[state.lang]["featured.cta"]}</button>
        </div>
      `;
      return card;
    };

    state.products.filter((p) => p.featured).forEach((p) => featuredWrap.appendChild(templateCard(p)));
    state.products.forEach((p) => productWrap.appendChild(templateCard(p)));


    qsa("[data-add]").forEach((btn) =>
      btn.addEventListener("click", () => {
        addToCart(btn.dataset.add);
      })
    );
    reveal();
  };

  const addToCart = (id) => {
    const existing = state.cart.find((line) => line.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      const product = state.products.find((p) => p.id === id);
      if (!product) return;
      state.cart.push({ id, qty: 1 });
    }
    animateBadge();
    renderCart(true);
  };

  const animateBadge = () => {
    const badge = qs("[data-cart-count]");
    if (!badge) return;
    badge.classList.add("pulse");
    setTimeout(() => badge.classList.remove("pulse"), 220);
  };

  const renderCart = (openDrawer = false) => {
    const wrap = qs("#cart-lines");
    const totalEl = qs("[data-cart-total]");
    const countEl = qs("[data-cart-count]");
    if (!wrap || !totalEl || !countEl) return;

    wrap.innerHTML = "";
    let total = 0;
    let count = 0;
    if (state.cart.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text";
      empty.textContent = translations[state.lang]["cart.empty"];
      wrap.appendChild(empty);
    } else {
      state.cart.forEach((line) => {
        const product = state.products.find((p) => p.id === line.id);
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
          <button type="button" class="linklike" data-remove>Remove</button>
          <div class="qty" data-qty>
            <button type="button" data-qty-change="-1">−</button>
            <span data-qty-value>${line.qty}</span>
            <button type="button" data-qty-change="1">+</button>
          </div>
        `;
        row.querySelectorAll("[data-qty-change]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const delta = Number(btn.dataset.qtyChange || 0);
            line.qty = Math.max(1, line.qty + delta);
            renderCart();
          });
        });
        row.querySelector("[data-remove]")?.addEventListener("click", () => {
          state.cart = state.cart.filter((item) => item.id !== line.id);
          renderCart();
        });
        wrap.appendChild(row);
      });
    }
    totalEl.textContent = formatMoney(total);
    countEl.textContent = count;
    persistCart();
    scheduleCartSave();
    if (openDrawer && state.cart.length > 0) {
      toggleCart(true);
    }
  };

  const toggleCart = (show) => {
    const drawer = qs("[data-cart-drawer]");
    if (!drawer) return;
    drawer.classList.toggle("active", show);
    drawer.setAttribute("aria-hidden", show ? "false" : "true");
  };

  const renderFaq = () => {
    const wrap = qs("#faq-list");
    if (!wrap) return;
    wrap.innerHTML = "";
    faqs.forEach((item) => {
      const q = item.question[state.lang];
      const a = item.answer[state.lang];
      const block = document.createElement("div");
      block.className = "accordion-item animate";
      block.dataset.accordion = "";
      block.innerHTML = `
        <button class="accordion-header" aria-expanded="false">
          <span>${q}</span>
          <span aria-hidden="true">+</span>
        </button>
        <div class="accordion-body">
          <p>${a}</p>
        </div>
      `;
      wrap.appendChild(block);
    });
    bindAccordions();
    reveal();
  };

  const renderAdminTable = () => {
    const wrap = qs("#product-table");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (state.products.length === 0) {
      wrap.innerHTML = `<p class="text">No products yet.</p>`;
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
      wrap.appendChild(row);
    });
    qsa("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => loadIntoForm(btn.dataset.edit))
    );
    qsa("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteProduct(btn.dataset.delete))
    );
  };

  const resetForm = () => {
    const form = qs("#product-form");
    const status = qs("#form-status");
    if (!form) return;
    form.reset();
    form.dataset.editing = "";
    const action = qs("[data-form-action]");
    if (action) action.textContent = "Save product";
    if (status) {
      status.hidden = true;
      status.textContent = "";
    }
  };

  const loadIntoForm = (id) => {
    const form = qs("#product-form");
    if (!form) return;
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    form.name.value = product.name;
    form.price.value = product.price;
    form.description.value = product.description;
    if (product.image) {
      form.dataset.imageData = product.image;
      setThumb(product.image);
    }
    form.featured.checked = !!product.featured;
    form.dataset.editing = id;
    const action = qs("[data-form-action]");
    if (action) action.textContent = "Update product";
    const status = qs("#form-status");
    if (status) {
      status.hidden = false;
      status.textContent = "Editing product…";
    }
  };

  const deleteProduct = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this product?");
    if (!ok) return;
    try {
      await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: adminHeaders()
      });
      await fetchProductsFile();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const bindForm = () => {
    const form = qs("#product-form");
    const reset = qs("#reset-form");
    const status = qs("#form-status");
    if (!form) return;
    bindImageUpload();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const id = form.dataset.editing;
      const name = data.get("name")?.toString().trim() || "Untitled";
      const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "product";
      const slug = id ? state.products.find((p) => p.id === id)?.slug || slugBase : `${slugBase}-${Date.now()}`;
      const payload = {
        slug,
        name,
        price_egp: Number(data.get("price")) || 0,
        description: data.get("description")?.toString().trim() || "",
        image_url: form.dataset.imageData || "assets/hero-keychain.svg",
        featured: data.get("featured") === "on",
        is_active: 1
      };
      const method = id ? "PUT" : "POST";
      const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
      fetch(url, {
        method,
        headers: adminHeaders(),
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || "Save failed");
          await fetchProductsFile();
          if (status) {
            status.hidden = false;
            status.textContent = "Saved!";
          }
          form.dataset.editing = "";
          const action = qs("[data-form-action]");
          if (action) action.textContent = "Save product";
          form.reset();
          form.dataset.imageData = "";
        })
        .catch((err) => {
          if (status) {
            status.hidden = false;
            status.textContent = err.message;
          } else {
            alert(err.message);
          }
        });
    });
    reset?.addEventListener("click", resetForm);
  };

  const exportProducts = () => {
    const blob = new Blob([JSON.stringify(state.products, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const bindImportExport = () => {
    const exportBtn = qs("[data-export-products]");
    const importInput = qs("[data-import-products]");
    const importLabel = qs("[data-import-label]");
    exportBtn?.addEventListener("click", exportProducts);
    importInput?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (Array.isArray(parsed)) {
            const normalized = normalizeProducts(parsed);
            persistProductsCache(normalized);
            setProducts(normalized);
            if (importLabel) importLabel.textContent = file.name;
          } else {
            alert("Invalid JSON file.");
          }
        } catch (err) {
          alert("Could not read file.");
        }
      };
      reader.readAsText(file);
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

    const highlight = (on) => dropzone.classList.toggle("is-dragover", on);

    ["dragenter", "dragover"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        highlight(true);
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        highlight(false);
      })
    );
    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    });
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      handleFile(file);
    });
    trigger?.addEventListener("click", () => input.click());
  };

  // Animation/reveal
  const reveal = () => {
    const nodes = qsa(".animate:not(.visible)");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => obs.observe(n));
  };

  const headerState = () => {
    const header = qs("[data-header]");
    if (!header) return;
    const toggle = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
  };

  const bindAccordions = () => {
    qsa("[data-accordion]").forEach((item) => {
      const trigger = item.querySelector("button");
      trigger?.addEventListener("click", () => {
        const open = item.classList.toggle("open");
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  };

  const localizationSelect = () => {
    const select = qs("[data-language-select]");
    if (!select) return;
    select.addEventListener("change", () => setLang(select.value));
  };

  const themeToggle = () => {
    const btn = qs("[data-theme-toggle]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = state.theme === "dark" ? "light" : "dark";
      setTheme(next);
    });
  };

  const holidayToggle = () => {
    const btn = qs("[data-holiday-toggle]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      setHoliday(!state.holiday);
    });
  };

  const cartDrawerBindings = () => {
    qsa("[data-cart-open]").forEach((btn) => btn.addEventListener("click", () => toggleCart(true)));
    qsa("[data-cart-close]").forEach((btn) => btn.addEventListener("click", () => toggleCart(false)));
    qs(".cart-backdrop")?.addEventListener("click", () => toggleCart(false));
  };

  const checkoutForm = () => {
    const form = qs("[data-checkout-form]");
    const status = qs("[data-checkout-status]");
    const paymentHint = qs("[data-payment-hint]");
    const cardFields = qs("[data-card-fields]");
    if (!form || !status) return;
    const paymentSelect = form.querySelector("select[name=\"payment\"]");
    const updatePaymentHint = () => {
      if (!paymentSelect) return;
      const value = paymentSelect.value;
      const showTransfer = value === "instapay" || value === "vodafone";
      if (paymentHint) paymentHint.hidden = !showTransfer;
      if (cardFields) cardFields.hidden = value !== "card";
      if (value === "") {
        if (paymentHint) paymentHint.hidden = true;
        if (cardFields) cardFields.hidden = true;
        cardFields?.querySelectorAll("input").forEach((input) => {
          input.value = "";
        });
      }
    };
    paymentSelect?.addEventListener("change", updatePaymentHint);
    updatePaymentHint();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      status.hidden = false;
      if (state.cart.length === 0) {
        status.textContent = "Add items to your cart before checkout.";
        return;
      }
      status.textContent = "Order received! We will contact you shortly.";
      form.reset();
    });
  };


  const contactForm = () => {
    const form = qs("#contact-form");
    const status = qs("#contact-status");
    if (!form || !status) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      status.hidden = false;
      status.textContent = state.lang === "ar" ? "تم الإرسال! سنعود إليك قريباً." : "Sent! We’ll get back to you soon.";
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    const year = qs("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    headerState();
    localizationSelect();
    themeToggle();
    holidayToggle();
    bindForm();
    bindImportExport();
    cartDrawerBindings();
    checkoutForm();
    contactForm();
    const savedTheme = localStorage.getItem("theme");
    const savedHoliday = localStorage.getItem("holiday") === "1";
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    setLang("en");
    setTheme(state.theme);
    setHoliday(savedHoliday);
    loadCart();
    const cachedProducts = loadCachedProducts();
    if (cachedProducts.length) {
      setProducts(cachedProducts);
    }
    fetchProductsFile()
      .then(() => {
        renderAdminTable();
        reveal();
      })
      .catch(() => {
        renderAdminTable();
        reveal();
      });
    syncCartFromApi();
  });
})();
