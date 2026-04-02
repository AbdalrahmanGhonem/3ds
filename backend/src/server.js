import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });
const projectRoot = path.resolve(__dirname, "..", "..");
const uploadsDir = path.join(projectRoot, "uploads");
const PORT = Number(process.env.PORT) || 4000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const PASSWORD_RESET_MINUTES = Number(process.env.PASSWORD_RESET_MINUTES || 15);
const EMAIL_USER = String(process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = String(process.env.EMAIL_PASS || "").replace(/\s+/g, "");
fs.mkdirSync(uploadsDir, { recursive: true });
const SEEDED_DEMO_PRODUCT_SLUGS = [
  "neon-cube-keychain",
  "orbit-ring",
  "monogram-block",
  "retro-badge",
  "metallic-edge",
  "glyph-tag"
];
const BOOTSTRAP_ADMIN = {
  id: "bootstrap-admin",
  name: "3DS Admin",
  email: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@3ds.local",
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin1234!",
  is_admin: true
};
const isSeededDemoProductSlug = (slug) =>
  SEEDED_DEMO_PRODUCT_SLUGS.includes(String(slug || "").trim().toLowerCase());

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use("/assets", express.static(path.join(projectRoot, "assets")));
app.use("/uploads", express.static(uploadsDir));

const pageRoutes = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/shop", "shop.html"],
  ["/shop.html", "shop.html"],
  ["/cart", "cart.html"],
  ["/cart.html", "cart.html"],
  ["/about", "about.html"],
  ["/about.html", "about.html"],
  ["/faq", "faq.html"],
  ["/faq.html", "faq.html"],
  ["/contact", "contact.html"],
  ["/contact.html", "contact.html"],
  ["/login", "login.html"],
  ["/login.html", "login.html"],
  ["/signup", "signup.html"],
  ["/signup.html", "signup.html"],
  ["/forgot-password", "forgot-password.html"],
  ["/forgot-password.html", "forgot-password.html"],
  ["/reset-password", "reset-password.html"],
  ["/reset-password.html", "reset-password.html"],
  ["/account", "account.html"],
  ["/account.html", "account.html"],
  ["/manage", "manage.html"],
  ["/manage.html", "manage.html"],
  ["/admin-products", "admin-products.html"],
  ["/admin-products.html", "admin-products.html"],
  ["/admin-orders", "admin-orders.html"],
  ["/admin-orders.html", "admin-orders.html"],
  ["/order-success", "order-success.html"],
  ["/order-success.html", "order-success.html"],
  ["/checkout", "checkout.html"],
  ["/checkout.html", "checkout.html"]
]);

const requireAdmin = async (req, res, next) => {
  const { user_id, is_admin } = req.headers || {};
  if (!user_id || !is_admin) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  if (String(is_admin) !== "1" && String(is_admin).toLowerCase() !== "true") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
};

const requireAuthenticated = async (req, res, next) => {
  const { user_id } = req.headers || {};
  if (!user_id) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

const toDatabaseFlag = (value) =>
  value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true" ? 1 : 0;
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const normalizeAccountUser = (user) => ({
  id: String(user.id),
  full_name: String(user.full_name || user.name || ""),
  email: String(user.email || ""),
  is_admin: user.is_admin === 1 || user.is_admin === true
});
const quoteIdentifier = (value) => `\`${String(value || "").replace(/`/g, "``")}\``;

let usersTableSchemaPromise = null;

const createUsersTableSchemaError = (message) => {
  const error = new Error(message);
  error.code = "USERS_SCHEMA_INVALID";
  return error;
};

const isRequiredColumnWithoutDefault = (column) =>
  Boolean(
    column &&
      String(column.Null).toUpperCase() === "NO" &&
      column.Default === null &&
      !String(column.Extra || "").toLowerCase().includes("auto_increment")
  );

const loadUsersTableSchema = async () => {
  if (!usersTableSchemaPromise) {
    usersTableSchemaPromise = (async () => {
      const [columns] = await pool.query("SHOW COLUMNS FROM users");
      const byName = new Map(columns.map((column) => [String(column.Field || "").trim(), column]));
      const schema = {
        id: byName.has("id") ? "id" : "",
        email: byName.has("email") ? "email" : "",
        fullName: byName.has("full_name") ? "full_name" : byName.has("name") ? "name" : "",
        passwordHash: byName.has("password_hash") ? "password_hash" : byName.has("password") ? "password" : "",
        isAdmin: byName.has("is_admin") ? "is_admin" : "",
        createdAt: byName.has("created_at") ? "created_at" : "",
        updatedAt: byName.has("updated_at") ? "updated_at" : "",
        phone: byName.has("phone") ? "phone" : "",
        locale: byName.has("locale") ? "locale" : "",
        byName
      };

      if (!schema.id || !schema.email || !schema.fullName || !schema.passwordHash) {
        throw createUsersTableSchemaError(
          "Users table must include id, email, and name/password columns for authentication."
        );
      }

      return schema;
    })().catch((error) => {
      usersTableSchemaPromise = null;
      throw error;
    });
  }

  return usersTableSchemaPromise;
};

const getUserIdentitySelect = (schema) =>
  [
    `${quoteIdentifier(schema.id)} AS id`,
    `${quoteIdentifier(schema.fullName)} AS full_name`,
    `${quoteIdentifier(schema.email)} AS email`,
    schema.isAdmin ? `${quoteIdentifier(schema.isAdmin)} AS is_admin` : "0 AS is_admin"
  ].join(", ");

