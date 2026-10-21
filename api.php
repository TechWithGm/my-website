<?php

declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

function cj_api_route(): string
{
    $path = trim((string) ($_GET['path'] ?? ''), '/');
    if ($path !== '') {
        return $path;
    }
    return trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
}

function cj_article_rows(PDO $db, string $where = '', array $params = [], string $suffix = ''): array
{
    $stmt = $db->prepare(cj_article_select_sql() . $where . $suffix);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function cj_public_content(PDO $db): array
{
    $categoryRows = $db->query('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name')->fetchAll();
    $categories = [];
    foreach ($categoryRows as $row) {
        $categories[] = [
            'id' => $row['slug'],
            'name' => $row['name'],
            'icon' => $row['icon'],
            'color' => $row['color'],
            'homeVisible' => (bool) $row['home_visible'],
            'navVisible' => (bool) $row['nav_visible'],
            'url' => cj_public_url('category/' . rawurlencode($row['slug']) . '/'),
            'sortOrder' => (int) $row['sort_order'],
            'managedContent' => in_array($row['slug'], [
                'jobs', 'results', 'admit', 'admission', 'scholarship', 'yojana',
                'bihar', 'career', 'education', 'other-updates',
            ], true),
        ];
    }
    $categories[] = [
        'id' => 'latest-updates',
        'name' => 'Latest Updates',
        'icon' => '🔥',
        'color' => 'blue',
        'homeVisible' => false,
        'navVisible' => false,
        'url' => '',
        'sortOrder' => 0,
        'managedContent' => true,
    ];

    $articleRows = cj_article_rows(
        $db,
        " WHERE a.status = 'published' AND a.published_at <= NOW() AND c.is_active = 1",
        [],
        ' ORDER BY a.is_featured DESC, a.published_at DESC, a.id DESC LIMIT 500'
    );
    $items = [];
    $byCategory = [];
    foreach ($articleRows as $row) {
        $article = cj_public_article($row);
        $byCategory[$row['category_slug']][] = [
            'title' => $article['title'],
            'url' => $article['url'],
            'displayDate' => cj_format_date($row['updated_at'] ?: $row['published_at']),
            'description' => $article['shortDescription'],
            'keywords' => $article['keywords'],
            'isArticle' => true,
        ];
    }
    foreach ($byCategory as $categorySlug => $categoryItems) {
        $items = array_merge($items, array_map(
            static fn (array $item): array => ['categoryId' => $categorySlug] + $item,
            array_slice($categoryItems, 0, 30)
        ));
    }

    $updates = $db->query(
        'SELECT title, url, description, display_date FROM latest_updates
         WHERE is_published = 1 ORDER BY sort_order, updated_at DESC, id DESC LIMIT 20'
    )->fetchAll();
    $latestItems = [];
    foreach ($updates as $update) {
        $latestItems[] = [
            'title' => $update['title'],
            'url' => $update['url'],
            'displayDate' => $update['display_date'],
            'description' => $update['description'],
            'isArticle' => false,
        ];
    }
    if (!$latestItems) {
        foreach (array_slice($articleRows, 0, 20) as $row) {
            $article = cj_public_article($row);
            $latestItems[] = [
                'title' => $article['title'],
                'url' => $article['url'],
                'displayDate' => cj_format_date($row['updated_at'] ?: $row['published_at']),
                'description' => $article['shortDescription'],
                'keywords' => $article['keywords'],
                'isArticle' => true,
            ];
        }
    }
    foreach ($latestItems as $item) {
        $items[] = ['categoryId' => 'latest-updates'] + $item;
    }

    return [
        'categories' => $categories,
        'items' => $items,
        'pages' => [],
        'settings' => [
            'heroTitle' => 'सरकारी सेवाएं',
            'heroSubtitle' => 'Latest Government Job Updates',
            'heroButtonLabel' => 'View Latest Jobs →',
            'heroButtonUrl' => '#jobs',
            'aboutIntro' => '',
        ],
    ];
}

function cj_require_csrf_for_login(): void
{
    cj_start_session();
    $token = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!hash_equals((string) $_SESSION['csrf_token'], $token)) {
        cj_send_json(['error' => 'Invalid or missing CSRF token.'], 403);
    }
}

