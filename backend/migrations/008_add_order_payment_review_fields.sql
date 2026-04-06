ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER payment_method;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120) NULL AFTER shipping_addr;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payer_mobile VARCHAR(32) NULL AFTER payment_reference;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_submitted_at DATETIME NULL AFTER payer_mobile;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_confirmed_at DATETIME NULL AFTER payment_submitted_at;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_rejected_at DATETIME NULL AFTER payment_confirmed_at;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_review_note VARCHAR(255) NULL AFTER payment_rejected_at;
