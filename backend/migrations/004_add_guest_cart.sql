ALTER TABLE carts
  MODIFY COLUMN user_id bigint unsigned NULL,
  ADD COLUMN guest_token varchar(64) NULL,
  ADD UNIQUE KEY guest_token (guest_token);