function cj_login_limited(PDO $db): bool
{
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM admin_login_attempts
         WHERE ip_hash = ? AND succeeded = 0 AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL \'15 minutes\''
    );
    $stmt->execute([cj_client_ip_hash()]);
    return (int) $stmt->fetchColumn() >= 8;
}

function cj_record_login(PDO $db, bool $succeeded): void
{
    $stmt = $db->prepare('INSERT INTO admin_login_attempts (ip_hash, succeeded) VALUES (?, ?)');
    $stmt->execute([cj_client_ip_hash(), $succeeded ? 1 : 0]);
    if ($succeeded) {
        $stmt = $db->prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ? AND succeeded = 0');
        $stmt->execute([cj_client_ip_hash()]);
    }
    $db->exec("DELETE FROM admin_login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '2 days'");
}

function cj_admin_article_input(array $input): array
{
    $article = cj_normalize_article($input);
    if ($article['status'] === 'published' && $article['published_at'] === null) {
        $article['published_at'] = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    }
    return $article;
}

function cj_admin_article_list(PDO $db): never
{
    cj_require_method('GET');
    cj_require_admin();
    $query = trim((string) ($_GET['q'] ?? ''));
    $category = trim((string) ($_GET['category'] ?? ''));
    $status = trim((string) ($_GET['status'] ?? ''));
    $where = [];
    $params = [];
    if ($query !== '') {
        $where[] = '(a.title ILIKE ? OR a.short_description ILIKE ? OR a.keywords ILIKE ?)';
        $term = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query) . '%';
        array_push($params, $term, $term, $term);
    }
    if ($category !== '') {
        $where[] = 'a.category_slug = ?';
        $params[] = cj_slug($category, 'Category');
    }
    if (in_array($status, ['draft', 'published', 'unpublished'], true)) {
        $where[] = 'a.status = ?';
        $params[] = $status;
    }
    $sqlWhere = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $rows = cj_article_rows($db, $sqlWhere, $params, ' ORDER BY a.changed_at DESC, a.id DESC LIMIT 500');
    cj_send_json(['data' => array_map('cj_public_article', $rows)]);
}

