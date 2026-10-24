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
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_categories_order (is_active, sort_order, name)
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
  INDEX idx_login_attempts_ip_date (ip_hash, attempted_at)
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
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  updated_at DATETIME NULL,
  main_content MEDIUMTEXT NOT NULL,
  important_notice TEXT NOT NULL,
  sections LONGTEXT NOT NULL,
  official_notification_url VARCHAR(2048) NOT NULL DEFAULT '',
  apply_online_url VARCHAR(2048) NOT NULL DEFAULT '',
  official_website_url VARCHAR(2048) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_articles_publication (status, published_at, is_featured),
  INDEX idx_articles_category (category_slug, status, published_at),
  INDEX idx_articles_changed (changed_at, id),
  CONSTRAINT fk_articles_category FOREIGN KEY (category_slug) REFERENCES categories (slug)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_redirects (
  old_slug VARCHAR(180) NOT NULL PRIMARY KEY,
  new_slug VARCHAR(180) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_article_redirect_target (new_slug)
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
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_latest_updates_public (is_published, sort_order, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS category_home_tabs (
  category_slug VARCHAR(80) NOT NULL,
  tab_slug VARCHAR(40) NOT NULL,
  PRIMARY KEY (category_slug, tab_slug),
  INDEX idx_category_home_tabs_tab (tab_slug, category_slug),
  CONSTRAINT fk_category_home_tabs_category FOREIGN KEY (category_slug) REFERENCES categories (slug)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quick_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  bg_color VARCHAR(24) NOT NULL DEFAULT 'blue',
  text_color VARCHAR(24) NOT NULL DEFAULT 'white',
  position_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quick_links_public (is_active, position_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homepage_settings (
  id SMALLINT NOT NULL PRIMARY KEY,
  content LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_newsletter_subscribers_created (subscribed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO categories
  (slug, name, icon, color, home_visible, nav_visible, is_active, sort_order)
VALUES
  ('latest-updates', 'Trending Jobs', '', 'blue', 0, 0, 1, 0),
  ('jobs', 'Latest Jobs', '▣', 'blue', 1, 1, 1, 10),
  ('results', 'Results', '▤', 'green', 1, 1, 1, 20),
  ('admit', 'Admit Card', '🎟', 'orange', 1, 1, 1, 30),
  ('answer-key', 'Answer Key', '🗝', 'orange', 0, 0, 1, 31),
  ('syllabus', 'Syllabus', '📚', 'purple', 0, 0, 1, 32),
  ('admission', 'Admission', '🎓', 'purple', 1, 1, 1, 40),
  ('certificate', 'Certificate', '📄', 'blue', 0, 0, 1, 41),
  ('offline-outsourcing-job', 'Offline/Outsourcing Job', '💼', 'green', 0, 0, 1, 42),
  ('important', 'Important', '📌', 'teal', 0, 0, 1, 43),
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

UPDATE categories
SET name = 'Trending Jobs', icon = '', color = 'blue', is_active = 1, sort_order = 0
WHERE slug = 'latest-updates';

INSERT IGNORE INTO category_home_tabs (category_slug, tab_slug)
SELECT slug, 'latest-updates' FROM categories;

INSERT IGNORE INTO category_home_tabs (category_slug, tab_slug)
VALUES
  ('results', 'results'),
  ('admit', 'admit'),
  ('jobs', 'jobs'),
  ('scholarship', 'scholarship'),
  ('answer-key', 'answer-key'),
  ('syllabus', 'syllabus'),
  ('admission', 'admission'),
  ('certificate', 'certificate'),
  ('offline-outsourcing-job', 'offline-outsourcing-job'),
  ('important', 'important'),
  ('important-links', 'important');