const getUserAuthSelect = (schema) =>
  [
    `${quoteIdentifier(schema.id)} AS id`,
    `${quoteIdentifier(schema.fullName)} AS full_name`,
    `${quoteIdentifier(schema.passwordHash)} AS password_hash`,
    schema.isAdmin ? `${quoteIdentifier(schema.isAdmin)} AS is_admin` : "0 AS is_admin"
  ].join(", ");

const buildUserInsert = ({ schema, fullName, email, passwordHash }) => {
  const columns = [schema.fullName, schema.email, schema.passwordHash];
  const values = [fullName, email, passwordHash];
  const placeholders = ["?", "?", "?"];

  if (schema.isAdmin) {
    columns.push(schema.isAdmin);
    placeholders.push("0");
  }

  if (schema.locale && isRequiredColumnWithoutDefault(schema.byName.get(schema.locale))) {
    columns.push(schema.locale);
    values.push("en");
    placeholders.push("?");
  }

  if (schema.phone && isRequiredColumnWithoutDefault(schema.byName.get(schema.phone))) {
    columns.push(schema.phone);
    values.push("");
    placeholders.push("?");
  }

  if (schema.createdAt && isRequiredColumnWithoutDefault(schema.byName.get(schema.createdAt))) {
    columns.push(schema.createdAt);
    placeholders.push("NOW()");
  }

  if (schema.updatedAt && isRequiredColumnWithoutDefault(schema.byName.get(schema.updatedAt))) {
    columns.push(schema.updatedAt);
    placeholders.push("NOW()");
  }

  return {
    sql: `INSERT INTO users (${columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders.join(", ")})`,
    values
  };
};

const buildPasswordUpdate = (schema) => {
  const assignments = [`${quoteIdentifier(schema.passwordHash)} = ?`];
  if (schema.updatedAt) {
    assignments.push(`${quoteIdentifier(schema.updatedAt)} = NOW()`);
  }
  return `UPDATE users SET ${assignments.join(", ")} WHERE ${quoteIdentifier(schema.id)} = ?`;
};

const logDatabaseError = (context, err, extra = {}) => {
  console.error(`[auth] ${context}`, {
    message: err?.message,
    code: err?.code,
    errno: err?.errno,
    sqlState: err?.sqlState,
    sqlMessage: err?.sqlMessage,
    ...extra
  });
};

const logProductError = (context, err, extra = {}) => {
  console.error(`[products] ${context}`, {
    message: err?.message,
    code: err?.code,
    errno: err?.errno,
    sqlState: err?.sqlState,
    sqlMessage: err?.sqlMessage,
    ...extra
  });
};

const errorResponseForAuth = (err, fallbackMessage) => {
  if (err?.code === "ER_DUP_ENTRY") {
    return { status: 409, error: "Email already registered" };
  }
  if (err?.code === "ER_NO_SUCH_TABLE") {
    return { status: 500, error: "Users table does not exist in the database" };
  }
  if (err?.code === "ER_BAD_FIELD_ERROR" || err?.code === "USERS_SCHEMA_INVALID") {
    return { status: 500, error: "Users table schema is missing required signup columns" };
  }
  if (err?.code === "ER_NO_DEFAULT_FOR_FIELD") {
    return { status: 500, error: "Users table requires additional fields before signup can save new accounts" };
  }
  return { status: 500, error: fallbackMessage };
};

const loadAuthenticatedUser = async (userId, isAdmin) => {
  if (String(userId) === BOOTSTRAP_ADMIN.id && isAdmin) {
    return {
      id: BOOTSTRAP_ADMIN.id,
      full_name: BOOTSTRAP_ADMIN.name,
      email: BOOTSTRAP_ADMIN.email,
      is_admin: true
    };
  }

  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return null;
  }

  const userSchema = await loadUsersTableSchema();
  const [rows] = await pool.query(
    `SELECT ${getUserIdentitySelect(userSchema)} FROM users WHERE ${quoteIdentifier(userSchema.id)} = ? LIMIT 1`,
    [numericUserId]
  );

  return rows.length ? rows[0] : null;
};

const ORDER_STATUS_VALUES = new Set(["pending", "confirmed", "shipped", "delivered", "cancelled"]);
const ORDER_DEFAULT_PAYMENT_METHOD = "cash_on_delivery";
const ORDER_PAYMENT_METHOD_VALUES = new Set(["cash_on_delivery", "vodafone_cash", "instapay", "stripe"]);
const ORDER_SHIPPING_THRESHOLD_EGP = 500;
const ORDER_SHIPPING_FEE_EGP = 60;

let orderSchemaPromise = null;
let cartSchemaPromise = null;

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeMoney = (value) => Number(Number(value || 0).toFixed(2));
const normalizePhone = (value) => String(value || "").trim().replace(/\s+/g, " ");
const calculateShippingEgp = (subtotal) =>
  subtotal >= ORDER_SHIPPING_THRESHOLD_EGP || subtotal === 0 ? 0 : ORDER_SHIPPING_FEE_EGP;
const createOrderNumber = () =>
  `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const logOrderError = (context, err, extra = {}) => {
  console.error(`[orders] ${context}`, {
    message: err?.message,
    code: err?.code,
    errno: err?.errno,
    sqlState: err?.sqlState,
    sqlMessage: err?.sqlMessage,
    ...extra
  });
};

const tableExists = async (tableName) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return Number(rows[0]?.count) > 0;
};

const indexExists = async (tableName, indexName) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
    [tableName, indexName]
  );
  return Number(rows[0]?.count) > 0;
};

const loadTableColumns = async (tableName) => {
  if (!(await tableExists(tableName))) return new Map();
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`);
  return new Map(rows.map((row) => [String(row.Field), row]));
};