function cj_admin_save_article(PDO $db, ?int $id): never
{
    cj_require_method($id === null ? 'POST' : 'PUT');
    cj_require_admin();
    $article = cj_admin_article_input(cj_json_input());
    $category = $db->prepare('SELECT slug FROM categories WHERE slug = ? AND is_active = 1');
    $category->execute([$article['category_slug']]);
    if ($category->fetchColumn() === false) {
        cj_send_json(['error' => 'Choose an active category.'], 422);
    }

    try {
        $db->beginTransaction();
        $oldSlug = null;
        if ($id !== null) {
            $current = $db->prepare('SELECT slug FROM articles WHERE id = ? FOR UPDATE');
            $current->execute([$id]);
            $oldSlug = $current->fetchColumn();
            if ($oldSlug === false) {
                $db->rollBack();
                cj_send_json(['error' => 'Article not found.'], 404);
            }
        }
        if ($id === null) {
            $sql = 'INSERT INTO articles
                (title, slug, category_slug, short_description, meta_description, keywords, featured_image,
                 author_name, status, is_featured, published_at, updated_at, main_content, important_notice,
                 sections, official_notification_url, apply_online_url, official_website_url)
                VALUES (:title, :slug, :category_slug, :short_description, :meta_description, :keywords, :featured_image,
                 :author_name, :status, :is_featured, :published_at, :updated_at, :main_content, :important_notice,
                 :sections, :official_notification_url, :apply_online_url, :official_website_url)
                 RETURNING id';
            $stmt = $db->prepare($sql);
            $stmt->execute($article);
            $id = (int) $stmt->fetchColumn();
        } else {
            $sql = 'UPDATE articles SET title=:title, slug=:slug, category_slug=:category_slug,
                short_description=:short_description, meta_description=:meta_description, keywords=:keywords,
                featured_image=:featured_image, author_name=:author_name, status=:status, is_featured=:is_featured,
                published_at=:published_at, updated_at=:updated_at, main_content=:main_content,
                important_notice=:important_notice, sections=:sections,
                official_notification_url=:official_notification_url, apply_online_url=:apply_online_url,
                official_website_url=:official_website_url WHERE id=:id';
            $article['id'] = $id;
            $stmt = $db->prepare($sql);
            $stmt->execute($article);
            if ($oldSlug !== $article['slug']) {
                $deleteTargetRedirect = $db->prepare('DELETE FROM article_redirects WHERE old_slug=?');
                $deleteTargetRedirect->execute([$article['slug']]);
                $updateRedirects = $db->prepare('UPDATE article_redirects SET new_slug=? WHERE new_slug=?');
                $updateRedirects->execute([$article['slug'], $oldSlug]);
                $redirect = $db->prepare(
                    'INSERT INTO article_redirects (old_slug, new_slug) VALUES (?, ?)
                     ON CONFLICT (old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug'
                );
                $redirect->execute([$oldSlug, $article['slug']]);
            }
        }
        $db->commit();
        $stmt = $db->prepare(cj_article_select_sql() . ' WHERE a.id = ?');
        $stmt->execute([$id]);
        cj_send_json(['data' => cj_public_article($stmt->fetch())], $oldSlug === null ? 201 : 200);
    } catch (PDOException $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        if ($error->getCode() === '23505') {
            cj_send_json(['error' => 'That URL slug is already in use, or the change conflicts with existing data.'], 409);
        }
        throw $error;
    } catch (Throwable $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $error;
    }
}

function cj_admin_categories(PDO $db, string $method, ?string $slug): never
{
    if ($method === 'GET' && $slug === null) {
        cj_require_admin();
        $rows = $db->query('SELECT * FROM categories ORDER BY sort_order, name')->fetchAll();
        cj_send_json(['data' => $rows]);
    }
    if ($method === 'POST' && $slug === null) {
        cj_require_admin();
        $input = cj_json_input();
        $data = cj_normalize_category($input);
        $stmt = $db->prepare('INSERT INTO categories (slug,name,icon,color,home_visible,nav_visible,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?)');
        try {
            $stmt->execute(array_values($data));
        } catch (PDOException $error) {
            if ($error->getCode() === '23505') {
                cj_send_json(['error' => 'That category slug already exists.'], 409);
            }
            throw $error;
        }
        cj_send_json(['data' => $data], 201);
    }
    if ($method === 'PUT' && $slug !== null) {
        cj_require_admin();
        $input = cj_json_input();
        $data = cj_normalize_category($input);
        if ($data['slug'] !== cj_slug($slug, 'Category')) {
            cj_send_json(['error' => 'Category slugs cannot be changed after creation.'], 422);
        }
        $stmt = $db->prepare('UPDATE categories SET name=?,icon=?,color=?,home_visible=?,nav_visible=?,is_active=?,sort_order=? WHERE slug=?');
        $stmt->execute([$data['name'], $data['icon'], $data['color'], $data['home_visible'], $data['nav_visible'], $data['is_active'], $data['sort_order'], $slug]);
        if (!$stmt->rowCount() && !cj_category_exists($db, $slug)) {
            cj_send_json(['error' => 'Category not found.'], 404);
        }
        cj_send_json(['data' => $data]);
    }
    cj_send_json(['error' => 'Method not allowed.'], 405);
}

function cj_normalize_category(array $input): array
{
    $colors = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'red'];
    $slug = cj_slug($input['slug'] ?? '', 'Category slug');
    if (in_array($slug, ['latest-updates', 'about', 'home'], true)) {
        cj_send_json(['error' => 'This category slug is reserved.'], 422);
    }
    $color = $input['color'] ?? 'blue';
    if (!is_string($color)) {
        cj_send_json(['error' => 'Choose a supported category color.'], 422);
    }
    if (!in_array($color, $colors, true)) {
        cj_send_json(['error' => 'Choose a supported category color.'], 422);
    }
    return [
        'slug' => $slug,
        'name' => cj_text($input['name'] ?? '', 120, 'Category name', true),
        'icon' => cj_text($input['icon'] ?? '', 24, 'Category icon'),
        'color' => $color,
        'home_visible' => cj_bool($input['homeVisible'] ?? null, 'Homepage visibility', true) ? 1 : 0,
        'nav_visible' => cj_bool($input['navVisible'] ?? null, 'Navigation visibility', true) ? 1 : 0,
        'is_active' => cj_bool($input['isActive'] ?? null, 'Active status', true) ? 1 : 0,
        'sort_order' => cj_integer_range($input['sortOrder'] ?? null, 'Category sort order'),
    ];
}

