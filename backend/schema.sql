CREATE DATABASE IF NOT EXISTS cyber_junction
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cyber_junction;

CREATE TABLE IF NOT EXISTS categories (
  slug VARCHAR(80) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(24) NOT NULL DEFAULT '',
  color VARCHAR(24) NOT NULL DEFAULT 'blue',
  home_visible TINYINT(1) NOT NULL DEFAULT 1,
  nav_visible TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_categories_order (is_active, sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_hash CHAR(64) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  succeeded TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_login_attempts_ip_date (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  ip_hash CHAR(64) NOT NULL,
  route_name VARCHAR(80) NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ip_hash, route_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  category_slug VARCHAR(80) NOT NULL,
  short_description VARCHAR(500) NOT NULL DEFAULT '',
  meta_description VARCHAR(320) NOT NULL DEFAULT '',
  keywords VARCHAR(500) NOT NULL DEFAULT '',
  featured_image VARCHAR(2048) NOT NULL DEFAULT '',
  author_name VARCHAR(120) NOT NULL DEFAULT 'Cyber Junction Team',
  status ENUM('draft', 'published', 'unpublished') NOT NULL DEFAULT 'draft',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  updated_at DATETIME NULL,
  main_content MEDIUMTEXT NOT NULL,
  important_notice TEXT NOT NULL,
  sections JSON NOT NULL,
  official_notification_url VARCHAR(2048) NOT NULL DEFAULT '',
  apply_online_url VARCHAR(2048) NOT NULL DEFAULT '',
  official_website_url VARCHAR(2048) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_articles_category FOREIGN KEY (category_slug)
    REFERENCES categories (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_articles_publication (status, published_at, is_featured),
  KEY idx_articles_category (category_slug, status, published_at),
  FULLTEXT KEY ft_articles_search (title, short_description, keywords)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_redirects (
  old_slug VARCHAR(180) NOT NULL PRIMARY KEY,
  new_slug VARCHAR(180) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_article_redirect_target (new_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS latest_updates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  url VARCHAR(2048) NOT NULL DEFAULT '',
  description VARCHAR(500) NOT NULL DEFAULT '',
  display_date VARCHAR(80) NOT NULL DEFAULT '',
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_latest_updates_public (is_published, sort_order, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO categories
  (slug, name, icon, color, home_visible, nav_visible, is_active, sort_order)
VALUES
  ('jobs', 'Latest Jobs', '▣', 'blue', 1, 1, 1, 10),
  ('results', 'Results', '▤', 'green', 1, 1, 1, 20),
  ('admit', 'Admit Card', '🎟', 'orange', 1, 1, 1, 30),
  ('admission', 'Admission', '🎓', 'purple', 1, 1, 1, 40),
  ('scholarship', 'Scholarship', '💰', 'pink', 1, 1, 1, 50),
  ('yojana', 'Government Schemes', '🏛', 'teal', 1, 1, 1, 60),
  ('bihar', 'Bihar News', '📰', 'blue', 1, 1, 1, 70),
  ('career', 'Career', '🚀', 'red', 1, 1, 1, 80),
  ('education', 'Education', '🎓', 'purple', 1, 1, 1, 90),
  ('other-updates', 'Other Updates', '📰', 'teal', 1, 1, 1, 100),
  ('latest-news', 'Latest News', '📰', 'blue', 0, 1, 1, 110),
  ('important-links', 'Important Links', '🔗', 'green', 0, 1, 1, 120),
  ('popular-searches', 'Popular Searches', '⌕', 'orange', 0, 1, 1, 130),
  ('bihar-bhoomi', 'Bihar Bhoomi', '🌾', 'green', 0, 1, 1, 140);

INSERT IGNORE INTO articles
  (title, slug, category_slug, short_description, meta_description, author_name, status,
   main_content, important_notice, sections)
VALUES
  ('DEMO DRAFT - CSIR CFTRI Technician Recruitment 2026 (Verify Before Publishing)', 'csir-cftri-technician-recruitment-2026', 'jobs',
   'Demonstration draft only. Verify all recruitment information against the current official notification before publishing.',
   'Demonstration draft for the Cyber Junction article editor.',
   'Cyber Junction Team', 'draft',
   'This is a demonstration draft for checking the article editor and preview. It contains no verified recruitment dates, fees, qualifications or vacancy details. Replace it with information verified from the current official notice before publishing.',
   '', JSON_OBJECT());