const addColumnIfMissing = async (tableName, columns, columnName, definitionSql) => {
  if (columns.has(columnName)) return;
  await pool.query(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${definitionSql}`);
  columns.set(columnName, { Field: columnName });
};

const ensureIndex = async (tableName, indexName, definitionSql) => {
  if (await indexExists(tableName, indexName)) return;
  await pool.query(`ALTER TABLE ${quoteIdentifier(tableName)} ADD ${definitionSql}`);
};

const ensureCartSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      guest_token VARCHAR(255) DEFAULT NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY user_id (user_id),
      UNIQUE KEY guest_token (guest_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const cartColumns = await loadTableColumns("carts");
  await addColumnIfMissing("carts", cartColumns, "guest_token", "guest_token VARCHAR(255) NULL AFTER user_id");
  await pool.query("ALTER TABLE carts MODIFY COLUMN user_id BIGINT UNSIGNED NULL");
};

const ensureCartSchemaReady = async () => {
  if (!cartSchemaPromise) {
    cartSchemaPromise = ensureCartSchema().catch((error) => {
      cartSchemaPromise = null;
      throw error;
    });
  }
  return cartSchemaPromise;
};

const ensureOrderSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_number VARCHAR(64) DEFAULT NULL,
      customer_name VARCHAR(190) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      governorate VARCHAR(120) NOT NULL,
      district VARCHAR(120) NOT NULL,
      address TEXT NOT NULL,
      payment_method VARCHAR(64) NOT NULL DEFAULT 'cash_on_delivery',
      subtotal_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      shipping_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      user_id BIGINT UNSIGNED NULL,
      guest_token VARCHAR(190) DEFAULT NULL,
      shipping_name VARCHAR(190) DEFAULT NULL,
      shipping_phone VARCHAR(32) DEFAULT NULL,
      shipping_addr TEXT DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_orders_order_number (order_number),
      KEY idx_orders_user_id (user_id),
      KEY idx_orders_guest_token (guest_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const orderColumns = await loadTableColumns("orders");
  await addColumnIfMissing("orders", orderColumns, "order_number", "order_number VARCHAR(64) NULL AFTER id");
  await addColumnIfMissing("orders", orderColumns, "customer_name", "customer_name VARCHAR(190) NULL AFTER order_number");
  await addColumnIfMissing("orders", orderColumns, "phone", "phone VARCHAR(32) NULL AFTER customer_name");
  await addColumnIfMissing("orders", orderColumns, "governorate", "governorate VARCHAR(120) NULL AFTER phone");
  await addColumnIfMissing("orders", orderColumns, "district", "district VARCHAR(120) NULL AFTER governorate");
  await addColumnIfMissing("orders", orderColumns, "address", "address TEXT NULL AFTER district");
  await addColumnIfMissing("orders", orderColumns, "subtotal_egp", "subtotal_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER payment_method");
  await addColumnIfMissing("orders", orderColumns, "shipping_egp", "shipping_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER subtotal_egp");
  await addColumnIfMissing("orders", orderColumns, "guest_token", "guest_token VARCHAR(190) NULL AFTER user_id");
  await addColumnIfMissing("orders", orderColumns, "shipping_name", "shipping_name VARCHAR(190) NULL AFTER guest_token");
  await addColumnIfMissing("orders", orderColumns, "shipping_phone", "shipping_phone VARCHAR(32) NULL AFTER shipping_name");
  await addColumnIfMissing("orders", orderColumns, "shipping_addr", "shipping_addr TEXT NULL AFTER shipping_phone");

  await pool.query("ALTER TABLE orders MODIFY COLUMN user_id BIGINT UNSIGNED NULL");
  await pool.query("ALTER TABLE orders MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending'");
  await pool.query("ALTER TABLE orders MODIFY COLUMN payment_method VARCHAR(64) NOT NULL DEFAULT 'cash_on_delivery'");

  await ensureIndex("orders", "uniq_orders_order_number", "UNIQUE INDEX uniq_orders_order_number (order_number)");
  await ensureIndex("orders", "idx_orders_user_id", "INDEX idx_orders_user_id (user_id)");
  await ensureIndex("orders", "idx_orders_guest_token", "INDEX idx_orders_guest_token (guest_token)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NOT NULL,
      product_name VARCHAR(190) NOT NULL,
      product_slug VARCHAR(190) NOT NULL,
      product_image_url TEXT DEFAULT NULL,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      unit_price_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      quantity INT UNSIGNED NOT NULL,
      line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      line_total_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      PRIMARY KEY (id),
      KEY idx_order_items_order_id (order_id),
      KEY idx_order_items_product_id (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const itemColumns = await loadTableColumns("order_items");
  await addColumnIfMissing("order_items", itemColumns, "product_name", "product_name VARCHAR(190) NULL AFTER product_id");
  await addColumnIfMissing("order_items", itemColumns, "product_slug", "product_slug VARCHAR(190) NULL AFTER product_name");
  await addColumnIfMissing("order_items", itemColumns, "product_image_url", "product_image_url TEXT NULL AFTER product_slug");
  await addColumnIfMissing("order_items", itemColumns, "unit_price_egp", "unit_price_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER unit_price");
  await addColumnIfMissing("order_items", itemColumns, "line_total_egp", "line_total_egp DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER line_total");

  await ensureIndex("order_items", "idx_order_items_order_id", "INDEX idx_order_items_order_id (order_id)");
  await ensureIndex("order_items", "idx_order_items_product_id", "INDEX idx_order_items_product_id (product_id)");
};

const ensureOrderSchemaReady = async () => {
  if (!orderSchemaPromise) {
    orderSchemaPromise = ensureOrderSchema().catch((error) => {
      orderSchemaPromise = null;
      throw error;
    });
  }
  return orderSchemaPromise;
};

const validateOrderPayload = (body = {}) => {
  const customerName = String(body.customer_name || body.full_name || "").trim();
  const phone = normalizePhone(body.phone);
  const governorate = String(body.governorate || body.city || "").trim();
  const district = String(body.district || "").trim();
  const address = String(body.address || "").trim();
  const paymentMethod = String(body.payment_method || ORDER_DEFAULT_PAYMENT_METHOD).trim().toLowerCase();
  const phoneDigits = phone.replace(/\D/g, "");

  if (customerName.length < 2) throw createHttpError(400, "Customer name is required.");
  if (phoneDigits.length < 8) throw createHttpError(400, "A valid phone number is required.");
  if (governorate.length < 2) throw createHttpError(400, "Governorate is required.");
  if (district.length < 2) throw createHttpError(400, "District is required.");
  if (address.length < 5) throw createHttpError(400, "Address is required.");
  if (!ORDER_PAYMENT_METHOD_VALUES.has(paymentMethod)) {
    throw createHttpError(400, "Invalid payment method.");
  }

  return {
    customerName,
    phone,
    governorate,
    district,
    address,
    paymentMethod
  };
};

const sanitizeCartItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      product_id: Number(item?.product_id),
      quantity: Number(item?.quantity)
    }))
    .filter(
      (item) =>
        Number.isInteger(item.product_id) &&
        item.product_id > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );

const mapOrderRecord = (row) => ({
  id: Number(row.id),
  order_number: String(row.order_number || ""),
  customer_name: String(row.customer_name || row.shipping_name || ""),
  phone: String(row.phone || row.shipping_phone || ""),
  governorate: String(row.governorate || ""),
  district: String(row.district || ""),
  address: String(row.address || row.shipping_addr || ""),
  payment_method: String(row.payment_method || ORDER_DEFAULT_PAYMENT_METHOD),
  subtotal_egp: normalizeMoney(row.subtotal_egp),
  shipping_egp: normalizeMoney(row.shipping_egp),
  total_egp: normalizeMoney(row.total_egp),
  status: String(row.status || "pending"),
  user_id: row.user_id == null ? null : Number(row.user_id),
  guest_token: String(row.guest_token || ""),
  created_at: row.created_at,
  updated_at: row.updated_at
});

const fetchOrderItemRows = async (orderIds) => {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT
        order_id,
        product_id,
        product_name,
        product_slug,
        product_image_url,
        quantity,
        COALESCE(unit_price_egp, unit_price, 0) AS unit_price_egp,
        COALESCE(line_total_egp, line_total, 0) AS line_total_egp
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id ASC`,
    orderIds
  );
  return rows;
};

