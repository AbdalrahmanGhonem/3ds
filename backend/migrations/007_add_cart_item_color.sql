SET @has_cart_selected_color := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'cart_items'
    AND column_name = 'selected_color'
);
SET @sql := IF(
  @has_cart_selected_color = 0,
  'ALTER TABLE cart_items ADD COLUMN selected_color VARCHAR(120) NOT NULL DEFAULT '''' AFTER product_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_order_selected_color := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'order_items'
    AND column_name = 'selected_color'
);
SET @sql := IF(
  @has_order_selected_color = 0,
  'ALTER TABLE order_items ADD COLUMN selected_color VARCHAR(120) NOT NULL DEFAULT '''' AFTER product_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
