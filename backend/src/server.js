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

  const [rows] = await pool.query(
    "SELECT id, full_name, email, is_admin FROM users WHERE id = ? LIMIT 1",
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

const ensureSupportTables = async () => {
  const [cartColumns] = await pool.query(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'carts'`
  );
  const cartColumnMap = new Map(cartColumns.map((column) => [column.COLUMN_NAME, column]));

  if (cartColumnMap.has("user_id") && cartColumnMap.get("user_id")?.IS_NULLABLE !== "YES") {
    await pool.query("ALTER TABLE carts MODIFY COLUMN user_id BIGINT UNSIGNED NULL");
  }

  if (!cartColumnMap.has("guest_token")) {
    await pool.query("ALTER TABLE carts ADD COLUMN guest_token VARCHAR(64) NULL");
  }

  const [cartIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'carts' AND INDEX_NAME = 'guest_token'
     LIMIT 1`
  );
  if (!cartIndexes.length) {
    await pool.query("ALTER TABLE carts ADD UNIQUE KEY guest_token (guest_token)");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY token_hash (token_hash),
      KEY user_id (user_id),
      CONSTRAINT password_resets_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
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
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())",
      [rawName, email, passwordHash]
    );
    res.status(201).json({ id: result.insertId, email, name: rawName, is_admin: 0 });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: err.message });
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
    const [rows] = await pool.query(
      "SELECT id, full_name, password_hash, is_admin FROM users WHERE email = ? LIMIT 1",
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
    res.status(500).json({ error: err.message });
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
    const [rows] = await pool.query(
      "SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1",
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
    res.status(500).json({ error: err.message });
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
      "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
      [passwordHash, resetRecord.user_id]
    );
    await pool.query("DELETE FROM password_resets WHERE user_id = ?", [resetRecord.user_id]);

    res.json({ ok: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const [rows] = await pool.query(
      "SELECT id, slug, name, description, price_egp, material, color, is_active, image_url, featured FROM products WHERE is_active = 1"
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

const startServer = async () => {
  await ensureSupportTables();
  app.listen(PORT, () => {
    console.log(`API ready on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
