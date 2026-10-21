<?php

declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';

try {
    $db = cj_db();
    $articles = $db->query(
        "SELECT a.slug, COALESCE(a.updated_at, a.published_at) AS modified_at
         FROM articles a JOIN categories c ON c.slug=a.category_slug
         WHERE a.status='published' AND a.published_at<=NOW() AND c.is_active=1
         ORDER BY a.published_at DESC"
    )->fetchAll();
    $categories = $db->query(
        "SELECT DISTINCT c.slug FROM categories c JOIN articles a ON a.category_slug=c.slug
         WHERE c.is_active=1 AND a.status='published' AND a.published_at<=NOW() ORDER BY c.slug"
    )->fetchAll();
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=1800');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    echo '<url><loc>' . htmlspecialchars(cj_public_url('index.html'), ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc></url>' . "\n";
    foreach ($categories as $category) {
        echo '<url><loc>' . htmlspecialchars(cj_public_url('category/' . rawurlencode($category['slug']) . '/'), ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc></url>' . "\n";
    }
    foreach ($articles as $article) {
        echo '<url><loc>' . htmlspecialchars(cj_public_url(rawurlencode($article['slug']) . '/'), ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>';
        if ($article['modified_at']) {
            echo '<lastmod>' . htmlspecialchars((new DateTimeImmutable($article['modified_at']))->format(DATE_ATOM), ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</lastmod>';
        }
        echo "</url>\n";
    }
    echo "</urlset>\n";
} catch (Throwable $error) {
    error_log('Cyber Junction sitemap error: ' . $error->getMessage());
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Sitemap is temporarily unavailable.';
}
