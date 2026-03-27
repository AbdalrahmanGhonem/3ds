import { pool } from "../src/db.js";

const SEEDED_DEMO_PRODUCT_SLUGS = [
  "neon-cube-keychain",
  "orbit-ring",
  "monogram-block",
  "retro-badge",
  "metallic-edge",
  "glyph-tag"
];

const REAL_PRODUCTS = [
  {
    slug: "shark",
    name: "shark",
    description: "shark",
    price_egp: 300,
    material: "",
    color: "gray",
    is_active: 1,
    image_url: "/uploads/1773910992196-681290796-img-20250914-wa0265.jpg",
    featured: 1
  },
  {
    slug: "bat",
    name: "bat",
    description: "bat",
    price_egp: 250,
    material: "",
    color: "violte",
    is_active: 1,
    image_url: "/uploads/1773928861399-430256988-bat.jpg",
    featured: 1
  },
  {
    slug: "cat",
    name: "cat",
    description: "cat",
    price_egp: 280,
    material: "",
    color: "brown",
    is_active: 1,
    image_url: "/uploads/1773928919887-296603506-cat.jpeg",
    featured: 1
  },
  {
    slug: "racoon",
    name: "racoon",
    description: "racoon",
    price_egp: 200,
    material: "",
    color: "red",
    is_active: 1,
    image_url: "/uploads/1773928959923-434982215-raco.jpeg",
    featured: 1
  },
  {
    slug: "dog",
    name: "dog",
    description: "dog",
    price_egp: 250,
    material: "",
    color: "white",
    is_active: 1,
    image_url: "/uploads/1773928998913-81015132-whatsapp-image-2025-12-22-at-12-23-43-pm.jpeg",
    featured: 0
  }
];

const removeSeededDemoProducts = async () => {
  const placeholders = SEEDED_DEMO_PRODUCT_SLUGS.map(() => "?").join(", ");
  if (!placeholders) return;
  const [result] = await pool.query(
    `DELETE FROM products WHERE slug IN (${placeholders})`,
    SEEDED_DEMO_PRODUCT_SLUGS
  );
  console.log(`[seed:products] Removed ${result.affectedRows || 0} seeded demo products.`);
};

const upsertProduct = async (product) => {
  const [existingRows] = await pool.query(
    "SELECT id FROM products WHERE slug = ? LIMIT 1",
    [product.slug]
  );

  if (existingRows.length) {
    const existingId = existingRows[0].id;
    await pool.query(
      `UPDATE products
       SET slug = ?, name = ?, description = ?, price_egp = ?, material = ?, color = ?, is_active = ?, image_url = ?, featured = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        product.slug,
        product.name,
        product.description,
        product.price_egp,
        product.material,
        product.color,
        product.is_active,
        product.image_url,
        product.featured,
        existingId
      ]
    );
    console.log(`[seed:products] Updated ${product.slug} (#${existingId}).`);
    return;
  }

  const [result] = await pool.query(
    `INSERT INTO products (slug, name, description, price_egp, material, color, is_active, image_url, featured, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      product.slug,
      product.name,
      product.description,
      product.price_egp,
      product.material,
      product.color,
      product.is_active,
      product.image_url,
      product.featured
    ]
  );
  console.log(`[seed:products] Inserted ${product.slug} (#${result.insertId}).`);
};

try {
  await removeSeededDemoProducts();
  for (const product of REAL_PRODUCTS) {
    await upsertProduct(product);
  }
  console.log(`[seed:products] Catalog ready with ${REAL_PRODUCTS.length} real products.`);
} catch (error) {
  console.error("[seed:products] Failed to seed products", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
