<?php

declare(strict_types=1);

function cj_config(): array
{
    static $config;
    if (isset($config)) {
        return $config;
    }

    $localPath = __DIR__ . '/config.local.php';
    $local = is_file($localPath) ? require $localPath : [];
    $local = is_array($local) ? $local : [];
    $read = static function (string $key, string $env, string $fallback = '') use ($local): string {
        $value = getenv($env);
        return $value !== false ? (string) $value : (string) ($local[$key] ?? $fallback);
    };

    $baseUrl = rtrim($read('base_url', 'CJ_BASE_URL', 'http://localhost:5000'), '/');
    $baseScheme = strtolower((string) parse_url($baseUrl, PHP_URL_SCHEME));
    if (!filter_var($baseUrl, FILTER_VALIDATE_URL)
        || !in_array($baseScheme, ['http', 'https'], true)
        || parse_url($baseUrl, PHP_URL_USER) !== null
        || parse_url($baseUrl, PHP_URL_PASS) !== null) {
        throw new RuntimeException('CJ_BASE_URL must be an absolute HTTP or HTTPS URL without credentials.');
    }

    $config = [
        'db_driver' => strtolower($read('db_driver', 'CJ_DB_DRIVER', 'pgsql')),
        'db_host' => $read('db_host', 'CJ_DB_HOST', '127.0.0.1'),
        'db_port' => $read('db_port', 'CJ_DB_PORT', '5432'),
        'db_name' => $read('db_name', 'CJ_DB_NAME', 'postgres'),
        'db_user' => $read('db_user', 'CJ_DB_USER'),
        'db_password' => $read('db_password', 'CJ_DB_PASSWORD'),
        'app_key' => $read('app_key', 'CJ_APP_KEY'),
        'admin_setup_key' => $read('admin_setup_key', 'CJ_ADMIN_SETUP_KEY'),
        'email_notifier_url' => rtrim($read('email_notifier_url', 'CJ_EMAIL_NOTIFIER_URL'), '/'),
        'email_notifier_token' => $read('email_notifier_token', 'CJ_EMAIL_NOTIFIER_TOKEN'),
        'base_url' => $baseUrl,
        'timezone' => $read('timezone', 'CJ_TIMEZONE', 'Asia/Kolkata'),
    ];

    return $config;
}
