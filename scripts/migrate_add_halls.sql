-- ================================================================
-- 迁移：新增 gov_hall 政务大厅表
-- 数据库：gov
-- 执行方式：mysql -u root -p gov < scripts/migrate_add_halls.sql
-- ================================================================

USE gov;

CREATE TABLE IF NOT EXISTS gov_hall (
    id          VARCHAR(50)   NOT NULL,
    name        VARCHAR(200)  NOT NULL,
    short_name  VARCHAR(100)  NOT NULL DEFAULT '',
    address     VARCHAR(500)  NOT NULL,
    lat         DECIMAL(10,7) NOT NULL,
    lng         DECIMAL(10,7) NOT NULL,
    phone       VARCHAR(30)   NOT NULL DEFAULT '',
    city        VARCHAR(50)   NOT NULL DEFAULT '',
    district    VARCHAR(50)   NOT NULL DEFAULT '',
    hours_weekday   VARCHAR(20)   DEFAULT NULL,
    hours_saturday  VARCHAR(20)   DEFAULT NULL,
    hours_sunday    VARCHAR(20)   DEFAULT NULL,
    services    JSON          NOT NULL,
    windows     INT           NOT NULL DEFAULT 0,
    tags        JSON          NOT NULL,
    parking     TINYINT(1)    NOT NULL DEFAULT 0,
    transit     VARCHAR(500)  NOT NULL DEFAULT '',
    is_active   TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_hall_city (city),
    INDEX idx_hall_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
