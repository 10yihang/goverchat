-- ================================================================
-- Migration: Add in-chat form submission feature (Phase 5)
-- Adds:
--   - c_user                      C 端用户表（邮箱+验证码无密码登录）
--   - email_verification_code     邮箱验证码（登录/注册用）
--   - service_application         服务办理申请表（聊天里直接提交）
--   - chat_session.user_id        关联到 c_user，原匿名 session 兼容（NULL 允许）
--
-- 安全可重复执行（IF NOT EXISTS / ALTER guarded by SCHEMA query）
-- ================================================================
USE gov;

-- ────────────────────────────────────────────────────────────────
-- 1. C 端用户表（与管理员 sys_user 完全分离）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS c_user (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255)  NOT NULL,
  display_name    VARCHAR(50)   NOT NULL DEFAULT '',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at   DATETIME      DEFAULT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX uq_c_user_email (email),
  INDEX idx_c_user_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='C 端注册用户（邮箱+验证码登录，无密码）';

-- ────────────────────────────────────────────────────────────────
-- 2. 邮箱验证码表
--   用途: login (登录) | register (注册预留)
--   过期清理: 应用层惰性清理（select 时跳过 expires_at < NOW()）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_code (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255)  NOT NULL,
  code            VARCHAR(6)    NOT NULL,
  purpose         ENUM('login','register') NOT NULL DEFAULT 'login',
  expires_at      DATETIME      NOT NULL,
  used            TINYINT(1)    NOT NULL DEFAULT 0,
  attempts        INT UNSIGNED  NOT NULL DEFAULT 0,
  ip_address      VARCHAR(45)   NOT NULL DEFAULT '',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email_purpose (email, purpose),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='邮箱验证码（登录/注册）';

-- ────────────────────────────────────────────────────────────────
-- 3. 服务办理申请表
--   状态: 已提交 / 审核中 / 材料待补充 / 办理完成 / 已退回
--   query_no: 8-12 位受理编号 e.g. DL250424A8C3
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_application (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  query_no          VARCHAR(20)   NOT NULL,
  user_id           INT UNSIGNED  NOT NULL,
  user_email        VARCHAR(255)  NOT NULL,
  session_id        VARCHAR(36)   NOT NULL DEFAULT '',
  service_slug      VARCHAR(100)  NOT NULL,
  service_title     VARCHAR(200)  NOT NULL,
  applicant_name    VARCHAR(50)   NOT NULL DEFAULT '',
  applicant_phone   VARCHAR(20)   NOT NULL DEFAULT '',
  form_data         JSON          NOT NULL,
  status            ENUM('已提交','审核中','材料待补充','办理完成','已退回')
                                  NOT NULL DEFAULT '已提交',
  admin_remark      TEXT          DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX uq_query_no (query_no),
  INDEX idx_app_user (user_id),
  INDEX idx_app_session (session_id),
  INDEX idx_app_slug (service_slug),
  INDEX idx_app_status (status),
  INDEX idx_app_phone (applicant_phone)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='服务办理申请（聊天内联表单提交）';

-- ────────────────────────────────────────────────────────────────
-- 4. chat_session 关联到 c_user
--   NULL 允许：兼容历史匿名 session
--   用 INFORMATION_SCHEMA 守卫，避免 ALTER 重复执行报错
-- ────────────────────────────────────────────────────────────────
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'chat_session'
    AND COLUMN_NAME = 'user_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE chat_session ADD COLUMN user_id INT UNSIGNED DEFAULT NULL AFTER session_id, ADD INDEX idx_chat_session_user (user_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