function cj_category_exists(PDO $db, string $slug): bool
{
    $stmt = $db->prepare('SELECT 1 FROM categories WHERE slug = ?');
    $stmt->execute([$slug]);
    return $stmt->fetchColumn() !== false;
}

function cj_admin_latest_updates(PDO $db, string $method, ?int $id): never
{
    if ($method === 'GET' && $id === null) {
        cj_require_admin();
        cj_send_json(['data' => $db->query('SELECT * FROM latest_updates ORDER BY sort_order, updated_at DESC, id DESC')->fetchAll()]);
    }
    if ($method === 'POST' && $id === null) {
        cj_require_admin();
        $input = cj_json_input();
        $data = cj_normalize_latest_update($input);
        $stmt = $db->prepare('INSERT INTO latest_updates (title,url,description,display_date,is_published,sort_order) VALUES (?,?,?,?,?,?) RETURNING id');
        $stmt->execute(array_values($data));
        cj_send_json(['data' => ['id' => (int) $stmt->fetchColumn()] + $data], 201);
    }
    if ($method === 'PUT' && $id !== null) {
        cj_require_admin();
        $data = cj_normalize_latest_update(cj_json_input());
        $stmt = $db->prepare('UPDATE latest_updates SET title=?,url=?,description=?,display_date=?,is_published=?,sort_order=? WHERE id=?');
        $stmt->execute([...array_values($data), $id]);
        if (!$stmt->rowCount() && !cj_latest_update_exists($db, $id)) {
            cj_send_json(['error' => 'Latest update not found.'], 404);
        }
        cj_send_json(['data' => ['id' => $id] + $data]);
    }
    if ($method === 'DELETE' && $id !== null) {
        cj_require_admin();
        $stmt = $db->prepare('DELETE FROM latest_updates WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->rowCount()) {
            cj_send_json(['error' => 'Latest update not found.'], 404);
        }
        cj_send_json(['success' => true]);
    }
    cj_send_json(['error' => 'Method not allowed.'], 405);
}

function cj_normalize_latest_update(array $input): array
{
    if (isset($input['url']) && !is_string($input['url'])) {
        cj_send_json(['error' => 'Link URL is invalid.'], 422);
    }
    $url = trim((string) ($input['url'] ?? ''));
    if ($url !== '' && !str_starts_with($url, '/')) {
        $url = cj_safe_url($url, 'Link URL');
    } elseif ($url !== '' && !preg_match('~^/(?!/)[a-zA-Z0-9/_-]*(?:\?[^#\s]*)?(?:#[a-zA-Z0-9_-]*)?$~', $url)) {
        cj_send_json(['error' => 'The internal link is invalid.'], 422);
    }
    return [
        'title' => cj_text($input['title'] ?? '', 300, 'Update title', true),
        'url' => $url,
        'description' => cj_text($input['description'] ?? '', 500, 'Description'),
        'display_date' => cj_text($input['displayDate'] ?? '', 80, 'Display date'),
        'is_published' => cj_bool($input['isPublished'] ?? null, 'Publication status', true) ? 1 : 0,
        'sort_order' => cj_integer_range($input['sortOrder'] ?? null, 'Sort order'),
    ];
}

function cj_latest_update_exists(PDO $db, int $id): bool
{
    $stmt = $db->prepare('SELECT 1 FROM latest_updates WHERE id = ?');
    $stmt->execute([$id]);
    return (bool) $stmt->fetchColumn();
}

