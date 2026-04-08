CREATE TABLE IF NOT EXISTS site_settings (
  id TINYINT UNSIGNED NOT NULL,
  contact_phone VARCHAR(120) DEFAULT NULL,
  contact_email VARCHAR(190) DEFAULT NULL,
  contact_address VARCHAR(255) DEFAULT NULL,
  instagram_url VARCHAR(255) DEFAULT NULL,
  tiktok_url VARCHAR(255) DEFAULT NULL,
  whatsapp VARCHAR(64) DEFAULT NULL,
  footer_text VARCHAR(255) DEFAULT NULL,
  support_text VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_settings (
  id,
  contact_phone,
  contact_email,
  contact_address,
  instagram_url,
  tiktok_url,
  whatsapp,
  footer_text,
  support_text,
  created_at,
  updated_at
)
SELECT
  1,
  '+20 100 000 0000',
  'hello@3ds-store.com',
  'Cairo, Egypt',
  '201003520303',
  '',
  '',
  '',
  '',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 1);
