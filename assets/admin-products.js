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
  const MANAGED_PRODUCTS_KEY = "managed_products_v1";
  const PRODUCTS_CACHE_KEY = "products_cache_v6";

  const state = {
    mode: "loading",
    products: [],
    editingId: null,
    apiBase: API_BASE,
    uploadingImage: false
  };

  const currentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const adminAuthHeaders = () => {
    const user = currentUser();
    return {
      user_id: user?.id || "",
      is_admin: user?.is_admin ? "1" : "0"
    };
  };

  const adminHeaders = () => ({
    "Content-Type": "application/json",
    ...adminAuthHeaders()
  });

  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString("en-EG")} EGP`;
  const toBoolean = (value) => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
  const slugify = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const normalizeProducts = (products = []) =>
    (Array.isArray(products) ? products : [])
      .map((product, index) => {
        const id = product?.id ?? product?.slug ?? `product-${index + 1}`;
        const name = String(product?.name || "").trim();
        const slug = String(product?.slug || slugify(name)).trim();
        if (!id || !name || !slug) return null;
        return {
          id: String(id),
          slug,
          name,
          price: Number(product?.price_egp ?? product?.price ?? 300) || 300,
          color: String(product?.color || "").trim(),
          image: String(product?.image_url || product?.image || PRODUCT_IMAGE_FALLBACK).trim(),
          description: String(product?.description || "").trim(),
          featured: toBoolean(product?.featured)
        };
      })
      .filter(Boolean);

  const parseProductPayload = (payload) => {
    const products = normalizeProducts(payload);
    if (!products.length) throw new Error("Product source is empty.");
    return products;
  };

  const loadManagedProducts = () => {
    try {
      return normalizeProducts(JSON.parse(localStorage.getItem(MANAGED_PRODUCTS_KEY) || "[]"));
    } catch {
      return [];
    }
  };

  const persistManagedProducts = (products) => {
    localStorage.setItem(MANAGED_PRODUCTS_KEY, JSON.stringify(normalizeProducts(products)));
  };

  const persistProductsCache = (products) => {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(normalizeProducts(products)));
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

  const setSubmitState = () => {
    const formButton = qs("[data-form-action]");
    const fileInput = qs("#imageFile");
    if (formButton) {
      formButton.disabled = state.uploadingImage;
      formButton.textContent = state.uploadingImage
        ? "Uploading Image..."
        : state.editingId
          ? "Update Product"
          : "Add Product";
    }
    if (fileInput) fileInput.disabled = state.uploadingImage;
  };

  const setModeUi = () => {
    const badge = qs("[data-admin-mode-badge]");
    const note = qs("[data-admin-note]");
    if (!badge || !note) return;

    if (state.mode === "backend") {
      badge.textContent = "Database";
      note.textContent = "Changes are saved to the backend database through the products API and reflected in the storefront.";
      return;
    }

    badge.textContent = "Local Fallback";
    note.textContent = "Backend API is unavailable. Changes are saved in this browser only using localStorage.";
  };

  const productImageMarkup = (product) =>
    `<img src="${String(product?.image || PRODUCT_IMAGE_FALLBACK)}" alt="${product.name}" data-product-image>`;

  const setUploadPreview = (imagePath = "", imageName = "Product image") => {
    const preview = qs("[data-image-preview]");
    const previewImage = qs("[data-image-preview-image]");
    const previewPath = qs("[data-image-preview-path]");
    if (!preview || !previewImage || !previewPath) return;

    if (!imagePath) {
      preview.hidden = true;
      previewImage.removeAttribute("src");
      previewImage.removeAttribute("alt");
      previewImage.dataset.fallbackApplied = "";
      previewPath.textContent = "";
      return;
    }

    preview.hidden = false;
    previewImage.dataset.fallbackApplied = "";
    previewImage.onerror = () => {
      if (previewImage.dataset.fallbackApplied === "true") return;
      previewImage.dataset.fallbackApplied = "true";
      previewImage.src = PRODUCT_IMAGE_FALLBACK;
    };
    previewImage.src = imagePath;
    previewImage.alt = imageName;
    previewPath.textContent = imagePath;
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

  const renderProducts = () => {
    const list = qs("#admin-product-list");
    if (!list) return;
    setModeUi();
    list.innerHTML = "";

    if (!state.products.length) {
      list.innerHTML = '<p class="mock-admin-empty">No products yet.</p>';
      return;
    }

    list.innerHTML = state.products
      .map(
        (product) => `
          <article class="mock-admin-product">
            <div class="mock-admin-product__media">
              ${productImageMarkup(product)}
            </div>
            <div class="mock-admin-product__body">
              <div class="mock-admin-product__top">
                <div>
                  <h3 class="mock-admin-product__title">${product.name}</h3>
                  <span class="mock-pill-badge">${product.featured ? "Featured" : "Standard"}</span>
                </div>
                <strong>${formatMoney(product.price)}</strong>
              </div>
              <div class="mock-admin-product__meta">
                <p><strong>Slug:</strong> ${product.slug}</p>
                <p><strong>Color:</strong> ${product.color || "-"}</p>
                <p><strong>Image:</strong> ${product.image || PRODUCT_IMAGE_FALLBACK}</p>
                <p>${product.description || "No description."}</p>
              </div>
              <div class="mock-admin-product__actions">
                <button class="mock-primary-button" type="button" data-edit-product="${product.id}">Edit</button>
                <button class="mock-secondary-button" type="button" data-delete-product="${product.id}">Delete</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");

    bindImageFallbacks(list);
    qsa("[data-edit-product]", list).forEach((button) => {
      button.addEventListener("click", () => loadIntoForm(button.dataset.editProduct));
    });
    qsa("[data-delete-product]", list).forEach((button) => {
      button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
    });
  };

  const resetForm = () => {
    const form = qs("#admin-product-form");
    if (!form) return;
    form.reset();
    state.editingId = null;
    state.uploadingImage = false;
    const imagePath = qs("#imagePath");
    if (imagePath) imagePath.value = "";
    setUploadPreview("");
    setSubmitState();
    setStatus("");
  };

  const loadIntoForm = (id) => {
    const form = qs("#admin-product-form");
    const product = state.products.find((item) => item.id === String(id));
    if (!form || !product) return;
    form.elements.name.value = product.name;
    form.elements.slug.value = product.slug;
    form.elements.price.value = String(product.price);
    form.elements.color.value = product.color;
    form.elements.image.value = product.image;
    form.elements.description.value = product.description;
    form.elements.featured.checked = Boolean(product.featured);
    state.editingId = product.id;
    setUploadPreview(product.image, product.name);
    setSubmitState();
    setStatus("Editing selected product.");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFormPayload = () => {
    const form = qs("#admin-product-form");
    if (!form) throw new Error("Product form is missing.");

    const name = String(form.elements.name.value || "").trim();
    const slug = String(form.elements.slug.value || "").trim() || slugify(name);
    const price = Number(form.elements.price.value || 0) || 0;
    const image = String(form.elements.image.value || "").trim();

    if (!name) throw new Error("Product name is required.");
    if (!slug) throw new Error("Slug is required.");
    if (!price) throw new Error("Price is required.");
    if (!image) throw new Error("Product image is required.");
    if (state.uploadingImage) throw new Error("Wait for the image upload to finish.");

    return {
      name,
      slug,
      price,
      color: String(form.elements.color.value || "").trim(),
      image,
      description: String(form.elements.description.value || "").trim(),
      featured: Boolean(form.elements.featured.checked)
    };
  };

  const refreshState = (products, mode = state.mode, apiBase = state.apiBase) => {
    state.products = normalizeProducts(products);
    state.mode = mode;
    state.apiBase = apiBase;
    renderProducts();
  };

  const loadProducts = async () => {
    try {
      const products = await loadProductsFromApi(API_BASE);
      persistProductsCache(products);
      refreshState(products, "backend", API_BASE);
      return;
    } catch (error) {
      console.warn("Primary products API load failed", error);
    }

    if (API_BASE !== FALLBACK_API_BASE) {
      try {
        const products = await loadProductsFromApi(FALLBACK_API_BASE);
        persistProductsCache(products);
        refreshState(products, "backend", FALLBACK_API_BASE);
        return;
      } catch (error) {
        console.warn("Fallback products API load failed", error);
      }
    }

    const managedProducts = loadManagedProducts();
    if (managedProducts.length) {
      refreshState(managedProducts, "local");
      return;
    }

    try {
      const products = await loadProductsFromJson();
      persistProductsCache(products);
      refreshState(products, "local");
      return;
    } catch (error) {
      console.warn("JSON product load failed", error);
    }

    if (window.location.protocol === "file:") {
      try {
        const products = await loadProductsFromLocalFile();
        persistProductsCache(products);
        refreshState(products, "local");
        return;
      } catch (error) {
        console.warn("Local file product load failed", error);
      }
    }

    try {
      const cached = normalizeProducts(JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || "[]"));
      refreshState(cached, "local");
    } catch {
      refreshState([], "local");
    }
  };

  const saveProductLocal = async (payload) => {
    const existingProducts = [...state.products];
    if (state.editingId) {
      const index = existingProducts.findIndex((product) => product.id === state.editingId);
      if (index >= 0) {
        existingProducts[index] = { ...existingProducts[index], ...payload };
      }
    } else {
      const nextId = existingProducts.reduce((max, product) => Math.max(max, Number(product.id) || 0), 0) + 1;
      existingProducts.push({ id: String(nextId), ...payload });
    }
    persistManagedProducts(existingProducts);
    persistProductsCache(existingProducts);
    refreshState(existingProducts, "local");
    resetForm();
    setStatus("Saved locally in this browser.");
  };

  const saveProductApi = async (payload) => {
    const isEditing = Boolean(state.editingId);
    const endpoint = isEditing ? `${state.apiBase}/api/products/${state.editingId}` : `${state.apiBase}/api/products`;
    const method = isEditing ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: adminHeaders(),
      body: JSON.stringify({
        slug: payload.slug,
        name: payload.name,
        description: payload.description,
        price_egp: payload.price,
        material: "",
        color: payload.color,
        is_active: 1,
        image_url: payload.image,
        featured: payload.featured ? 1 : 0
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    await loadProducts();
    resetForm();
    setStatus(isEditing ? "Product updated in database." : "Product created in database.");
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    if (state.mode === "backend") {
      try {
        const response = await fetch(`${state.apiBase}/api/products/${id}`, {
          method: "DELETE",
          headers: adminHeaders()
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        await loadProducts();
        setStatus("Product deleted.");
      } catch (error) {
        setStatus(error.message, "error");
      }
      return;
    }

    const nextProducts = state.products.filter((product) => product.id !== String(id));
    persistManagedProducts(nextProducts);
    persistProductsCache(nextProducts);
    refreshState(nextProducts, "local");
    if (state.editingId === String(id)) resetForm();
    setStatus("Product deleted from local fallback.");
  };

  const uploadImage = async (file) => {
    if (!file) return;
    state.uploadingImage = true;
    setSubmitState();
    setStatus("Uploading image...");

    try {
      const payload = new FormData();
      payload.append("image", file);
      const response = await fetch(`${state.apiBase}/api/upload`, {
        method: "POST",
        headers: adminAuthHeaders(),
        body: payload
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      if (!body.imagePath) {
        throw new Error("Upload succeeded but no image path was returned.");
      }

      const hiddenPath = qs("#imagePath");
      if (hiddenPath) hiddenPath.value = body.imagePath;
      setUploadPreview(body.imagePath, file.name || "Uploaded product image");
      setStatus("Image uploaded successfully.");
    } catch (error) {
      const hiddenPath = qs("#imagePath");
      if (hiddenPath && !state.editingId) hiddenPath.value = "";
      setStatus(error.message, "error");
      throw error;
    } finally {
      state.uploadingImage = false;
      setSubmitState();
    }
  };

  const bindForm = () => {
    const form = qs("#admin-product-form");
    if (!form) return;

    const imageInput = qs("#imageFile");
    imageInput?.addEventListener("change", async (event) => {
      const file = event.target?.files?.[0];
      if (!file) return;
      try {
        await uploadImage(file);
      } catch {
        event.target.value = "";
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = getFormPayload();
        if (state.mode === "backend") await saveProductApi(payload);
        else await saveProductLocal(payload);
      } catch (error) {
        setStatus(error.message, "error");
      }
    });

    qs("[data-reset-form]")?.addEventListener("click", resetForm);
    setSubmitState();
  };

  document.addEventListener("DOMContentLoaded", async () => {
    bindForm();
    await loadProducts();
  });
})();
