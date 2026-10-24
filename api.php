<?php

declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

try {
    require_once __DIR__ . '/backend/bootstrap.php';
    require_once __DIR__ . '/backend/homepage-defaults.php';
} catch (Throwable $error) {
    error_log('Cyber Junction API bootstrap error: ' . $error->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'The service is temporarily unavailable. Check the server configuration and logs.']);
    exit;
}

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
                'bihar', 'career', 'education', 'other-updates', 'latest-updates',
            ], true),
        ];
    }
    $articleRows = cj_article_rows(
        $db,
        " WHERE a.status = 'published' AND a.published_at <= NOW() AND c.is_active = 1",
        [],
        ' ORDER BY a.is_featured DESC, a.published_at DESC, a.id DESC LIMIT 500'
    );
    $items = [];
    $byCategory = [];
    $homeArticles = array_fill_keys(array_keys(cj_home_tab_definitions()), []);
    $categoryHomeTabs = [];
    $tabRows = $db->query(
        'SELECT cht.category_slug, cht.tab_slug
         FROM category_home_tabs AS cht
         JOIN categories AS c ON c.slug = cht.category_slug
         WHERE c.is_active = 1
         ORDER BY cht.tab_slug, c.sort_order, c.name'
    )->fetchAll();
    foreach ($tabRows as $tabRow) {
        $categoryHomeTabs[$tabRow['category_slug']][] = $tabRow['tab_slug'];
    }
    foreach ($articleRows as $row) {
        $article = cj_public_article($row);
        $item = [
            'articleId' => $article['id'],
            'title' => $article['title'],
            'url' => '/' . rawurlencode($row['slug']) . '/',
            'displayDate' => cj_format_date($row['published_at']),
            'description' => $article['shortDescription'],
            'keywords' => $article['keywords'],
            'isArticle' => true,
        ];
        $byCategory[$row['category_slug']][] = $item;
        $articleTabs = $categoryHomeTabs[$row['category_slug']] ?? [];
        if (array_key_exists($row['category_slug'], $homeArticles)
            && !in_array($row['category_slug'], $articleTabs, true)) {
            $articleTabs[] = $row['category_slug'];
        }
        foreach ($articleTabs as $tabSlug) {
            $homeArticles[$tabSlug][] = $item;
        }
    }
    foreach ($homeArticles as $tabSlug => $tabItems) {
        $homeArticles[$tabSlug] = array_slice($tabItems, 0, 30);
    }
    foreach ($byCategory as $categorySlug => $categoryItems) {
        if ($categorySlug === 'latest-updates') {
            continue;
        }
        $items = array_merge($items, array_map(
            static fn (array $item): array => ['categoryId' => $categorySlug] + $item,
            array_slice($categoryItems, 0, 30)
        ));
    }

    $settings = cj_homepage_settings($db);
    $quickLinks = $db->query(
        "SELECT title, url, bg_color AS \"bgColor\", text_color AS \"textColor\"
         FROM quick_links WHERE is_active = 1 ORDER BY position_order, id LIMIT 8"
    )->fetchAll();
    $settings['homeLayout']['quickLinks'] = $quickLinks;
    return [
        'categories' => $categories,
        'items' => $items,
        'homeArticles' => $homeArticles,
        'homeTabs' => cj_home_tab_definitions(),
        'pages' => [],
        'settings' => $settings,
    ];
}

