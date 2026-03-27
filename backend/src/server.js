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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
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
      "SELECT id, status, total_egp, payment_method, shipping_name, shipping_phone, shipping_addr, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const { slug, name, description, price_egp, material, color, is_active = 1, image_url, featured = 0 } = req.body || {};
  if (!slug || !name || price_egp === undefined) {
    return res.status(400).json({ error: "slug, name, and price_egp are required" });
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
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { slug, name, description, price_egp, material, color, is_active, image_url, featured = 0 } = req.body || {};
  if (!slug || !name || price_egp === undefined) {
    return res.status(400).json({ error: "slug, name, and price_egp are required" });
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

const getOrCreateCartId = async (identifier) => {
  if (identifier.type === "user") {
    const [rows] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [identifier.value]);
    if (rows.length) return rows[0].id;
    const [result] = await pool.query("INSERT INTO carts (user_id) VALUES (?)", [identifier.value]);
    return result.insertId;
  }
  if (identifier.type === "guest") {
    const [rows] = await pool.query("SELECT id FROM carts WHERE guest_token = ? LIMIT 1", [identifier.value]);
    if (rows.length) return rows[0].id;
    const [result] = await pool.query("INSERT INTO carts (guest_token) VALUES (?)", [identifier.value]);
    return result.insertId;
  }
  return null;
};

app.get("/api/cart", async (req, res) => {
  try {
    const identifier = cartIdentifier(req);
    if (identifier.type === "none") return res.json({ items: [] });
    const cartId = await getOrCreateCartId(identifier);
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart", async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message });
  }
});

for (const [routePath, fileName] of pageRoutes.entries()) {
  app.get(routePath, (_req, res) => {
    res.sendFile(path.join(projectRoot, fileName));
  });
}

app.listen(PORT, () => {
  console.log(`API ready on port ${PORT}`);
});
