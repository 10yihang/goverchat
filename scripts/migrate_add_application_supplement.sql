-- ================================================================
-- 迁移：service_application 表新增补正材料字段
-- 数据库：gov
-- 执行方式：mysql -u root -p gov < scripts/migrate_add_application_supplement.sql
-- ================================================================

USE gov;

-- 1. 新增补正材料字段
ALTER TABLE service_application
  ADD COLUMN supplement_data JSON NULL COMMENT '用户补正材料或补正说明' AFTER admin_remark,
  ADD COLUMN supplement_remark TEXT NULL COMMENT '用户补正备注' AFTER supplement_data,
  ADD COLUMN supplement_updated_at DATETIME NULL COMMENT '最近补正时间' AFTER supplement_remark;