const groupOrderItems = (rows = []) => {
  const itemsByOrder = new Map();
  rows.forEach((row) => {
    const items = itemsByOrder.get(row.order_id) || [];
    items.push({
      product_id: Number(row.product_id),
      product_name: String(row.product_name || ""),
      product_slug: String(row.product_slug || ""),
      product_image_url: String(row.product_image_url || ""),
      quantity: Number(row.quantity) || 0,
      unit_price_egp: normalizeMoney(row.unit_price_egp),
      line_total_egp: normalizeMoney(row.line_total_egp)
    });
    itemsByOrder.set(row.order_id, items);
  });
  return itemsByOrder;
};

const loadOrderDetail = async (whereClause, params = []) => {
  await ensureOrderSchemaReady();
  const [rows] = await pool.query(
    `SELECT
        id,
        order_number,
        customer_name,
        phone,
        governorate,
        district,
        address,
        payment_method,
        subtotal_egp,
        shipping_egp,
        total_egp,
        status,
        user_id,
        guest_token,
        created_at,
        updated_at
      FROM orders
      ${whereClause}
      LIMIT 1`,
    params
  );

  if (!rows.length) return null;
  const order = mapOrderRecord(rows[0]);
  const itemRows = await fetchOrderItemRows([order.id]);
  const itemsByOrder = groupOrderItems(itemRows);
  return { ...order, items: itemsByOrder.get(order.id) || [] };
};

const loadCheckoutProducts = async (productIds, executor = pool) => {
  if (!productIds.length) return new Map();
  const placeholders = productIds.map(() => "?").join(", ");
  const [rows] = await executor.query(
    `SELECT id, slug, name, image_url, price_egp, is_active
     FROM products
     WHERE id IN (${placeholders})`,
    productIds
  );
  return new Map(rows.map((row) => [Number(row.id), row]));
};

const buildOrderItemsFromCart = (cartItems, productMap) => {
  const lines = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw createHttpError(400, "One or more cart products no longer exist.");
    }
    if (!toDatabaseFlag(product.is_active)) {
      throw createHttpError(400, `The product "${product.name}" is no longer available.`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw createHttpError(400, "Cart contains an invalid quantity.");
    }

    const unitPrice = normalizeMoney(product.price_egp);
    const lineTotal = normalizeMoney(unitPrice * quantity);
    subtotal += lineTotal;
    lines.push({
      product_id: Number(product.id),
      product_name: String(product.name || ""),
      product_slug: String(product.slug || ""),
      product_image_url: String(product.image_url || ""),
      unit_price_egp: unitPrice,
      quantity,
      line_total_egp: lineTotal
    });
  }

  return {
    subtotal: normalizeMoney(subtotal),
    lines
  };
};

