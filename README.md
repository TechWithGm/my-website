# Cyber Junction Dynamic Articles

This project retains the Cyber Junction homepage layout and adds PHP/PostgreSQL content management for its homepage, articles, categories and Trending Jobs. PHP 8.1+ with PDO PostgreSQL, `mbstring` and `openssl`, plus PostgreSQL 14+ are required; the source-only workspace does not include a PHP runtime or a database server.

## Included

- Reusable, server-rendered article pages at `/{slug}/`, category pages at `/category/{slug}/`, and a generated `/sitemap.xml`.
- Secure admin dashboard at `/admin/` with one-time first-admin setup, login/logout, article search and filters, draft/publish/unpublish, edit, delete confirmation, preview, featured articles, categories, and Trending Jobs.
- A **Quick Links** dashboard for the homepage button grid, with create, edit, delete, visibility, color and ordering controls, plus a **Homepage** editor for site text, branding, promotions, sidebar links, social links, service links, Bihar Bhoomi directory and article-backed Result / Admit Card / Latest Job lists.
- PostgreSQL schema and an explicitly labelled **draft-only** demonstration article. It contains no invented recruitment dates or eligibility data and is not visible publicly.
- Published article content populates mapped homepage sections and Trending Jobs, including its title, publish date, short description and Read More link. Trending Jobs is an Article category; category-to-section mappings are managed from **Categories**, so one article category can feed multiple homepage sections without changing the Article form or article records. The category-card grid is hidden without deleting its articles or links; homepage cards are managed from Articles by selecting the existing article category. Bihar Bhoomi and RTPS services are grouped under the expandable Bihar Bhoomi panel near the top of the homepage. The homepage and managed article/category pages provide navigation to visible homepage sections, with Quick Links and Important Pages restored in the footer.
- The Popular Searches, Government Jobs All India, Latest News and Important Links sidebar cards are removed from the homepage.
- Old article slugs redirect after a slug edit. Drafts, unpublished articles, future-dated articles and articles in inactive categories are excluded from public routes, search, homepage lists and the sitemap.

## Local setup on Windows

1. Install PHP 8.1 or later with the `pdo_pgsql`, `pdo_mysql`, `mbstring` and `openssl` extensions, plus PostgreSQL 14+ or MySQL/MariaDB.
2. Create a PostgreSQL project (Supabase is supported) and import `backend/schema.sql` using the provider's SQL editor. The schema is safe to run again and seeds categories plus one draft demo article.
3. Copy `backend/config.local.php.example` to `backend/config.local.php`. Set the PostgreSQL host, port, database name, username/password, HTTPS base URL and two different random keys (`app_key` and `admin_setup_key`). Keep this local config private; it is excluded from version control and direct requests to `backend/` are denied.

   Generate independent random keys in PowerShell:

   ```powershell
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $bytes = New-Object byte[] 48
   $rng.GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Generate the second key separately. Both keys must be at least 32 characters. Do not reuse the database password as either key.
   The root `.env` file is only for the Node.js email notifier; PHP reads `CJ_*` environment variables or `backend/config.local.php`.
4. Configure the SendGrid article-publication email notifier using the steps in [Email notifications](#email-notifications).
5. From the project root, run the PHP development server (local development only):

   ```powershell
   Set-Location "D:\TRY CJ"
   & "C:\xampp\php\php.exe" -S 127.0.0.1:5000 backend/router.php
   ```

   If XAMPP is installed in another directory, use that installation's `php.exe` path.

6. Open `http://localhost:5000/index.html` and `http://localhost:5000/admin/`. On first use, provide the configured setup key, administrator email and a unique password of at least 12 characters. Once the first administrator exists, the setup endpoint closes automatically; remove `admin_setup_key` from the local config afterwards.
7. The seeded CSIR CFTRI item is a **draft**. Use the dashboard to replace it with currently verified official information before publishing. `article.html` redirects to its managed URL; that URL returns 404 until the article is published.

The PHP built-in server is not a production server. Keep it bound to localhost and do not expose it to the public internet.

### XAMPP with MySQL/MariaDB

The application can use either the existing PostgreSQL deployment or MySQL/MariaDB locally. Create/select the `cyber_junction` database in phpMyAdmin and import `backend/schema.mysql.sql`; it creates missing CMS tables and seeds categories/mappings without deleting existing records. In the private `backend/config.local.php`, set `db_driver` to `mysql`, configure the local database connection and keys, and set `base_url` to `http://localhost`. Then serve the repository as an Apache document root with `AllowOverride All` enabled so the existing `.htaccess` API and article routes work. The XAMPP PHP build must have `pdo_mysql` enabled.

