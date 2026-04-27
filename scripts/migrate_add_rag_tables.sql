-- ============================================================
-- RAG 升级：新增 sys_setting + message_feedback 表
-- 用法：mysql -u root -p gov < scripts/migrate_add_rag_tables.sql
-- ============================================================

USE gov;

-- ────────── 运行时开关 ──────────
CREATE TABLE IF NOT EXISTS sys_setting (
    `key` VARCHAR(64) PRIMARY KEY,
    `value` VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化默认值
INSERT IGNORE INTO sys_setting (`key`, `value`) VALUES ('llm_chat_enabled', 'true');

-- ────────── 消息反馈 ──────────
CREATE TABLE IF NOT EXISTS message_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    user_id INT,
    rating ENUM('up', 'down') NOT NULL,
    reason_text VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_message_user (message_id, user_id),
    INDEX idx_session (session_id),
    INDEX idx_rating_time (rating, created_at),
    FOREIGN KEY (message_id) REFERENCES chat_message(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