const createPasswordResetToken = () => crypto.randomBytes(32).toString("hex");
const hashPasswordResetToken = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");
const createMailer = () => {
  const user = EMAIL_USER;
  const pass = EMAIL_PASS;
  if (!user || !pass) {
    throw new Error("Email sending is not configured. Set EMAIL_USER and EMAIL_PASS.");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass }
  });
};

const sendPasswordResetEmail = async ({ email, fullName, token }) => {
  const transporter = createMailer();
  const resetLink = `${APP_BASE_URL}/reset-password.html?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: String(process.env.EMAIL_FROM || EMAIL_USER).trim(),
    to: email,
    subject: "Reset your password",
    text: `Hello ${fullName || "there"},\n\nUse this link to reset your password:\n${resetLink}\n\nThis link expires in ${PASSWORD_RESET_MINUTES} minutes.\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>Hello ${fullName || "there"},</p>
      <p>Use the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in ${PASSWORD_RESET_MINUTES} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  });
};

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".png";
    const basename =
      path
        .basename(file.originalname || "image", extension)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "image";
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${basename}${extension}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!String(file.mimetype || "").startsWith("image/")) {
      callback(new Error("Only image uploads are allowed."));
      return;
    }
    callback(null, true);
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ server: "ok", db: "ok" });
  } catch (err) {
    console.error("[health] Database health check failed", {
      message: err?.message,
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage
    });
    res.status(500).json({ server: "ok", db: "error" });
  }
});

app.post("/api/signup", async (req, res) => {
  const rawName = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!rawName || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  try {
    const userSchema = await loadUsersTableSchema();
    const [existing] = await pool.query(
      `SELECT ${quoteIdentifier(userSchema.id)} AS id FROM users WHERE ${quoteIdentifier(userSchema.email)} = ? LIMIT 1`,
      [email]
    );
    if (existing.length) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const insert = buildUserInsert({ schema: userSchema, fullName: rawName, email, passwordHash });
    const [result] = await pool.query(insert.sql, insert.values);
    res.status(201).json({ id: result.insertId, email, name: rawName, is_admin: 0 });
  } catch (err) {
    logDatabaseError("signup failed", err, { email });
    const response = errorResponseForAuth(err, "Could not create account right now");
    res.status(response.status).json({ error: response.error });
  }
});