function cj_admin_dispatch(PDO $db, array $segments): never
{
    cj_start_session();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $resource = $segments[1] ?? '';
    $identifier = $segments[2] ?? null;

    if ($resource === 'session' && $method === 'GET') {
        $adminId = (int) ($_SESSION['admin_id'] ?? 0);
        if ($adminId && time() - (int) ($_SESSION['last_activity'] ?? 0) <= 1800) {
            $_SESSION['last_activity'] = time();
            $stmt = $db->prepare('SELECT email FROM admins WHERE id = ?');
            $stmt->execute([$adminId]);
            cj_send_json(['authenticated' => (bool) ($email = $stmt->fetchColumn()), 'email' => $email ?: '', 'csrfToken' => $_SESSION['csrf_token']]);
        }
        cj_send_json(['authenticated' => false, 'csrfToken' => $_SESSION['csrf_token']]);
    }

    if ($resource === 'setup-status' && $method === 'GET') {
        cj_send_json(['needsAdmin' => cj_admin_count($db) === 0, 'setupEnabled' => cj_config()['admin_setup_key'] !== '']);
    }
    if ($resource === 'setup' && $method === 'POST') {
        cj_require_csrf_for_login();
        if (cj_login_limited($db)) {
            cj_send_json(['error' => 'Too many setup attempts. Try again in 15 minutes.'], 429);
        }
        $input = cj_json_input();
        $expectedKey = cj_config()['admin_setup_key'];
        if ($expectedKey === '' || !hash_equals($expectedKey, (string) ($input['setupKey'] ?? ''))) {
            cj_record_login($db, false);
            cj_send_json(['error' => 'Setup key is not valid.'], 403);
        }
        $email = filter_var(strtolower(trim((string) ($input['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
        $password = (string) ($input['password'] ?? '');
        if (!$email || strlen($password) < 12 || strlen($password) > 200) {
            cj_send_json(['error' => 'Enter a valid email and a password of at least 12 characters.'], 422);
        }
        $setupLock = (int) $db->query("SELECT CASE WHEN pg_try_advisory_lock(hashtext('cj_admin_setup')) THEN 1 ELSE 0 END")->fetchColumn();
        if ($setupLock !== 1) {
            cj_send_json(['error' => 'Administrator setup is busy. Try again shortly.'], 503);
        }
        if (cj_admin_count($db) !== 0) {
            $db->query("SELECT pg_advisory_unlock(hashtext('cj_admin_setup'))");
            cj_send_json(['error' => 'Initial administrator setup is already closed.'], 409);
        }
        try {
            $stmt = $db->prepare('INSERT INTO admins (email,password_hash) VALUES (?,?)');
            $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT)]);
        } finally {
            $db->query("SELECT pg_advisory_unlock(hashtext('cj_admin_setup'))");
        }
        cj_record_login($db, true);
        cj_send_json(['success' => true, 'message' => 'Administrator created. Sign in to continue.'], 201);
    }

    if ($resource === 'login' && $method === 'POST') {
        cj_require_csrf_for_login();
        if (cj_login_limited($db)) {
            cj_send_json(['error' => 'Too many login attempts. Try again in 15 minutes.'], 429);
        }
        $input = cj_json_input();
        $email = filter_var(strtolower(trim((string) ($input['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
        $password = (string) ($input['password'] ?? '');
        $stmt = $db->prepare('SELECT id,password_hash FROM admins WHERE email = ? LIMIT 1');
        $stmt->execute([$email ?: '']);
        $admin = $stmt->fetch();
        $success = $admin && password_verify($password, $admin['password_hash']);
        cj_record_login($db, (bool) $success);
        if (!$success) {
            cj_send_json(['error' => 'Email or password is incorrect.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int) $admin['id'];
        $_SESSION['last_activity'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $stmt = $db->prepare('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([(int) $admin['id']]);
        cj_send_json(['success' => true, 'csrfToken' => $_SESSION['csrf_token']]);
    }

    if ($resource === 'logout' && $method === 'POST') {
        cj_require_admin();
        $_SESSION = [];
        session_regenerate_id(true);
        session_destroy();
        cj_send_json(['success' => true]);
    }

    if ($resource === 'articles') {
        $id = $identifier === null ? null : filter_var($identifier, FILTER_VALIDATE_INT);
        if ($identifier !== null && !$id) {
            cj_send_json(['error' => 'Invalid article id.'], 400);
        }
        if ($id === null && $method === 'GET') {
            cj_admin_article_list($db);
        }
        if ($id === null && $method === 'POST' || $id !== null && $method === 'PUT') {
            cj_admin_save_article($db, $id === null ? null : (int) $id);
        }
        if ($id !== null && $method === 'DELETE') {
            cj_require_admin();
            $db->beginTransaction();
            $stmt = $db->prepare('SELECT slug FROM articles WHERE id = ? FOR UPDATE');
            $stmt->execute([(int) $id]);
            $slug = $stmt->fetchColumn();
            if ($slug === false) {
                $db->rollBack();
                cj_send_json(['error' => 'Article not found.'], 404);
            }
            $redirects = $db->prepare('DELETE FROM article_redirects WHERE old_slug = ? OR new_slug = ?');
            $redirects->execute([$slug, $slug]);
            $stmt = $db->prepare('DELETE FROM articles WHERE id = ?');
            $stmt->execute([(int) $id]);
            $db->commit();
            cj_send_json(['success' => true]);
        }
    }

    if ($resource === 'categories') {
        cj_admin_categories($db, $method, $identifier);
    }
    if ($resource === 'latest-updates') {
        $id = $identifier === null ? null : filter_var($identifier, FILTER_VALIDATE_INT);
        if ($identifier !== null && !$id) {
            cj_send_json(['error' => 'Invalid update id.'], 400);
        }
        cj_admin_latest_updates($db, $method, $id === null ? null : (int) $id);
    }
    cj_send_json(['error' => 'API route not found.'], 404);
}

try {
    $db = cj_db();
    $segments = explode('/', cj_api_route());
    if (($segments[0] ?? '') === 'admin') {
        cj_admin_dispatch($db, $segments);
    }
    if (($segments[0] ?? '') === 'site-content' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        cj_send_json(['data' => cj_public_content($db)]);
    }
    if (($segments[0] ?? '') === 'articles' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        cj_check_rate_limit($db, 'article-search', 90, 60);
        $query = trim((string) ($_GET['q'] ?? ''));
        $category = trim((string) ($_GET['category'] ?? ''));
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 30)));
        $where = " WHERE a.status = 'published' AND a.published_at <= NOW() AND c.is_active = 1";
        $params = [];
        if ($category !== '') {
            $where .= ' AND c.slug = ?';
            $params[] = cj_slug($category, 'Category');
        }
        if ($query !== '') {
            $where .= ' AND (a.title ILIKE ? OR a.short_description ILIKE ? OR a.keywords ILIKE ? OR c.name ILIKE ?)';
            $term = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query) . '%';
            array_push($params, $term, $term, $term, $term);
        }
        $rows = cj_article_rows($db, $where, $params, ' ORDER BY a.is_featured DESC, a.published_at DESC, a.id DESC LIMIT ' . $limit);
        cj_send_json(['data' => array_map('cj_public_article', $rows)]);
    }
    if (($segments[0] ?? '') === 'contact' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        cj_check_rate_limit($db, 'contact-form', 5, 900);
        $input = cj_json_input();
        $name = cj_text($input['name'] ?? '', 120, 'Name', true);
        $email = filter_var(trim((string) ($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $message = cj_text($input['message'] ?? '', 10000, 'Message', true);
        if (!$email) {
            cj_send_json(['error' => 'Enter a valid email address.'], 422);
        }
        $stmt = $db->prepare('INSERT INTO contact_messages (name,email,message) VALUES (?,?,?)');
        $stmt->execute([$name, $email, $message]);
        cj_send_json(['success' => true, 'message' => 'Your message was received.'], 201);
    }
    cj_send_json(['error' => 'API route not found.'], 404);
} catch (Throwable $error) {
    error_log('Cyber Junction API error: ' . $error->getMessage());
    cj_send_json(['error' => 'The service is temporarily unavailable. Check the server configuration and logs.'], 500);
}