The standard local connection values are `db_driver=mysql`, `db_host=127.0.0.1`, `db_port=3306`, `db_name=cyber_junction`, `base_url=http://localhost`, and `timezone=Asia/Kolkata`. Keep your MySQL username/password and independent random `app_key` private in `backend/config.local.php`; do not use local MySQL credentials on Render.

## Email notifications

The Node.js notifier sends an email to each newsletter subscriber **only when an article is published for the first time** from the admin dashboard. Editing an already-published article does not send another email. Draft saves and unpublishing do not send email. Future-dated articles are not emailed at publish time; publish them after their intended release time if subscribers should be notified. The PHP API contacts the private Node service using a shared bearer token; only the Node service holds the SendGrid API key.

### Local setup

1. Create a SendGrid account, create an API key with Mail Send permission, and verify a sender address/domain in SendGrid. Use that verified address as `SENDGRID_FROM_EMAIL`.
2. From the repository root, install Node.js 20 or newer and run:

   ```powershell
   npm ci
   Copy-Item .env.example .env
   ```

3. Edit the private `.env` file. Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`. Generate a random secret of at least 32 characters and put the same value in `EMAIL_NOTIFICATION_TOKEN` and in `backend/config.local.php` as `email_notifier_token`. Set `email_notifier_url` in that PHP config to `http://127.0.0.1:4000`.
4. Start the email notifier in one VS Code terminal:

   ```powershell
   npm start
   ```

   Keep it running while testing the PHP site. In a second terminal, start the PHP development server as described above. Check `http://127.0.0.1:4000/health` for `{"status":"ok"}`.
5. Add an email address through the homepage Subscribe form, then publish a new article in the admin dashboard. A successful publish displays how many subscribers were notified. SendGrid delivery requires a real verified sender and API key; test with an address you control.

Never commit `.env`, SendGrid API keys, or the shared internal token. The notifier validates the shared token, sends each recipient in a separate SendGrid personalization, and caps one publication event at 5,000 subscribers.

### Render deployment

The Render Blueprint now defines a separate Node web service named `cyber-junction-email-notifier` and connects its host to the PHP service. In the Render dashboard, set the following secret values:

- On `cyber-junction-email-notifier`, set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, and `EMAIL_NOTIFICATION_TOKEN`.
- On `cyber-junction`, set `CJ_EMAIL_NOTIFIER_TOKEN` to the exact same random value as `EMAIL_NOTIFICATION_TOKEN`.

Deploy both services, confirm the Node service health check passes, and re-run the SendGrid setup check above. For production notifications, use an always-on Node service plan so a sleeping service does not delay an admin publish request. Apply the existing subscriber-table schema to the hosted database before publishing; see `backend/schema.sql` for PostgreSQL/Supabase or `backend/schema.mysql.sql` for MySQL.

## Homepage content

Open **Quick Links** in the admin dashboard to add, edit, delete, activate, hide, recolor and reorder up to 8 active buttons at the top of the homepage. Choose a managed article in a Quick Link to populate its title and URL, and use **Manage article** beside recognized article links to open that article in the editor. **Manage articles** opens the complete article list. Custom internal paths and HTTPS URLs continue to work. The button design uses rectangular tiles with bold white text and olive, blue, orange, dark red, bright red, green, pink and royal blue colors, matching the supplied reference. The grid shows four columns on desktop and two on mobile. To choose which homepage sections receive an article category, open **Categories** and select one or more sections. All published articles assigned to that category appear in each selected section. The existing Article form, article-page format and article records remain unchanged. A card can still be switched to curated custom links from the Homepage editor. Quick links are stored in the PostgreSQL `quick_links` table, category-to-section mappings in `category_home_tabs`, and section settings in the `homepage_settings` JSONB record.

For an existing database, re-run `backend/schema.sql` in the Supabase SQL Editor before deploying or using the Categories mapping editor. The idempotent schema creates the `category_home_tabs` mapping table, adds missing homepage article categories, seeds default category mappings, and preserves existing article records, URLs and saved homepage content. It also applies the existing Quick Links migration, importing saved homepage quick links once and switching homepage lists to article-backed mode once.

## Admin article fields

