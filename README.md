# Cyber Junction Dynamic Articles

This project keeps the existing static Cyber Junction homepage and adds a PHP/MySQL article CMS beside it. PHP 8.1+ and MySQL 5.7.8+ (or MariaDB 10.2.7+) are required; the source-only workspace does not include a PHP runtime or a database server.

## Included

- Reusable, server-rendered article pages at `/{slug}/`, category pages at `/category/{slug}/`, and a generated `/sitemap.xml`.
- Secure admin dashboard at `/admin/` with one-time first-admin setup, login/logout, article search and filters, draft/publish/unpublish, edit, delete confirmation, preview, featured articles, categories, and Latest Updates.
- MySQL schema and an explicitly labelled **draft-only** demonstration article. It contains no invented recruitment dates or eligibility data and is not visible publicly.
- Published article content automatically populates the existing homepage category cards and Latest Updates. The existing homepage layout, navigation, contact form and customer-portal links remain in place.
- Old article slugs redirect after a slug edit. Drafts, unpublished articles, future-dated articles and articles in inactive categories are excluded from public routes, search, homepage lists and the sitemap.

## Local setup on Windows

1. Install PHP 8.1 or later with the `pdo_mysql`, `mbstring` and `openssl` extensions, plus MySQL 5.7.8+ or MariaDB 10.2.7+. The current workspace machine does not have PHP, MySQL, or MariaDB on `PATH`. XAMPP is one way to install the local stack; the project itself does not require Composer or npm.
2. In MySQL, create the database and a dedicated app user. Then import `backend/schema.sql` as a database administrator; it preserves the database and seeds categories plus one draft demo article.

   ```sql
   CREATE DATABASE cyber_junction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'cj_app'@'localhost' IDENTIFIED BY 'use-a-unique-database-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON cyber_junction.* TO 'cj_app'@'localhost';
   ```

   From PowerShell, import the schema using an administrator account:

   ```powershell
   & $env:ComSpec /c 'mysql --default-character-set=utf8mb4 -u root -p < "D:\TRY CJ\backend\schema.sql"'
   ```

   For shared hosting, create the database in the hosting panel first. If the host assigns a prefixed database name, change the first `CREATE DATABASE` and `USE` statements in the schema before importing it.
3. Copy `backend/config.local.php.example` to `backend/config.local.php`. Set the MySQL database name, app username/password, base URL and two different random keys (`app_key` and `admin_setup_key`). Keep this local config private; it is excluded from version control and direct requests to `backend/` are denied.

   Generate independent random keys in PowerShell:

   ```powershell
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $bytes = New-Object byte[] 48
   $rng.GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Generate the second key separately. Both keys must be at least 32 characters. Do not reuse the database password as either key.
4. From the project root, run the PHP development server (local development only):

   ```powershell
   Set-Location "D:\TRY CJ"
   & "C:\xampp\php\php.exe" -S 127.0.0.1:5000 backend/router.php
   ```

   If XAMPP is installed in another directory, use that installation's `php.exe` path.

5. Open `http://localhost:5000/index.html` and `http://localhost:5000/admin/`. On first use, provide the configured setup key, administrator email and a unique password of at least 12 characters. Once the first administrator exists, the setup endpoint closes automatically; remove `admin_setup_key` from the local config afterwards.
6. The seeded CSIR CFTRI item is a **draft**. Use the dashboard to replace it with currently verified official information before publishing. `article.html` redirects to its managed URL; that URL returns 404 until the article is published.

The PHP built-in server is not a production server. Keep it bound to localhost and do not expose it to the public internet.

## Admin article fields

Articles use a shared editor and template. Content is plain text (blank lines create paragraphs); tabular fields use one `Label | Value` row per line; list fields use one entry per line; FAQs use one `Question | Answer` pair per line. Featured images and official links are validated HTTP/HTTPS URLs. Empty fields and sections are not rendered. To add a future category, use **Categories**; existing categories with articles can be deactivated but not deleted.

The article search includes title, category, short description and editor-supplied keywords. The homepage search continues to use the existing search interface and links directly to the article URL.

## Hosting and deployment

- Upload the project to the PHP document root on an Apache host with PHP 8.1+, PDO MySQL, `mbstring`, `openssl`, MySQL 5.7.8+ or MariaDB 10.2.7+, and `mod_rewrite` enabled. Allow the root `.htaccess` to run (`AllowOverride` enabled).
- Import `backend/schema.sql`, adapting its database name for the hosting account. Create a database user limited to the app database with `SELECT`, `INSERT`, `UPDATE` and `DELETE`; run schema changes separately with an administrative database user.
- Set `CJ_DB_HOST`, `CJ_DB_PORT`, `CJ_DB_NAME`, `CJ_DB_USER`, `CJ_DB_PASSWORD`, `CJ_APP_KEY`, `CJ_BASE_URL` and (only during first-admin setup) `CJ_ADMIN_SETUP_KEY` in the hosting environment, or use a protected `backend/config.local.php`. Set `CJ_BASE_URL` to the HTTPS site origin with no trailing slash.
- Enforce HTTPS at the host/proxy, disable directory listings, protect configuration and SQL files, and keep `backend/` outside public access (the included `.htaccess` denies direct access). Do not deploy with the PHP development server.
- Complete the one-time admin setup over HTTPS, then remove `CJ_ADMIN_SETUP_KEY` / `admin_setup_key`. Back up the database and any externally hosted featured images. Configure regular database backups and server-log monitoring.
- If the hosting provider does not support PHP/MySQL or Apache rewrite rules, use an equivalent host-supported backend and URL rewrite configuration; do not use a browser-only database or expose credentials to JavaScript.

## Security and testing checklist

- [ ] Verify HTTPS, private database credentials, two independent random application/setup keys and a dedicated least-privilege MySQL account.
- [ ] Confirm the first-admin setup is closed after use; test login, wrong-password throttling, idle session expiry, logout and rejection of missing/invalid CSRF tokens.
- [ ] Create, preview, save draft, publish, edit, unpublish and delete an article. Confirm title/slug uniqueness, a slug-change 301 redirect and category updates.
- [ ] Confirm draft/unpublished/future-dated/inactive-category articles do not appear in article routes, search, category pages, homepage cards or sitemap; verify unknown URLs return HTTP 404.
- [ ] Test all optional article fields empty and populated; verify links, tables, FAQs, related/previous-next articles, metadata, structured data and mobile layouts.
- [ ] Test category creation/deactivation, Latest Updates create/edit/hide/delete, search by title/category/keyword, the contact form and existing homepage navigation/customer-portal links.
- [ ] Check PHP and web-server logs after invalid input and failed database connections; verify errors do not reveal stack traces or credentials to public responses.

This source tree has no bundled PHP/MySQL server. Runtime database, admin-authentication and Apache rewrite tests must be run after installing/configuring the local stack or deploying to the target PHP host.
