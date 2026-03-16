import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use("/assets", express.static(path.join(projectRoot, "assets")));

const pageRoutes = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/shop", "shop.html"],
  ["/shop.html", "shop.html"],
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
  ["/manage", "manage.html"],
  ["/manage.html", "manage.html"],
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

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())",
      [name, email, passwordHash]
    );
    res.status(201).json({ id: result.insertId, email, name, is_admin: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
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
    const [result] = await pool.query(
      "INSERT INTO products (slug, name, description, price_egp, material, color, is_active, image_url, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [slug, name, description || "", price_egp, material || "", color || "", is_active ? 1 : 0, image_url || "", featured ? 1 : 0]
    );
    res.status(201).json({
      id: result.insertId,
      slug,
      name,
      description: description || "",
      price_egp,
      material: material || "",
      color: color || "",
      is_active: is_active ? 1 : 0,
      image_url: image_url || "",
      featured: featured ? 1 : 0
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
    const [result] = await pool.query(
      "UPDATE products SET slug=?, name=?, description=?, price_egp=?, material=?, color=?, is_active=?, image_url=?, featured=?, updated_at=NOW() WHERE id=?",
      [slug, name, description || "", price_egp, material || "", color || "", is_active ? 1 : 0, image_url || "", featured ? 1 : 0, id]
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
      is_active: is_active ? 1 : 0,
      image_url: image_url || "",
      featured: featured ? 1 : 0
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

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API ready on port ${PORT}`);
});