Articles use a shared editor and template. Content is plain text (blank lines create paragraphs); tabular fields use one `Label | Value` row per line; list fields use one entry per line; FAQs use one `Question | Answer` pair per line. Featured images and official links are validated HTTP/HTTPS URLs. Empty fields and sections are not rendered. To add a future category, use **Categories** and set its homepage-section mappings there; existing categories with articles can be deactivated but not deleted.

The article search includes title, category, short description and editor-supplied keywords. The homepage search continues to use the existing search interface and links directly to the article URL.

## Hosting and deployment

- Upload the project to the PHP document root on an Apache host with PHP 8.1+, PDO PostgreSQL, `mbstring`, `openssl`, PostgreSQL 14+, and `mod_rewrite` enabled. Allow the root `.htaccess` to run (`AllowOverride` enabled).
- **Render + Supabase:** The repository includes a Docker-based Apache/PHP 8.3 deployment and a `render.yaml` Blueprint. Create a Supabase PostgreSQL project and run `backend/schema.sql` in its SQL Editor. The CMS tables enable row-level security and intentionally define no browser-facing policies; connect only from the PHP backend using Supabase's **Session pooler** and its database-owner account. Keep that account server-side in Render; never put it in browser code. The Blueprint sets `CJ_DB_DRIVER=pgsql`, preconfigures this project's session-pooler host and username, port (`5432`), database (`postgres`) and HTTPS base URL (`https://cyber-junction.onrender.com`), and uses `Asia/Kolkata`. Set `CJ_DB_PASSWORD` to the Supabase database password and `CJ_APP_KEY` to an independent random secret of at least 32 characters in Render's Environment settings. After deployment, `https://cyber-junction.onrender.com/api/health` must return `{"status":"ok","database":"ok"}`; this checks both the database connection and the admin table, unlike the homepage check. If it returns an error, verify these Render secrets and that `backend/schema.sql` was run against the configured Supabase project. `CJ_ADMIN_SETUP_KEY` is only needed for first-admin setup; this deployment already has an administrator, so remove any existing value from Render and do not add it back to the Blueprint. Do not put database credentials in Git or chat.
- On other PHP hosts, import `backend/schema.sql` into PostgreSQL and set `CJ_DB_HOST`, `CJ_DB_PORT`, `CJ_DB_NAME`, `CJ_DB_USER`, `CJ_DB_PASSWORD`, `CJ_APP_KEY`, `CJ_BASE_URL` and (only during first-admin setup) `CJ_ADMIN_SETUP_KEY` in the hosting environment, or use a protected `backend/config.local.php`. Keep credentials private and set `CJ_BASE_URL` to the HTTPS site origin with no trailing slash.
- Enforce HTTPS at the host/proxy, disable directory listings, protect configuration and SQL files, and keep `backend/` outside public access (the included `.htaccess` denies direct access). Do not deploy with the PHP development server.
- Complete the one-time admin setup over HTTPS, then remove `CJ_ADMIN_SETUP_KEY` / `admin_setup_key`. Back up the database and any externally hosted featured images. Configure regular database backups and server-log monitoring.
- If the hosting provider does not support PHP/PostgreSQL or Apache rewrite rules, use an equivalent host-supported backend and URL rewrite configuration; do not use a browser-only database or expose credentials to JavaScript.

## Security and testing checklist

- [ ] Verify HTTPS, private database credentials, two independent random application/setup keys, enabled RLS on CMS tables and a server-only database-owner account.
- [ ] Confirm the first-admin setup is closed after use; test login, wrong-password throttling, idle session expiry, logout and rejection of missing/invalid CSRF tokens.
- [ ] Create, preview, save draft, publish, edit, unpublish and delete an article. Confirm title/slug uniqueness, a slug-change 301 redirect and category updates.
- [ ] Confirm draft/unpublished/future-dated/inactive-category articles do not appear in article routes, search, category pages, homepage lists or sitemap; verify unknown URLs return HTTP 404.
- [ ] Test all optional article fields empty and populated; verify links, tables, FAQs, related/previous-next articles, metadata, structured data and mobile layouts.
- [ ] Test homepage text/link edits and list add/remove, category creation/deactivation, Trending Jobs create/edit/hide/delete, search by title/category/keyword, the contact form and homepage section links.
- [ ] Check PHP and web-server logs after invalid input and failed database connections; verify errors do not reveal stack traces or credentials to public responses.

This source tree has no bundled PHP/PostgreSQL server. Runtime database, admin-authentication and Apache rewrite tests must be run after installing/configuring the local stack or deploying to the target PHP host.