function cj_homepage_settings(PDO $db): array
{
    $stored = $db->query('SELECT content FROM homepage_settings WHERE id = 1')->fetchColumn();
    if ($stored === false) {
        return cj_homepage_defaults();
    }
    $content = json_decode((string) $stored, true);
    if (!is_array($content)) {
        throw new RuntimeException('Stored homepage settings are invalid JSON.');
    }
    $defaults = cj_homepage_defaults();
    foreach ($defaults as $key => $default) {
        if (!array_key_exists($key, $content)) {
            $content[$key] = $default;
        }
    }
    if (!is_array($content['homeLayout'] ?? null)) {
        $content['homeLayout'] = $defaults['homeLayout'];
    } else {
        foreach ($defaults['homeLayout'] as $key => $default) {
            if (!array_key_exists($key, $content['homeLayout'])) {
                $content['homeLayout'][$key] = $default;
            }
        }
        foreach (['titles', 'useCustomLists', 'columns', 'moduleOrder', 'moduleVisibility'] as $section) {
            if (!is_array($content['homeLayout'][$section] ?? null)) {
                $content['homeLayout'][$section] = $defaults['homeLayout'][$section];
            }
            foreach ($defaults['homeLayout'][$section] as $key => $default) {
                if (!array_key_exists($key, $content['homeLayout'][$section])) {
                    $content['homeLayout'][$section][$key] = $default;
                }
            }
        }
    }
    if (isset($content['branding']) && is_array($content['branding'])) {
        unset($content['branding']['loginLabel'], $content['branding']['loginUrl']);
    }
    if (isset($content['hero']) && is_array($content['hero'])) {
        unset($content['hero']['loginLabel']);
    }
    unset($content['aadhaarServices'], $content['promos']);
    foreach (['footer' => 'quickLinks', 'navigation' => 'moreLinks'] as $section => $field) {
        if (!isset($content[$section][$field]) || !is_array($content[$section][$field])) {
            continue;
        }
        $content[$section][$field] = array_values(array_filter(
            $content[$section][$field],
            static function (mixed $item): bool {
                if (!is_array($item)) {
                    return true;
                }
                $title = strtolower(trim((string) ($item['title'] ?? '')));
                $url = trim((string) ($item['url'] ?? ''));
                return $title !== 'customer login'
                    && !preg_match('~^/customer-portal(?:/|$)~i', $url);
            }
        ));
    }
    return $content;
}

function cj_validate_homepage_value(mixed $value, int $depth = 0): mixed
{
    if ($depth > 12) {
        cj_send_json(['error' => 'Homepage content is nested too deeply.'], 422);
    }
    if (is_string($value)) {
        if (strlen($value) > 10000 || !mb_check_encoding($value, 'UTF-8')) {
            cj_send_json(['error' => 'Homepage text must be valid UTF-8 and no longer than 10,000 bytes per field.'], 422);
        }
        return $value;
    }
    if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
        return $value;
    }
    if (!is_array($value) || count($value) > 500) {
        cj_send_json(['error' => 'Homepage content contains an unsupported value or too many items.'], 422);
    }
    $validated = [];
    foreach ($value as $key => $item) {
        if (is_string($key) && (
            strlen($key) > 80
            || !preg_match('/^[A-Za-z0-9_-]+$/', $key)
            || in_array($key, ['__proto__', 'prototype', 'constructor'], true)
        )) {
            cj_send_json(['error' => 'Homepage content contains an invalid field name.'], 422);
        }
        $validated[$key] = cj_validate_homepage_value($item, $depth + 1);
    }
    return $validated;
}