app.post("/api/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (email === BOOTSTRAP_ADMIN.email && password === BOOTSTRAP_ADMIN.password) {
    return res.json({
      id: BOOTSTRAP_ADMIN.id,
      name: BOOTSTRAP_ADMIN.name,
      email: BOOTSTRAP_ADMIN.email,
      is_admin: BOOTSTRAP_ADMIN.is_admin
    });
  }
  try {
    const userSchema = await loadUsersTableSchema();
    const [rows] = await pool.query(
      `SELECT ${getUserAuthSelect(userSchema)} FROM users WHERE ${quoteIdentifier(userSchema.email)} = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ id: user.id, name: user.full_name, email, is_admin: user.is_admin === 1 || user.is_admin === true });
  } catch (err) {
    logDatabaseError("login failed", err, { email });
    const response = errorResponseForAuth(err, "Could not log in right now");
    res.status(response.status).json({ error: response.error });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  try {
    const userSchema = await loadUsersTableSchema();
    const [rows] = await pool.query(
      `SELECT ${getUserIdentitySelect(userSchema)} FROM users WHERE ${quoteIdentifier(userSchema.email)} = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    const user = rows[0];
    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);

    await pool.query("DELETE FROM password_resets WHERE user_id = ? OR expires_at <= NOW()", [user.id]);
    await pool.query(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [user.id, tokenHash, PASSWORD_RESET_MINUTES]
    );

    await sendPasswordResetEmail({
      email: user.email,
      fullName: user.full_name,
      token
    });

    res.json({ ok: true, message: "Check your email" });
  } catch (err) {
    logDatabaseError("forgot-password failed", err, { email });
    const response = errorResponseForAuth(err, "Could not start password reset right now");
    res.status(response.status).json({ error: response.error });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");
  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const userSchema = await loadUsersTableSchema();
    const tokenHash = hashPasswordResetToken(token);
    const [rows] = await pool.query(
      `SELECT pr.id, pr.user_id, pr.expires_at
       FROM password_resets pr
       WHERE pr.token_hash = ? AND pr.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Reset link is invalid or expired" });
    }

    const resetRecord = rows[0];
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      buildPasswordUpdate(userSchema),
      [passwordHash, resetRecord.user_id]
    );
    await pool.query("DELETE FROM password_resets WHERE user_id = ?", [resetRecord.user_id]);

    res.json({ ok: true, message: "Password reset successfully" });
  } catch (err) {
    logDatabaseError("reset-password failed", err);
    const response = errorResponseForAuth(err, "Could not reset password right now");
    res.status(response.status).json({ error: response.error });
  }
});

app.get("/api/account", requireAuthenticated, async (req, res) => {
  try {
    await ensureOrderSchemaReady();
    const user = await loadAuthenticatedUser(req.headers?.user_id, toDatabaseFlag(req.headers?.is_admin) === 1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const normalizedUser = normalizeAccountUser(user);
    const numericUserId = Number(user.id);
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
      return res.json({ user: normalizedUser, orders: [] });
    }

    const [orderRows] = await pool.query(
      "SELECT id, order_number, status, total_egp, payment_method, shipping_name, shipping_phone, shipping_addr, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [numericUserId]
    );

    if (!orderRows.length) {
      return res.json({ user: normalizedUser, orders: [] });
    }

    const orderIds = orderRows.map((row) => row.id);
    const placeholders = orderIds.map(() => "?").join(", ");
    const [itemRows] = await pool.query(
      `SELECT oi.order_id, oi.quantity, oi.unit_price, oi.line_total, p.name, p.image_url
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id IN (${placeholders})
       ORDER BY oi.id ASC`,
      orderIds
    );

    const itemsByOrder = new Map();
    itemRows.forEach((item) => {
      const items = itemsByOrder.get(item.order_id) || [];
      items.push({
        name: item.name,
        image_url: item.image_url || "",
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        line_total: Number(item.line_total) || 0
      });
      itemsByOrder.set(item.order_id, items);
    });

    const orders = orderRows.map((order) => ({
      id: Number(order.id),
      order_number: String(order.order_number || ""),
      status: order.status,
      total_egp: Number(order.total_egp) || 0,
      payment_method: order.payment_method,
      shipping_name: order.shipping_name || "",
      shipping_phone: order.shipping_phone || "",
      shipping_addr: order.shipping_addr || "",
      created_at: order.created_at,
      items: itemsByOrder.get(order.id) || []
    }));

    res.json({ user: normalizedUser, orders });
  } catch (err) {
    logOrderError("load account orders failed", err, { user_id: req.headers?.user_id || "" });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload", requireAdmin, (req, res) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "Image upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required." });
    }
    res.json({ imagePath: `/uploads/${req.file.filename}` });
  });
});

// Products
app.get("/api/products", async (_req, res) => {
  try {
    const demoSlugPlaceholders = SEEDED_DEMO_PRODUCT_SLUGS.map(() => "?").join(", ");
    const sql = `
      SELECT id, slug, name, description, price_egp, material, color, is_active, image_url, featured
      FROM products
      WHERE is_active = 1
      ${demoSlugPlaceholders ? `AND slug NOT IN (${demoSlugPlaceholders})` : ""}
      ORDER BY id ASC
    `;
    const [rows] = await pool.query(
      sql,
      SEEDED_DEMO_PRODUCT_SLUGS
    );
    res.json(rows);
  } catch (err) {
    logProductError("load products failed", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const { slug, name, description, price_egp, material, color, is_active = 1, image_url, featured = 0 } = req.body || {};
  if (!slug || !name || price_egp === undefined) {
    return res.status(400).json({ error: "slug, name, and price_egp are required" });
  }
  if (isSeededDemoProductSlug(slug)) {
    return res.status(400).json({ error: "Seeded demo products are not allowed." });
  }
  try {
    const activeFlag = toDatabaseFlag(is_active);
    const featuredFlag = toDatabaseFlag(featured);
    const [result] = await pool.query(
      "INSERT INTO products (slug, name, description, price_egp, material, color, is_active, image_url, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [slug, name, description || "", price_egp, material || "", color || "", activeFlag, image_url || "", featuredFlag]
    );
    res.status(201).json({
      id: result.insertId,
      slug,
      name,
      description: description || "",
      price_egp,
      material: material || "",
      color: color || "",
      is_active: activeFlag,
      image_url: image_url || "",
      featured: featuredFlag
    });
  } catch (err) {
    logProductError("create product failed", err, { slug });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { slug, name, description, price_egp, material, color, is_active, image_url, featured = 0 } = req.body || {};
  if (!slug || !name || price_egp === undefined) {
    return res.status(400).json({ error: "slug, name, and price_egp are required" });
  }
  if (isSeededDemoProductSlug(slug)) {
    return res.status(400).json({ error: "Seeded demo products are not allowed." });
  }
  try {
    const activeFlag = toDatabaseFlag(is_active);
    const featuredFlag = toDatabaseFlag(featured);
    const [result] = await pool.query(
      "UPDATE products SET slug=?, name=?, description=?, price_egp=?, material=?, color=?, is_active=?, image_url=?, featured=?, updated_at=NOW() WHERE id=?",
      [slug, name, description || "", price_egp, material || "", color || "", activeFlag, image_url || "", featuredFlag, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({
      id: Number(id),
      slug,
      name,
      description: description || "",
      price_egp,
      material: material || "",
      color: color || "",
      is_active: activeFlag,
      image_url: image_url || "",
      featured: featuredFlag
    });
  } catch (err) {
    logProductError("update product failed", err, { id, slug });
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    logProductError("delete product failed", err, { id });
    res.status(500).json({ error: err.message });
  }
});

// Cart
const cartIdentifier = (req) => {
  const userId = Number(req.headers?.user_id);
  if (Number.isFinite(userId) && userId > 0) return { type: "user", value: userId };
  const guestToken = String(req.headers?.["x-guest-token"] || "").trim();
  if (guestToken) return { type: "guest", value: guestToken };
  return { type: "none", value: null };
};

const findExistingCartId = async (identifier, executor = pool) => {
  if (identifier.type === "user") {
    const [rows] = await executor.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [identifier.value]);
    return rows[0]?.id || null;
  }
  if (identifier.type === "guest") {
    const [rows] = await executor.query("SELECT id FROM carts WHERE guest_token = ? LIMIT 1", [identifier.value]);
    return rows[0]?.id || null;
  }
  return null;
};

const getOrCreateCartId = async (identifier, executor = pool) => {
  if (identifier.type === "user") {
    const existingId = await findExistingCartId(identifier, executor);
    if (existingId) return existingId;
    const [result] = await executor.query("INSERT INTO carts (user_id) VALUES (?)", [identifier.value]);
    return result.insertId;
  }
  if (identifier.type === "guest") {
    const existingId = await findExistingCartId(identifier, executor);
    if (existingId) return existingId;
    const [result] = await executor.query("INSERT INTO carts (guest_token) VALUES (?)", [identifier.value]);
    return result.insertId;
  }
  return null;
};

const loadCartItemsByIdentifier = async (identifier, executor = pool) => {
  if (identifier.type === "none") return [];
  const cartId = await findExistingCartId(identifier, executor);
  if (!cartId) return [];
  const [rows] = await executor.query(
    "SELECT product_id, quantity FROM cart_items WHERE cart_id = ?",
    [cartId]
  );
  return sanitizeCartItems(rows);
};

const logCartError = (context, err, extra = {}) => {
  console.error(`[cart] ${context}`, {
    message: err?.message,
    code: err?.code,
    errno: err?.errno,
    sqlState: err?.sqlState,
    sqlMessage: err?.sqlMessage,
    ...extra
  });
};

app.get("/api/cart", async (req, res) => {
  try {
    await ensureCartSchemaReady();
    const identifier = cartIdentifier(req);
    if (identifier.type === "none") return res.json({ items: [] });
    const cartId = await findExistingCartId(identifier);
    if (!cartId) return res.json({ items: [] });
    const [rows] = await pool.query(
      "SELECT product_id, quantity FROM cart_items WHERE cart_id = ?",
      [cartId]
    );
    res.json({
      items: rows.map((row) => ({
        product_id: row.product_id,
        quantity: row.quantity
      }))
    });
  } catch (err) {
    logCartError("get cart failed", err, { identifier: cartIdentifier(req) });
    res.json({ items: [] });
  }
});

app.post("/api/cart", async (req, res) => {
  try {
    await ensureCartSchemaReady();
    const identifier = cartIdentifier(req);
    if (identifier.type === "none") {
      return res.status(400).json({ error: "Missing cart identity" });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const cleaned = items
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity)
      }))
      .filter((item) => Number.isFinite(item.product_id) && item.product_id > 0 && Number.isFinite(item.quantity) && item.quantity > 0);

    const cartId = await getOrCreateCartId(identifier);
    if (!cartId) return res.status(500).json({ error: "Cart not available" });

    await pool.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
    if (cleaned.length) {
      const values = cleaned.map((item) => [cartId, item.product_id, item.quantity]);
      await pool.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ?",
        [values]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    logCartError("save cart failed", err, { identifier: cartIdentifier(req) });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", async (req, res) => {
  let connection;
  try {
    await ensureCartSchemaReady();
    await ensureOrderSchemaReady();

    const identifier = cartIdentifier(req);
    const requestedItems = sanitizeCartItems(req.body?.items);
    console.info("[orders] incoming payload", {
      identifier,
      body: {
        full_name: String(req.body?.full_name || req.body?.customer_name || "").trim(),
        phone: String(req.body?.phone || "").trim(),
        city: String(req.body?.city || req.body?.governorate || "").trim(),
        district: String(req.body?.district || "").trim(),
        address: String(req.body?.address || "").trim(),
        payment_method: String(req.body?.payment_method || "").trim(),
        items: requestedItems
      }
    });

    const orderPayload = validateOrderPayload(req.body);
    if (identifier.type === "none") {
      return res.status(400).json({ error: "Missing cart identity." });
    }
    const backendCartItems = await loadCartItemsByIdentifier(identifier);
    const cartItems = backendCartItems.length ? backendCartItems : requestedItems;
    console.info("[orders] cart items used", {
      identifier,
      backend_cart_items: backendCartItems,
      requested_items: requestedItems,
      final_items: cartItems
    });

    if (!cartItems.length) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const productIds = [...new Set(cartItems.map((item) => item.product_id))];
    const productMap = await loadCheckoutProducts(productIds);
    const { subtotal, lines } = buildOrderItemsFromCart(cartItems, productMap);
    const shipping = calculateShippingEgp(subtotal);
    const total = normalizeMoney(subtotal + shipping);
    const numericUserId = Number(req.headers?.user_id);
    const userId = Number.isFinite(numericUserId) && numericUserId > 0 ? numericUserId : null;
    const guestToken = identifier.type === "guest" ? identifier.value : null;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const cartId = await findExistingCartId(identifier, connection);

    let orderId = null;
    let orderNumber = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        orderNumber = createOrderNumber();
        const [orderResult] = await connection.query(
          `INSERT INTO orders (
            order_number,
            customer_name,
            phone,
            governorate,
            district,
            address,
            payment_method,
            subtotal_egp,
            shipping_egp,
            total_egp,
            status,
            user_id,
            guest_token,
            shipping_name,
            shipping_phone,
            shipping_addr,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            orderNumber,
            orderPayload.customerName,
            orderPayload.phone,
            orderPayload.governorate,
            orderPayload.district,
            orderPayload.address,
            orderPayload.paymentMethod,
            subtotal,
            shipping,
            total,
            "pending",
            userId,
            guestToken,
            orderPayload.customerName,
            orderPayload.phone,
            orderPayload.address,
          ]
        );
        orderId = Number(orderResult.insertId);
        console.info("[orders] order insert result", {
          order_id: orderId,
          order_number: orderNumber,
          inserted_rows: orderResult?.affectedRows || 1
        });
        break;
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY" && attempt < 4) continue;
        throw error;
      }
    }

    if (!orderId) {
      throw createHttpError(500, "Could not reserve an order number.");
    }

    const values = lines.map((line) => [
      orderId,
      line.product_id,
      line.product_name,
      line.product_slug,
      line.product_image_url,
      line.unit_price_egp,
      line.unit_price_egp,
      line.quantity,
      line.line_total_egp,
      line.line_total_egp
    ]);

    const [orderItemsResult] = await connection.query(
      `INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_slug,
        product_image_url,
        unit_price,
        unit_price_egp,
        quantity,
        line_total,
        line_total_egp
      ) VALUES ?`,
      [values]
    );
    console.info("[orders] order items insert result", {
      order_id: orderId,
      inserted_rows: orderItemsResult?.affectedRows || values.length,
      items: values.length
    });

    if (cartId) {
      await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
    }

    await connection.commit();
    console.info("[orders] order committed", {
      order_id: orderId,
      order_number: orderNumber,
      cart_id: cartId,
      subtotal,
      shipping,
      total
    });
    res.status(201).json({
      ok: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        customer_name: orderPayload.customerName,
        phone: orderPayload.phone,
        governorate: orderPayload.governorate,
        district: orderPayload.district,
        address: orderPayload.address,
        payment_method: orderPayload.paymentMethod,
        subtotal_egp: subtotal,
        shipping_egp: shipping,
        total_egp: total,
        status: "pending",
        items: lines
      }
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    logOrderError("create order failed", err, { identifier: cartIdentifier(req) });
    res.status(err.status || 500).json({
      error: err.status ? err.message : err?.sqlMessage || err?.message || "Could not create order right now."
    });
  } finally {
    connection?.release();
  }
});

