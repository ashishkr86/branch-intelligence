-- ═══════════════════════════════════════════════════════════════
-- Error log table — for the Error Tracking dashboard
-- Run: mysql -u root -p gentech_db < sql\error_log.sql
-- ═══════════════════════════════════════════════════════════════

USE gentech_db;

CREATE TABLE IF NOT EXISTS error_log (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  LEVEL VARCHAR(20) NOT NULL,
  SOURCE VARCHAR(50) NOT NULL,
  MESSAGE TEXT NOT NULL,
  STACK_TRACE TEXT,
  USER_ID INT,
  ENDPOINT VARCHAR(255),
  METHOD VARCHAR(10),
  STATUS_CODE INT,
  REQUEST_BODY TEXT,
  IP_ADDRESS VARCHAR(45),
  FINGERPRINT VARCHAR(64),
  RESOLVED TINYINT(1) NOT NULL DEFAULT 0,
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_error_level (LEVEL),
  INDEX idx_error_source (SOURCE),
  INDEX idx_error_created (CREATED_AT),
  INDEX idx_error_fingerprint (FINGERPRINT),
  INDEX idx_error_resolved (RESOLVED)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;