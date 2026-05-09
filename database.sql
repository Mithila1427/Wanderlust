

-- 1. Create database
CREATE DATABASE IF NOT EXISTS wanderlust_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wanderlust_db;

-- 2. USERS table

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(191)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    avatar_url    VARCHAR(500)  DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB;


-- 3. ITINERARIES table

CREATE TABLE IF NOT EXISTS itineraries (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,
    title         VARCHAR(200)  NOT NULL DEFAULT 'My Trip',
    data          LONGTEXT      NOT NULL COMMENT 'JSON blob of days + activities',
    start_date    DATE          DEFAULT NULL,
    end_date      DATE          DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    UNIQUE KEY uq_user_title (user_id, title)
) ENGINE=InnoDB;


-- 4. SAVED DESTINATIONS table (optional – wishlist)

CREATE TABLE IF NOT EXISTS saved_destinations (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    city        VARCHAR(100) NOT NULL,
    country     VARCHAR(100) NOT NULL,
    image_url   VARCHAR(500) DEFAULT NULL,
    notes       TEXT         DEFAULT NULL,
    saved_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_dest (user_id)
) ENGINE=InnoDB;


-- 5. Sample demo data (optional – delete in production)

INSERT IGNORE INTO users (name, email, password_hash) VALUES
  ('Demo User', 'demo@wanderlust.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
  -- password: password