app.get("/api/orders/number/:orderNumber", async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || "").trim();
    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required." });
    }

    let order = null;
    const numericUserId = Number(req.headers?.user_id);
    if (Number.isFinite(numericUserId) && numericUserId > 0) {
      order = await loadOrderDetail("WHERE order_number = ? AND user_id = ?", [orderNumber, numericUserId]);
    }

    if (!order) {
      const identifier = cartIdentifier(req);
      if (identifier.type === "guest") {
        order = await loadOrderDetail("WHERE order_number = ? AND guest_token = ?", [orderNumber, identifier.value]);
      }
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ order });
  } catch (err) {
    logOrderError("load order by number failed", err, { order_number: req.params?.orderNumber || "" });
    res.status(err.status || 500).json({ error: err.status ? err.message : "Could not load the order." });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    let order = null;
    const numericUserId = Number(req.headers?.user_id);
    if (Number.isFinite(numericUserId) && numericUserId > 0) {
      order = await loadOrderDetail("WHERE id = ? AND user_id = ?", [orderId, numericUserId]);
    }

    if (!order) {
      const identifier = cartIdentifier(req);
      if (identifier.type === "guest") {
        order = await loadOrderDetail("WHERE id = ? AND guest_token = ?", [orderId, identifier.value]);
      }
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ order });
  } catch (err) {
    logOrderError("load order by id failed", err, { order_id: req.params?.id || "" });
    res.status(err.status || 500).json({ error: err.status ? err.message : "Could not load the order." });
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    await ensureOrderSchemaReady();
    const status = String(req.query?.status || "").trim().toLowerCase();
    const search = String(req.query?.q || "").trim();
    const whereClauses = [];
    const values = [];

    if (status) {
      if (!ORDER_STATUS_VALUES.has(status)) {
        return res.status(400).json({ error: "Invalid order status filter." });
      }
      whereClauses.push("status = ?");
      values.push(status);
    }

    if (search) {
      whereClauses.push("(order_number LIKE ? OR customer_name LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT
          id,
          order_number,
          customer_name,
          phone,
          governorate,
          district,
          address,
          payment_method,
          subtotal_egp,
          shipping_egp,
          total_egp,
          status,
          user_id,
          guest_token,
          created_at,
          updated_at
        FROM orders
        ${whereSql}
        ORDER BY created_at DESC`,
      values
    );
    res.json({ orders: rows.map(mapOrderRecord) });
  } catch (err) {
    logOrderError("load admin order list failed", err);
    res.status(500).json({ error: "Could not load orders right now." });
  }
});

app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const order = await loadOrderDetail("WHERE id = ?", [orderId]);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ order });
  } catch (err) {
    logOrderError("load admin order detail failed", err, { order_id: req.params?.id || "" });
    res.status(err.status || 500).json({ error: err.status ? err.message : "Could not load the order." });
  }
});

app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    await ensureOrderSchemaReady();
    const orderId = Number(req.params.id);
    const status = String(req.body?.status || "").trim().toLowerCase();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }
    if (!ORDER_STATUS_VALUES.has(status)) {
      return res.status(400).json({ error: "Invalid order status." });
    }

    const [result] = await pool.query(
      "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = await loadOrderDetail("WHERE id = ?", [orderId]);
    res.json({ ok: true, order });
  } catch (err) {
    logOrderError("update order status failed", err, { order_id: req.params?.id || "" });
    res.status(err.status || 500).json({ error: err.status ? err.message : "Could not update the order status." });
  }
});

for (const [routePath, fileName] of pageRoutes.entries()) {
  app.get(routePath, (_req, res) => {
    res.sendFile(path.join(projectRoot, fileName));
  });
}

app.listen(PORT, () => {
  console.log(`API ready on port ${PORT}`);
  Promise.all([ensureCartSchemaReady(), ensureOrderSchemaReady()])
    .then(() => {
      console.log("[orders] schema ready");
      console.log("[cart] schema ready");
    })
    .catch((error) => {
      logOrderError("schema bootstrap failed", error);
    });
});
