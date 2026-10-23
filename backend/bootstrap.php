<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
date_default_timezone_set(cj_config()['timezone']);

function cj_db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = cj_config();
    if ($config['db_user'] === '' || $config['app_key'] === '' || strlen($config['app_key']) < 32
        || ($config['admin_setup_key'] !== '' && strlen($config['admin_setup_key']) < 32)) {
        throw new RuntimeException('Configure CJ_DB_USER, a CJ_APP_KEY, and (if enabled) a CJ_ADMIN_SETUP_KEY with at least 32 characters.');
    }
    if (!in_array($config['db_driver'], ['mysql', 'pgsql'], true)) {
        throw new RuntimeException('CJ_DB_DRIVER must be mysql or pgsql.');
    }
    $dsn = $config['db_driver'] === 'mysql'
        ? sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['db_host'],
            $config['db_port'],
            $config['db_name']
        )
        : sprintf(
            'pgsql:host=%s;port=%s;dbname=%s;sslmode=require',
            $config['db_host'],
            $config['db_port'],
            $config['db_name']
        );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $timezone = new DateTimeZone($config['timezone']);
    $offset = (new DateTimeImmutable('now', $timezone))->format('P');
    if ($config['db_driver'] === 'mysql') {
        $pdo->exec('SET time_zone = ' . $pdo->quote($offset));
    } else {
        $pdo->exec('SET TIME ZONE ' . $pdo->quote($offset));
    }
    return $pdo;
}

function cj_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('cj_admin_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

function cj_send_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function cj_json_input(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || strlen($raw) > 2_000_000) {
        cj_send_json(['error' => 'Request body is too large.'], 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        cj_send_json(['error' => 'A valid JSON request body is required.'], 400);
    }
    return $data;
}

function cj_require_method(string ...$methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        cj_send_json(['error' => 'Method not allowed.'], 405);
    }
}

function cj_require_admin(): int
{
    cj_start_session();
    $adminId = filter_var($_SESSION['admin_id'] ?? null, FILTER_VALIDATE_INT);
    $lastActivity = (int) ($_SESSION['last_activity'] ?? 0);
    if (!$adminId || time() - $lastActivity > 1800) {
        $_SESSION = [];
        session_regenerate_id(true);
        cj_send_json(['error' => 'Authentication required.'], 401);
    }
    $_SESSION['last_activity'] = time();
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD', 'OPTIONS'], true)) {
        $token = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if (!hash_equals((string) $_SESSION['csrf_token'], $token)) {
            cj_send_json(['error' => 'Invalid or missing CSRF token.'], 403);
        }
    }
    return (int) $adminId;
}

function cj_text(mixed $value, int $maxLength, string $field, bool $required = false): string
{
    if (!is_string($value) && !is_numeric($value)) {
        if ($required) {
            cj_send_json(['error' => "$field is required."], 422);
        }
        return '';
    }
    $value = trim((string) $value);
    if ($required && $value === '') {
        cj_send_json(['error' => "$field is required."], 422);
    }
    if (mb_strlen($value) > $maxLength) {
        cj_send_json(['error' => "$field is too long."], 422);
    }
    return $value;
}

function cj_bool(mixed $value, string $field, bool $default = false): bool
{
    if ($value === null) {
        return $default;
    }
    if (is_bool($value)) {
        return $value;
    }
    if ($value === 1 || $value === '1' || $value === 'true') {
        return true;
    }
    if ($value === 0 || $value === '0' || $value === 'false') {
        return false;
    }
    cj_send_json(['error' => "$field must be true or false."], 422);
}

function cj_integer_range(mixed $value, string $field, int $default = 0, int $minimum = 0, int $maximum = 10000): int
{
    if ($value === null || $value === '') {
        return $default;
    }
    $number = filter_var($value, FILTER_VALIDATE_INT);
    if ($number === false || $number < $minimum || $number > $maximum) {
        cj_send_json(['error' => "$field must be between $minimum and $maximum."], 422);
    }
    return $number;
}

function cj_slug(mixed $value, string $field = 'Slug'): string
{
    if (!is_string($value)) {
        cj_send_json(['error' => "$field is invalid."], 422);
    }
    $slug = strtolower(trim((string) $value));
    if ($slug === '' || strlen($slug) > 180 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        cj_send_json(['error' => "$field must use lowercase letters, numbers, and single hyphens."], 422);
    }
    return $slug;
}

function cj_safe_url(mixed $value, string $field, bool $required = false): string
{
    if ($value !== null && !is_string($value)) {
        cj_send_json(['error' => "$field is invalid."], 422);
    }
    $url = trim((string) ($value ?? ''));
    if ($url === '' && !$required) {
        return '';
    }
    if ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL)
        || !in_array(strtolower((string) parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true)
        || parse_url($url, PHP_URL_USER) !== null
        || parse_url($url, PHP_URL_PASS) !== null
        || strlen($url) > 2048)) {
        cj_send_json(['error' => "$field must be a valid HTTP or HTTPS URL."], 422);
    }
    return $url;
}

