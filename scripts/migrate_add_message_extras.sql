-- Adds form_prompt + service_card JSON columns so chat extras survive history refetch
-- Idempotent: safe to re-run
USE gov;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_message' AND COLUMN_NAME = 'service_card'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE chat_message ADD COLUMN service_card JSON NULL COMMENT ''办事卡片快照'' AFTER knowledge_id',
  'SELECT ''service_card column already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_message' AND COLUMN_NAME = 'form_prompt'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE chat_message ADD COLUMN form_prompt JSON NULL COMMENT ''表单提示快照'' AFTER service_card',
  'SELECT ''form_prompt column already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
