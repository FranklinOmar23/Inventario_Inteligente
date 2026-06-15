-- =============================================================
--  InvenAI -- MySQL Schema for Hostinger (or any MySQL 5.7+)
--  Run this file once in phpMyAdmin or your MySQL client.
--  Tables use utf8mb4 + soft delete (deleted_at column).
-- =============================================================

CREATE DATABASE IF NOT EXISTS `invenai`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `invenai`;

-- --------------------------------------------------------
-- users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(36)  NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name`     VARCHAR(255) NOT NULL,
  `role`          ENUM('admin','user') NOT NULL DEFAULT 'user',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`    DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- departments
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id`          VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  `manager`     VARCHAR(255) DEFAULT '',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_depts_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- categories
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`                 VARCHAR(36)  NOT NULL,
  `name`               VARCHAR(255) NOT NULL,
  `requires_asset_tag` TINYINT(1)   NOT NULL DEFAULT 0,
  `requires_unique_id` TINYINT(1)   NOT NULL DEFAULT 0,
  `minimum_stock`      INT          NOT NULL DEFAULT 5,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`         DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cats_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- inventory_items
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id`              VARCHAR(36)  NOT NULL,
  `name`            VARCHAR(255) NOT NULL,
  `description`     TEXT         DEFAULT NULL,
  `category_id`     VARCHAR(36)  DEFAULT NULL,
  `category_name`   VARCHAR(255) DEFAULT '',
  `department_id`   VARCHAR(36)  DEFAULT NULL,
  `department_name` VARCHAR(255) DEFAULT '',
  `status`          ENUM('in_stock','checked_out','maintenance','retired') NOT NULL DEFAULT 'in_stock',
  `quantity`        INT          NOT NULL DEFAULT 1,
  `asset_tag`       VARCHAR(100) DEFAULT '',
  `service_tag`     VARCHAR(100) DEFAULT '',
  `serial_number`   VARCHAR(100) DEFAULT '',
  `model`           VARCHAR(255) DEFAULT '',
  `brand`           VARCHAR(255) DEFAULT '',
  `photo_url`       TEXT         DEFAULT NULL,
  `notes`           TEXT         DEFAULT NULL,
  `entry_date`      DATE         DEFAULT NULL,
  `checkout_date`   DATETIME     DEFAULT NULL,
  `checked_out_to`  VARCHAR(255) DEFAULT NULL,
  `has_unique_id`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inv_status`     (`status`),
  KEY `idx_inv_category`   (`category_id`),
  KEY `idx_inv_department` (`department_id`),
  KEY `idx_inv_deleted`    (`deleted_at`),
  CONSTRAINT `fk_inv_category`   FOREIGN KEY (`category_id`)   REFERENCES `categories`  (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- activity_logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id`              VARCHAR(36)  NOT NULL,
  `action`          VARCHAR(100) NOT NULL,
  `item_id`         VARCHAR(36)  DEFAULT NULL,
  `item_name`       VARCHAR(255) DEFAULT '',
  `category_name`   VARCHAR(255) DEFAULT '',
  `department_name` VARCHAR(255) DEFAULT '',
  `quantity`        INT          DEFAULT 1,
  `performed_by`    VARCHAR(255) DEFAULT '',
  `performed_by_id` VARCHAR(36)  DEFAULT NULL,
  `checked_out_to`  VARCHAR(255) DEFAULT NULL,
  `details`         TEXT         DEFAULT NULL,
  `timestamp`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_logs_action`  (`action`),
  KEY `idx_logs_item`    (`item_id`),
  KEY `idx_logs_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- purchase_orders
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id`                 VARCHAR(36)  NOT NULL,
  `category_id`        VARCHAR(36)  DEFAULT NULL,
  `category_name`      VARCHAR(255) DEFAULT '',
  `quantity_suggested` INT          NOT NULL DEFAULT 1,
  `status`             ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  `notes`              TEXT         DEFAULT NULL,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`         DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_po_category` (`category_id`),
  KEY `idx_po_status`   (`status`),
  KEY `idx_po_deleted`  (`deleted_at`),
  CONSTRAINT `fk_po_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