function cj_datetime(mixed $value, string $field): ?string
{
    if ($value !== null && !is_string($value)) {
        cj_send_json(['error' => "$field must be a valid date and time."], 422);
    }
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $value);
    if (!$date) {
        $date = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value);
    }
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] || $errors['error_count']))) {
        cj_send_json(['error' => "$field must be a valid date and time."], 422);
    }
    return $date->format('Y-m-d H:i:s');
}

function cj_parse_rows(mixed $value, int $maxRows = 100): array
{
    if (!is_string($value) || trim($value) === '') {
        return [];
    }
    $rows = [];
    foreach (preg_split('/\R/u', $value) ?: [] as $line) {
        $parts = array_map('trim', explode('|', $line, 2));
        if (count($parts) === 2 && $parts[0] !== '' && $parts[1] !== '') {
            $rows[] = ['label' => mb_substr($parts[0], 0, 180), 'value' => mb_substr($parts[1], 0, 1000)];
        }
        if (count($rows) >= $maxRows) {
            break;
        }
    }
    return $rows;
}

function cj_parse_list(mixed $value, int $maxItems = 100): array
{
    if (!is_string($value) || trim($value) === '') {
        return [];
    }
    return array_slice(array_values(array_filter(array_map(
        static fn (string $item): string => mb_substr(trim($item), 0, 1000),
        preg_split('/\R/u', $value) ?: []
    ), static fn (string $item): bool => $item !== '')), 0, $maxItems);
}

function cj_parse_faqs(mixed $value): array
{
    if (!is_string($value) || trim($value) === '') {
        return [];
    }
    $faqs = [];
    foreach (preg_split('/\R/u', $value) ?: [] as $line) {
        $parts = array_map('trim', explode('|', $line, 2));
        if (count($parts) === 2 && $parts[0] !== '' && $parts[1] !== '') {
            $faqs[] = ['question' => mb_substr($parts[0], 0, 500), 'answer' => mb_substr($parts[1], 0, 3000)];
        }
        if (count($faqs) >= 100) {
            break;
        }
    }
    return $faqs;
}

function cj_date_for_input(?string $value): string
{
    if (!$value) {
        return '';
    }
    return (new DateTimeImmutable($value))->format('Y-m-d\TH:i');
}

function cj_format_date(?string $value): string
{
    if (!$value) {
        return '';
    }
    return (new DateTimeImmutable($value))->format('d M Y');
}

function cj_public_url(string $path = ''): string
{
    return cj_config()['base_url'] . '/' . ltrim($path, '/');
}

function cj_public_article(array $row): array
{
    $sections = json_decode((string) ($row['sections'] ?? '{}'), true);
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'slug' => $row['slug'],
        'url' => cj_public_url($row['slug'] . '/'),
        'category' => $row['category_name'] ?? $row['category_slug'],
        'categorySlug' => $row['category_slug'],
        'shortDescription' => $row['short_description'],
        'metaDescription' => $row['meta_description'],
        'keywords' => $row['keywords'],
        'featuredImage' => $row['featured_image'],
        'authorName' => $row['author_name'],
        'status' => $row['status'],
        'isFeatured' => (bool) $row['is_featured'],
        'publishedAt' => $row['published_at'],
        'updatedAt' => $row['updated_at'],
        'mainContent' => $row['main_content'],
        'importantNotice' => $row['important_notice'],
        'sections' => is_array($sections) ? $sections : [],
        'officialNotificationUrl' => $row['official_notification_url'],
        'applyOnlineUrl' => $row['apply_online_url'],
        'officialWebsiteUrl' => $row['official_website_url'],
        'createdAt' => $row['created_at'],
        'changedAt' => $row['changed_at'],
    ];
}

function cj_article_select_sql(): string
{
    return 'SELECT a.*, c.name AS category_name FROM articles a JOIN categories c ON c.slug = a.category_slug';
}

