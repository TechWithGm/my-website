<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$uriPath = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$uriPath = '/' . ltrim($uriPath, '/');

if (preg_match('#^/backend(?:/|$)#i', $uriPath)) {
    http_response_code(404);
    exit;
}

if (preg_match('#^/api(?:/(.*))?/?$#', $uriPath, $matches)) {
    $_GET['path'] = trim((string) ($matches[1] ?? ''), '/');
    require $root . '/api.php';
    exit;
}

if ($uriPath === '/admin' || $uriPath === '/admin/') {
    require $root . '/admin/index.php';
    exit;
}

if (preg_match('#^/scholar/?$#i', $uriPath)) {
    $_GET['slug'] = 'scholarship';
    require $root . '/category.php';
    exit;
}

if (preg_match('#^/category/([a-z0-9-]+)/?$#i', $uriPath, $matches)) {
    $_GET['slug'] = strtolower($matches[1]);
    require $root . '/category.php';
    exit;
}

if ($uriPath === '/sitemap.xml') {
    require $root . '/sitemap.php';
    exit;
}

$relativePath = ltrim($uriPath, '/');
$candidate = realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
$rootPath = realpath($root);
if ($candidate && $rootPath && str_starts_with(strtolower($candidate), strtolower($rootPath . DIRECTORY_SEPARATOR)) && is_dir($candidate)) {
    return false;
}
if ($candidate && $rootPath && str_starts_with(strtolower($candidate), strtolower($rootPath . DIRECTORY_SEPARATOR)) && is_file($candidate)) {
    return false;
}

if (preg_match('#^/([a-z0-9][a-z0-9-]*)/?$#i', $uriPath, $matches)) {
    $_GET['slug'] = strtolower($matches[1]);
    require $root . '/article.php';
    exit;
}

return false;