function cj_admin_homepage(PDO $db, string $method): never
{
    cj_require_admin();
    if ($method === 'GET') {
        cj_send_json(['data' => cj_homepage_settings($db)]);
    }
    if ($method === 'PUT') {
        $input = cj_json_input();
        if (!isset($input['content']) || !is_array($input['content'])) {
            cj_send_json(['error' => 'Homepage content must be a JSON object.'], 422);
        }
        $content = cj_validate_homepage_value($input['content']);
        try {
            $encoded = json_encode($content, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (JsonException $error) {
            cj_send_json(['error' => 'Homepage content could not be encoded.'], 422);
        }
        if (strlen($encoded) > 1000000) {
            cj_send_json(['error' => 'Homepage content must be no larger than 1 MB.'], 422);
        }
        $sql = cj_is_mysql($db)
            ? 'INSERT INTO homepage_settings (id, content) VALUES (1, ?)
               ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = CURRENT_TIMESTAMP'
            : 'INSERT INTO homepage_settings (id, content) VALUES (1, CAST(? AS JSONB))
               ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP';
        $stmt = $db->prepare($sql);
        $stmt->execute([$encoded]);
        cj_send_json(['data' => $content]);
    }
    cj_send_json(['error' => 'Method not allowed.'], 405);
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
    $sql = cj_is_mysql($db)
        ? 'SELECT COUNT(*) FROM admin_login_attempts
           WHERE ip_hash = ? AND succeeded = 0 AND attempted_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)'
        : 'SELECT COUNT(*) FROM admin_login_attempts
           WHERE ip_hash = ? AND succeeded = 0 AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL \'15 minutes\'';
    $stmt = $db->prepare($sql);
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
    $cleanupSql = cj_is_mysql($db)
        ? 'DELETE FROM admin_login_attempts WHERE attempted_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY)'
        : "DELETE FROM admin_login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '2 days'";
    $db->exec($cleanupSql);
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
        $operator = cj_is_mysql($db) ? 'LIKE' : 'ILIKE';
        $where[] = "(a.title {$operator} ? OR a.short_description {$operator} ? OR a.keywords {$operator} ?)";
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

function cj_notify_new_publication(PDO $db, array $article): array
{
    try {
        $subscribers = $db->query(
            'SELECT email FROM newsletter_subscribers ORDER BY id LIMIT 5001'
        )->fetchAll(PDO::FETCH_COLUMN);
        if (!$subscribers) {
            return ['status' => 'skipped', 'message' => 'No email subscribers yet.'];
        }
        if (count($subscribers) > 5000) {
            error_log('Article email notification skipped: subscriber count exceeds the 5000-recipient batch limit.');
            return ['status' => 'failed', 'message' => 'There are too many subscribers for one notification batch.'];
        }

        $config = cj_config();
        if ($config['email_notifier_url'] === '' || $config['email_notifier_token'] === '') {
            error_log('Article email notification is not configured.');
            return ['status' => 'failed', 'message' => 'Email notifications are not configured on the server.'];
        }
        $notifierUrl = $config['email_notifier_url'];
        if (!preg_match('~^https?://~i', $notifierUrl)) {
            $notifierUrl = 'https://' . $notifierUrl;
        }
        $notifierParts = parse_url($notifierUrl);
        if (!is_array($notifierParts)
            || !in_array(strtolower((string) ($notifierParts['scheme'] ?? '')), ['http', 'https'], true)
            || empty($notifierParts['host'])
            || isset($notifierParts['user'])
            || isset($notifierParts['pass'])
            || isset($notifierParts['path'])) {
            error_log('Article email notification URL must be an absolute HTTP or HTTPS service URL.');
            return ['status' => 'failed', 'message' => 'Email notification service URL is invalid.'];
        }

        $payload = json_encode([
            'article' => [
                'title' => $article['title'],
                'category' => $article['category'],
                'description' => $article['shortDescription'],
                'url' => $article['url'],
            ],
            'recipients' => array_values(array_filter($subscribers, static fn ($email): bool => is_string($email))),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($payload)) {
            error_log('Could not encode article email notification payload.');
            return ['status' => 'failed', 'message' => 'Email notification could not be prepared.'];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n"
                    . "Authorization: Bearer {$config['email_notifier_token']}\r\n"
                    . 'Content-Length: ' . strlen($payload) . "\r\n",
                'content' => $payload,
                'timeout' => 45,
                'ignore_errors' => true,
            ],
        ]);
        $response = file_get_contents($notifierUrl . '/internal/article-published', false, $context);
        $statusLine = $http_response_header[0] ?? '';
        if (!is_string($response) || !preg_match('/\s202(?:\s|$)/', $statusLine)) {
            error_log('Article email notification service request failed; HTTP response: ' . ($statusLine ?: 'unavailable'));
            return ['status' => 'failed', 'message' => 'Article published, but email notifications could not be delivered.'];
        }

        $result = json_decode($response, true);
        $sentCount = is_array($result) ? (int) ($result['sentCount'] ?? 0) : 0;
        return ['status' => 'sent', 'sentCount' => $sentCount];
    } catch (Throwable $error) {
        error_log('Article email notification failed: ' . $error->getMessage());
        return ['status' => 'failed', 'message' => 'Article published, but email notifications could not be delivered.'];
    }
}

function cj_admin_save_article(PDO $db, ?int $id): never
{
    cj_require_method($id === null ? 'POST' : 'PUT');
    cj_require_admin();
    $article = cj_admin_article_input(cj_json_input());

    try {
        $db->beginTransaction();
        $oldSlug = null;
        $oldCategorySlug = null;
        $wasPublished = false;
        if ($id !== null) {
            $current = $db->prepare('SELECT slug, category_slug, status FROM articles WHERE id = ? FOR UPDATE');
            $current->execute([$id]);
            $currentArticle = $current->fetch();
            if ($currentArticle === false) {
                $db->rollBack();
                cj_send_json(['error' => 'Article not found.'], 404);
            }
            $oldSlug = $currentArticle['slug'];
            $oldCategorySlug = $currentArticle['category_slug'];
            $wasPublished = $currentArticle['status'] === 'published';
        }
        $category = $db->prepare('SELECT is_active FROM categories WHERE slug = ?');
        $category->execute([$article['category_slug']]);
        $categoryIsActive = $category->fetchColumn();
        if ($categoryIsActive === false
            || (!(bool) $categoryIsActive && $oldCategorySlug !== $article['category_slug'])) {
            $db->rollBack();
            cj_send_json(['error' => 'Choose an active category. Inactive categories can only remain assigned to their existing articles.'], 422);
        }
        if ($id === null) {
            $returning = cj_is_mysql($db) ? '' : ' RETURNING id';
            $sql = 'INSERT INTO articles
                (title, slug, category_slug, short_description, meta_description, keywords, featured_image,
                 author_name, status, is_featured, published_at, updated_at, main_content, important_notice,
                 sections, official_notification_url, apply_online_url, official_website_url)
                VALUES (:title, :slug, :category_slug, :short_description, :meta_description, :keywords, :featured_image,
                 :author_name, :status, :is_featured, :published_at, :updated_at, :main_content, :important_notice,
                 :sections, :official_notification_url, :apply_online_url, :official_website_url)' . $returning;
            $stmt = $db->prepare($sql);
            $stmt->execute($article);
            $id = (int) (cj_is_mysql($db) ? $db->lastInsertId() : $stmt->fetchColumn());
        } else {
            $sql = 'UPDATE articles SET title=:title, slug=:slug, category_slug=:category_slug,
                short_description=:short_description, meta_description=:meta_description, keywords=:keywords,
                featured_image=:featured_image, author_name=:author_name, status=:status, is_featured=:is_featured,
                published_at=:published_at, updated_at=:updated_at, changed_at=CURRENT_TIMESTAMP, main_content=:main_content,
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
                $redirectSql = cj_is_mysql($db)
                    ? 'INSERT INTO article_redirects (old_slug, new_slug) VALUES (?, ?)
                       ON DUPLICATE KEY UPDATE new_slug = VALUES(new_slug)'
                    : 'INSERT INTO article_redirects (old_slug, new_slug) VALUES (?, ?)
                       ON CONFLICT (old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug';
                $redirect = $db->prepare($redirectSql);
                $redirect->execute([$oldSlug, $article['slug']]);
            }
        }
        $db->commit();
        $stmt = $db->prepare(cj_article_select_sql() . ' WHERE a.id = ?');
        $stmt->execute([$id]);
        $savedArticle = $stmt->fetch();
        $publicArticle = cj_public_article($savedArticle);
        $emailNotification = null;
        if (!$wasPublished && $savedArticle['status'] === 'published'
            && $savedArticle['published_at'] !== null
            && new DateTimeImmutable($savedArticle['published_at']) <= new DateTimeImmutable()) {
            $emailNotification = cj_notify_new_publication($db, $publicArticle);
        }
        cj_send_json([
            'data' => $publicArticle,
            'emailNotification' => $emailNotification,
        ], $oldSlug === null ? 201 : 200);
    } catch (PDOException $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        if (in_array($error->getCode(), ['23505', '23000'], true)) {
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
        $tabStmt = $db->query(
            'SELECT category_slug, tab_slug FROM category_home_tabs ORDER BY category_slug, tab_slug'
        );
        $homeTabs = [];
        foreach ($tabStmt->fetchAll() as $tabRow) {
            $homeTabs[$tabRow['category_slug']][] = $tabRow['tab_slug'];
        }
        foreach ($rows as &$row) {
            $row['home_tabs'] = $homeTabs[$row['slug']] ?? [];
        }
        unset($row);
        cj_send_json(['data' => $rows]);
    }
    if ($method === 'POST' && $slug === null) {
        cj_require_admin();
        $data = cj_normalize_category(cj_json_input(), true);
        $homeTabs = $data['home_tabs'];
        unset($data['home_tabs']);
        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO categories (slug,name,icon,color,home_visible,nav_visible,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?)');
            $stmt->execute(array_values($data));
            cj_replace_category_home_tabs($db, $data['slug'], $homeTabs);
            $db->commit();
        } catch (PDOException $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            if (in_array($error->getCode(), ['23505', '23000'], true)) {
                cj_send_json(['error' => 'That category slug already exists.'], 409);
            }
            throw $error;
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
        cj_send_json(['data' => $data + ['home_tabs' => $homeTabs]], 201);
    }
    if ($method === 'PUT' && $slug !== null) {
        cj_require_admin();
        $data = cj_normalize_category(cj_json_input());
        if ($data['slug'] !== cj_slug($slug, 'Category')) {
            cj_send_json(['error' => 'Category slugs cannot be changed after creation.'], 422);
        }
        $db->beginTransaction();
        try {
            $stmt = $db->prepare('UPDATE categories SET name=?,icon=?,color=?,home_visible=?,nav_visible=?,is_active=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE slug=?');
            $stmt->execute([$data['name'], $data['icon'], $data['color'], $data['home_visible'], $data['nav_visible'], $data['is_active'], $data['sort_order'], $slug]);
            if (!$stmt->rowCount() && !cj_category_exists($db, $slug)) {
                $db->rollBack();
                cj_send_json(['error' => 'Category not found.'], 404);
            }
            if (array_key_exists('home_tabs', $data)) {
                cj_replace_category_home_tabs($db, $slug, $data['home_tabs']);
            } else {
                $tabStmt = $db->prepare('SELECT tab_slug FROM category_home_tabs WHERE category_slug=? ORDER BY tab_slug');
                $tabStmt->execute([$slug]);
                $data['home_tabs'] = $tabStmt->fetchAll(PDO::FETCH_COLUMN);
            }
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
        cj_send_json(['data' => $data]);
    }
    cj_send_json(['error' => 'Method not allowed.'], 405);
}

function cj_normalize_category(array $input, bool $newCategory = false): array
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
    $data = [
        'slug' => $slug,
        'name' => cj_text($input['name'] ?? '', 120, 'Category name', true),
        'icon' => cj_text($input['icon'] ?? '', 24, 'Category icon'),
        'color' => $color,
        'home_visible' => cj_bool($input['homeVisible'] ?? null, 'Homepage visibility', true) ? 1 : 0,
        'nav_visible' => cj_bool($input['navVisible'] ?? null, 'Navigation visibility', true) ? 1 : 0,
        'is_active' => cj_bool($input['isActive'] ?? null, 'Active status', true) ? 1 : 0,
        'sort_order' => cj_integer_range($input['sortOrder'] ?? null, 'Category sort order'),
    ];
    if (array_key_exists('homeTabs', $input) || $newCategory) {
        $homeTabs = $input['homeTabs'] ?? ['latest-updates'];
        if (!is_array($homeTabs)) {
            cj_send_json(['error' => 'Choose valid homepage sections for this category.'], 422);
        }
        $allowedTabs = array_keys(cj_home_tab_definitions());
        $validatedTabs = [];
        foreach ($homeTabs as $tab) {
            if (!is_string($tab) || !in_array($tab, $allowedTabs, true)) {
                cj_send_json(['error' => 'Choose valid homepage sections for this category.'], 422);
            }
            if (!in_array($tab, $validatedTabs, true)) {
                $validatedTabs[] = $tab;
            }
        }
        $data['home_tabs'] = $validatedTabs;
    }
    return $data;
}

function cj_replace_category_home_tabs(PDO $db, string $categorySlug, array $homeTabs): void
{
    $delete = $db->prepare('DELETE FROM category_home_tabs WHERE category_slug=?');
    $delete->execute([$categorySlug]);
    if (!$homeTabs) {
        return;
    }
    $insert = $db->prepare('INSERT INTO category_home_tabs (category_slug, tab_slug) VALUES (?,?)');
    foreach ($homeTabs as $tabSlug) {
        $insert->execute([$categorySlug, $tabSlug]);
    }
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
        $sql = 'INSERT INTO latest_updates (title,url,description,display_date,is_published,sort_order) VALUES (?,?,?,?,?,?)';
        if (!cj_is_mysql($db)) {
            $sql .= ' RETURNING id';
        }
        $stmt = $db->prepare($sql);
        $stmt->execute(array_values($data));
        $id = cj_is_mysql($db) ? (int) $db->lastInsertId() : (int) $stmt->fetchColumn();
        cj_send_json(['data' => ['id' => $id] + $data], 201);
    }
    if ($method === 'PUT' && $id !== null) {
        cj_require_admin();
        $data = cj_normalize_latest_update(cj_json_input());
        $stmt = $db->prepare('UPDATE latest_updates SET title=?,url=?,description=?,display_date=?,is_published=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
        $stmt->execute([...array_values($data), $id]);
        if (!$stmt->rowCount() && !cj_latest_update_exists($db, $id)) {
            cj_send_json(['error' => 'Trending job not found.'], 404);
        }
        cj_send_json(['data' => ['id' => $id] + $data]);
    }
    if ($method === 'DELETE' && $id !== null) {
        cj_require_admin();
        $stmt = $db->prepare('DELETE FROM latest_updates WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->rowCount()) {
            cj_send_json(['error' => 'Trending job not found.'], 404);
        }
        cj_send_json(['success' => true]);
    }
    cj_send_json(['error' => 'Method not allowed.'], 405);
}

function cj_admin_quick_links(PDO $db, string $method, ?string $identifier): never
{
    if ($method === 'GET' && $identifier === null) {
        cj_require_admin();
        $rows = $db->query('SELECT * FROM quick_links ORDER BY position_order, id')->fetchAll();
        cj_send_json(['data' => $rows]);
    }
    if ($method === 'POST' && $identifier === null) {
        cj_require_admin();
        $data = cj_normalize_quick_link(cj_json_input());
        $db->beginTransaction();
        try {
            if ($data['is_active']) {
                cj_lock_quick_link_capacity($db);
                cj_check_quick_link_capacity($db);
            }
            $sql = 'INSERT INTO quick_links (title,url,bg_color,text_color,position_order,is_active)
                    VALUES (?,?,?,?,?,?)';
            if (!cj_is_mysql($db)) {
                $sql .= ' RETURNING id';
            }
            $stmt = $db->prepare($sql);
            $stmt->execute(array_values($data));
            $id = cj_is_mysql($db) ? (int) $db->lastInsertId() : (int) $stmt->fetchColumn();
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
        cj_send_json(['data' => ['id' => $id] + $data], 201);
    }
    if ($method === 'PUT' && $identifier === 'order') {
        cj_require_admin();
        $input = cj_json_input();
        $ids = $input['ids'] ?? null;
        if (!is_array($ids) || count($ids) > 500) {
            cj_send_json(['error' => 'Quick link order must be a list of link IDs.'], 422);
        }
        $ids = array_map(
            static fn (mixed $id): int|false => filter_var($id, FILTER_VALIDATE_INT),
            $ids
        );
        if (in_array(false, $ids, true) || count(array_unique($ids)) !== count($ids)) {
            cj_send_json(['error' => 'Quick link order contains invalid or duplicate IDs.'], 422);
        }
        $currentIds = array_map(
            'intval',
            $db->query('SELECT id FROM quick_links ORDER BY position_order, id')->fetchAll(PDO::FETCH_COLUMN)
        );
        $sortedIds = $ids;
        $sortedCurrentIds = $currentIds;
        sort($sortedIds);
        sort($sortedCurrentIds);
        if ($sortedIds !== $sortedCurrentIds) {
            cj_send_json(['error' => 'Quick link order must include every existing link exactly once.'], 409);
        }
        $db->beginTransaction();
        try {
            $stmt = $db->prepare('UPDATE quick_links SET position_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            foreach ($ids as $position => $id) {
                $stmt->execute([$position, $id]);
            }
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
        cj_send_json(['success' => true]);
    }
    if ($method === 'PUT' && $identifier !== null) {
        cj_require_admin();
        $id = filter_var($identifier, FILTER_VALIDATE_INT);
        if (!$id) {
            cj_send_json(['error' => 'Invalid quick link ID.'], 400);
        }
        $data = cj_normalize_quick_link(cj_json_input());
        $db->beginTransaction();
        try {
            if ($data['is_active']) {
                cj_lock_quick_link_capacity($db);
                cj_check_quick_link_capacity($db, (int) $id);
            }
            $stmt = $db->prepare(
                'UPDATE quick_links SET title=?,url=?,bg_color=?,text_color=?,position_order=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
            );
            $stmt->execute([...array_values($data), $id]);
            if (!$stmt->rowCount() && !cj_quick_link_exists($db, (int) $id)) {
                $db->rollBack();
                cj_send_json(['error' => 'Quick link not found.'], 404);
            }
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
        cj_send_json(['data' => ['id' => (int) $id] + $data]);
    }
    if ($method === 'DELETE' && $identifier !== null) {
        cj_require_admin();
        $id = filter_var($identifier, FILTER_VALIDATE_INT);
        if (!$id) {
            cj_send_json(['error' => 'Invalid quick link ID.'], 400);
        }
        $stmt = $db->prepare('DELETE FROM quick_links WHERE id = ?');
        $stmt->execute([(int) $id]);
        if (!$stmt->rowCount()) {
            cj_send_json(['error' => 'Quick link not found.'], 404);
        }
        cj_send_json(['success' => true]);
    }
    cj_send_json(['error' => 'Method not allowed.'], 405);
}

function cj_normalize_quick_link(array $input): array
{
    if (isset($input['url']) && !is_string($input['url'])) {
        cj_send_json(['error' => 'Link URL is invalid.'], 422);
    }
    $url = trim((string) ($input['url'] ?? ''));
    if (str_starts_with($url, '/')) {
        if (!preg_match('~^/(?!/)[a-zA-Z0-9/_-]*(?:\?[^#\s]*)?(?:#[a-zA-Z0-9_-]*)?$~', $url)) {
            cj_send_json(['error' => 'Enter a valid internal path or HTTPS URL.'], 422);
        }
    } elseif (preg_match('/^mailto:/i', $url)) {
        if (!preg_match('/^mailto:[^\s]+$/i', $url) || !filter_var(substr($url, 7), FILTER_VALIDATE_EMAIL)) {
            cj_send_json(['error' => 'Enter a valid internal path or HTTPS URL.'], 422);
        }
    } elseif (!preg_match('/^#[a-z0-9_-]+$/i', $url)) {
        if (!preg_match('~^https://~i', $url)) {
            cj_send_json(['error' => 'Enter a valid internal path or HTTPS URL.'], 422);
        }
        $url = cj_safe_url($url, 'Link URL');
    }
    $bgColor = $input['bgColor'] ?? 'blue';
    $textColor = $input['textColor'] ?? 'white';
    if (!in_array($bgColor, ['olive', 'blue', 'orange', 'darkred', 'red', 'green', 'pink', 'royalblue', 'purple', 'teal', 'slate'], true)) {
        cj_send_json(['error' => 'Choose a supported background color.'], 422);
    }
    if (!in_array($textColor, ['white', 'dark'], true)) {
        cj_send_json(['error' => 'Choose a supported text color.'], 422);
    }
    return [
        'title' => cj_text($input['title'] ?? '', 300, 'Link title', true),
        'url' => $url,
        'bg_color' => $bgColor,
        'text_color' => $textColor,
        'position_order' => cj_integer_range($input['positionOrder'] ?? null, 'Position order'),
        'is_active' => cj_bool($input['isActive'] ?? null, 'Active status', true) ? 1 : 0,
    ];
}

function cj_quick_link_exists(PDO $db, int $id): bool
{
    $stmt = $db->prepare('SELECT 1 FROM quick_links WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetchColumn() !== false;
}

function cj_lock_quick_link_capacity(PDO $db): void
{
    if (cj_is_mysql($db)) {
        $locked = (int) $db->query("SELECT GET_LOCK('cj_quick_links_active_limit', 5)")->fetchColumn();
        if ($locked !== 1) {
            throw new RuntimeException('Could not lock homepage quick-link capacity.');
        }
        return;
    }
    $db->query("SELECT pg_advisory_xact_lock(hashtext('cj_quick_links_active_limit'))");
}

function cj_check_quick_link_capacity(PDO $db, ?int $excludeId = null): void
{
    $sql = 'SELECT COUNT(*) FROM quick_links WHERE is_active = 1';
    $params = [];
    if ($excludeId !== null) {
        $sql .= ' AND id <> ?';
        $params[] = $excludeId;
    }
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    if ((int) $stmt->fetchColumn() >= 8) {
        cj_send_json(['error' => 'Only 8 quick links can be active. Hide another link before activating this one.'], 422);
    }
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
        $setupLock = cj_is_mysql($db)
            ? (int) $db->query("SELECT GET_LOCK('cj_admin_setup', 0)")->fetchColumn()
            : (int) $db->query("SELECT CASE WHEN pg_try_advisory_lock(hashtext('cj_admin_setup')) THEN 1 ELSE 0 END")->fetchColumn();
        if ($setupLock !== 1) {
            cj_send_json(['error' => 'Administrator setup is busy. Try again shortly.'], 503);
        }
        if (cj_admin_count($db) !== 0) {
            cj_is_mysql($db)
                ? $db->query("SELECT RELEASE_LOCK('cj_admin_setup')")
                : $db->query("SELECT pg_advisory_unlock(hashtext('cj_admin_setup'))");
            cj_send_json(['error' => 'Initial administrator setup is already closed.'], 409);
        }
        try {
            $stmt = $db->prepare('INSERT INTO admins (email,password_hash) VALUES (?,?)');
            $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT)]);
        } finally {
            cj_is_mysql($db)
                ? $db->query("SELECT RELEASE_LOCK('cj_admin_setup')")
                : $db->query("SELECT pg_advisory_unlock(hashtext('cj_admin_setup'))");
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
    if ($resource === 'homepage' && $identifier === null) {
        cj_admin_homepage($db, $method);
    }
    if ($resource === 'quick-links') {
        cj_admin_quick_links($db, $method, $identifier);
    }
    if ($resource === 'latest-updates') {
        $id = $identifier === null ? null : filter_var($identifier, FILTER_VALIDATE_INT);
        if ($identifier !== null && !$id) {
            cj_send_json(['error' => 'Invalid update id.'], 400);
        }
        cj_admin_latest_updates($db, $method, $id === null ? null : (int) $id);
    }
    if ($resource === 'customer-data') {
        cj_require_admin();
        $id = isset($segments[3]) ? filter_var($segments[3], FILTER_VALIDATE_INT) : null;
        if ($method === 'GET' && $identifier === 'contacts') {
            $contacts = $db->query(
                'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC, id DESC LIMIT 500'
            )->fetchAll();
            cj_send_json(['data' => $contacts]);
        }
        if ($method === 'GET' && $identifier === 'subscribers') {
            $subscribers = $db->query(
                'SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC, id DESC LIMIT 500'
            )->fetchAll();
            cj_send_json(['data' => $subscribers]);
        }
        if ($method === 'DELETE' && in_array($identifier, ['contacts', 'subscribers'], true) && $id) {
            $table = $identifier === 'contacts' ? 'contact_messages' : 'newsletter_subscribers';
            $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
            $stmt->execute([(int) $id]);
            if ($stmt->rowCount() === 0) {
                cj_send_json(['error' => 'Customer record not found.'], 404);
            }
            cj_send_json(['success' => true]);
        }
        cj_send_json(['error' => 'Customer data route not found.'], 404);
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
            $operator = cj_is_mysql($db) ? 'LIKE' : 'ILIKE';
            $where .= " AND (a.title {$operator} ? OR a.short_description {$operator} ? OR a.keywords {$operator} ? OR c.name {$operator} ?)";
            $term = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query) . '%';
            array_push($params, $term, $term, $term, $term);
        }
        $rows = cj_article_rows($db, $where, $params, ' ORDER BY a.is_featured DESC, a.published_at DESC, a.id DESC LIMIT ' . $limit);
        cj_send_json(['data' => array_map('cj_public_article', $rows)]);
    }
    if (($segments[0] ?? '') === 'subscribe' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        cj_check_rate_limit($db, 'newsletter-subscribe', 5, 900);
        $input = cj_json_input();
        $email = filter_var(strtolower(trim((string) ($input['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
        if (!$email || strlen($email) > 254) {
            cj_send_json(['error' => 'Enter a valid email address.'], 422);
        }
        if (cj_is_mysql($db)) {
            $stmt = $db->prepare('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)');
        } else {
            $stmt = $db->prepare('INSERT INTO newsletter_subscribers (email) VALUES (?) ON CONFLICT (email) DO NOTHING');
        }
        $stmt->execute([$email]);
        cj_send_json(['success' => true, 'message' => 'Thanks for subscribing!']);
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