function cj_public_article_query(PDO $db, string $slug): ?array
{
    $stmt = $db->prepare(cj_article_select_sql() . " WHERE a.slug = ? AND a.status = 'published' AND a.published_at <= NOW() AND c.is_active=1 LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function cj_client_ip_hash(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash_hmac('sha256', $ip, cj_config()['app_key']);
}

function cj_check_rate_limit(PDO $db, string $route, int $maximum, int $windowSeconds): void
{
    $route = preg_replace('/[^a-z0-9_-]/i', '', $route) ?: 'public';
    $windowSeconds = max(1, min(86400, $windowSeconds));
    if (cj_is_mysql($db)) {
        $sql = "INSERT INTO api_rate_limits (ip_hash,route_name,request_count,window_started_at)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                  request_count = IF(window_started_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL {$windowSeconds} SECOND), 1, request_count + 1),
                  window_started_at = IF(window_started_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL {$windowSeconds} SECOND), CURRENT_TIMESTAMP, window_started_at)";
    } else {
        $sql = "INSERT INTO api_rate_limits (ip_hash,route_name,request_count,window_started_at)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (ip_hash,route_name) DO UPDATE SET
                  request_count = CASE
                    WHEN api_rate_limits.window_started_at < CURRENT_TIMESTAMP - INTERVAL '$windowSeconds seconds' THEN 1
                    ELSE api_rate_limits.request_count + 1
                  END,
                  window_started_at = CASE
                    WHEN api_rate_limits.window_started_at < CURRENT_TIMESTAMP - INTERVAL '$windowSeconds seconds' THEN CURRENT_TIMESTAMP
                    ELSE api_rate_limits.window_started_at
                  END";
    }
    $stmt = $db->prepare($sql);
    $stmt->execute([cj_client_ip_hash(), $route]);
    $stmt = $db->prepare('SELECT request_count FROM api_rate_limits WHERE ip_hash=? AND route_name=?');
    $stmt->execute([cj_client_ip_hash(), $route]);
    if ((int) $stmt->fetchColumn() > $maximum) {
        cj_send_json(['error' => 'Too many requests. Try again later.'], 429);
    }
}

function cj_is_mysql(PDO $db): bool
{
    return $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
}

function cj_admin_count(PDO $db): int
{
    return (int) $db->query('SELECT COUNT(*) FROM admins')->fetchColumn();
}

function cj_normalize_article(array $input): array
{
    $status = $input['status'] ?? 'draft';
    if (!in_array($status, ['draft', 'published', 'unpublished'], true)) {
        cj_send_json(['error' => 'Choose a valid publication status.'], 422);
    }
    $sections = [
        'overview' => cj_parse_rows($input['overview'] ?? ''),
        'important_dates' => cj_parse_rows($input['importantDates'] ?? ''),
        'vacancy_details' => cj_parse_rows($input['vacancyDetails'] ?? ''),
        'application_fee' => cj_parse_rows($input['applicationFee'] ?? ''),
        'educational_qualification' => cj_text($input['educationalQualification'] ?? '', 20000, 'Educational qualification'),
        'age_limit' => cj_text($input['ageLimit'] ?? '', 10000, 'Age limit'),
        'salary_details' => cj_text($input['salaryDetails'] ?? '', 10000, 'Salary details'),
        'selection_process' => cj_parse_list($input['selectionProcess'] ?? ''),
        'how_to_apply' => cj_parse_list($input['howToApply'] ?? ''),
        'required_documents' => cj_parse_list($input['requiredDocuments'] ?? ''),
        'faqs' => cj_parse_faqs($input['faqs'] ?? ''),
        'disclaimer' => cj_text($input['disclaimer'] ?? '', 5000, 'Disclaimer'),
    ];
    $slug = cj_slug($input['slug'] ?? '');
    if (in_array($slug, ['admin', 'api', 'backend', 'category', 'customer-portal', 'cyber-help'], true)) {
        cj_send_json(['error' => 'That slug is reserved for a website route.'], 422);
    }
    return [
        'title' => cj_text($input['title'] ?? '', 300, 'Article title', true),
        'slug' => $slug,
        'category_slug' => cj_slug($input['categorySlug'] ?? '', 'Category'),
        'short_description' => cj_text($input['shortDescription'] ?? '', 500, 'Short description'),
        'meta_description' => cj_text($input['metaDescription'] ?? '', 320, 'Meta description'),
        'keywords' => cj_text($input['keywords'] ?? '', 500, 'Keywords'),
        'featured_image' => cj_safe_url($input['featuredImage'] ?? '', 'Featured image'),
        'author_name' => cj_text($input['authorName'] ?? 'Cyber Junction Team', 120, 'Author name') ?: 'Cyber Junction Team',
        'status' => $status,
        'is_featured' => cj_bool($input['isFeatured'] ?? null, 'Featured status') ? 1 : 0,
        'published_at' => cj_datetime($input['publishedAt'] ?? '', 'Published date'),
        'updated_at' => cj_datetime($input['updatedAt'] ?? '', 'Last updated date'),
        'main_content' => cj_text($input['mainContent'] ?? '', 100000, 'Main article content'),
        'important_notice' => cj_text($input['importantNotice'] ?? '', 5000, 'Important notice'),
        'sections' => json_encode($sections, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        'official_notification_url' => cj_safe_url($input['officialNotificationUrl'] ?? '', 'Official notification URL'),
        'apply_online_url' => cj_safe_url($input['applyOnlineUrl'] ?? '', 'Apply online URL'),
        'official_website_url' => cj_safe_url($input['officialWebsiteUrl'] ?? '', 'Official website URL'),
    ];
}
