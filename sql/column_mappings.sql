-- ═══════════════════════════════════════════════════════════════
-- Column mapping templates — persist custom CSV → DB mappings
-- Run: mysql -u root -p gentech_db < sql\column_mappings.sql
-- ═══════════════════════════════════════════════════════════════

USE gentech_db;

CREATE TABLE IF NOT EXISTS column_mappings (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  NAME VARCHAR(100) NOT NULL,
  TARGET_TABLE VARCHAR(50) NOT NULL,
  HEADERS_SIGNATURE VARCHAR(255) NOT NULL,
  MAPPING_JSON JSON NOT NULL,
  CREATED_BY INT,
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mapping_table (TARGET_TABLE),
  INDEX idx_mapping_sig (HEADERS_SIGNATURE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;