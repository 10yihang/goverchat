-- ================================================================
-- Gov Chat schema
-- Database: gov
-- Charset: utf8mb4_unicode_ci
-- ================================================================

CREATE DATABASE IF NOT EXISTS gov
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE gov;

-- ────────────────────────────────────────────────────────────────
-- 1. 知识库表
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_knowledge (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  question    VARCHAR(500)     NOT NULL,
  answer      TEXT             NOT NULL,
  category    VARCHAR(50)      NOT NULL DEFAULT '',
  keywords    VARCHAR(500)     NOT NULL DEFAULT '',
  weight      DECIMAL(4,2)     NOT NULL DEFAULT 1.00,
  is_active   TINYINT(1)       NOT NULL DEFAULT 1,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────
-- 2. 会话表
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_session (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  session_id  VARCHAR(36)      NOT NULL,
  user_id     INT UNSIGNED     DEFAULT NULL,
  user_agent  VARCHAR(512)     NOT NULL DEFAULT '',
  ip_address  VARCHAR(45)      NOT NULL DEFAULT '',
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX uq_session_id (session_id),
  INDEX idx_chat_session_user (user_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────
-- 3. 消息表
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_message (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  session_id   VARCHAR(36)     NOT NULL,
  role         ENUM('user','bot') NOT NULL,
  content      TEXT            NOT NULL,
  msg_type     ENUM('text','voice') NOT NULL DEFAULT 'text',
  confidence   DECIMAL(6,4)    NOT NULL DEFAULT 0.0000,
  knowledge_id INT UNSIGNED    DEFAULT NULL,
  service_card JSON            NULL COMMENT '办事卡片快照',
  form_prompt  JSON            NULL COMMENT '表单提示快照',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_session (session_id),
  INDEX idx_knowledge (knowledge_id),
  CONSTRAINT fk_msg_session
    FOREIGN KEY (session_id) REFERENCES chat_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────
-- 4. 系统用户表（管理员）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sys_user (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  username    VARCHAR(50)      NOT NULL,
  password    VARCHAR(128)     NOT NULL,
  salt        VARCHAR(32)      NOT NULL,
  role        ENUM('admin','viewer') NOT NULL DEFAULT 'viewer',
  is_active   TINYINT(1)       NOT NULL DEFAULT 1,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX uq_username (username)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Default admin user, change password before deployment.
INSERT IGNORE INTO sys_user (username, password, salt, role)
VALUES (
  'admin',
  SHA2(CONCAT('admin123', 'govchat2026salt01'), 256),
  'govchat2026salt01',
  'admin'
);

-- ────────────────────────────────────────────────────────────────
-- 5. C 端用户表（邮箱 + 验证码无密码登录，与 sys_user 完全分离）
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
  COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────
-- 6. 邮箱验证码表
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
  COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────
-- 7. 服务办理申请表（聊天内联表单提交）
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
  COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────
-- 8. 运行时开关表（LLM 聊天开关等）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sys_setting (
    `key`       VARCHAR(64)  NOT NULL,
    `value`     VARCHAR(255) NOT NULL,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO sys_setting (`key`, `value`) VALUES ('llm_chat_enabled', 'true');

-- ────────────────────────────────────────────────────────────────
-- 9. 消息反馈表（点赞/踩）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_feedback (
    id          BIGINT AUTO_INCREMENT,
    message_id  INT UNSIGNED  NOT NULL,
    session_id  VARCHAR(64)   NOT NULL,
    user_id     INT DEFAULT NULL,
    rating      ENUM('up','down') NOT NULL,
    reason_text VARCHAR(500)  DEFAULT NULL,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_message_user (message_id, user_id),
    INDEX idx_session (session_id),
    INDEX idx_rating_time (rating, created_at),
    CONSTRAINT fk_feedback_message
        FOREIGN KEY (message_id) REFERENCES chat_message(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
