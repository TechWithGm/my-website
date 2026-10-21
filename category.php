<?php

declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';
require_once __DIR__ . '/backend/site-render.php';

date_default_timezone_set(cj_config()['timezone']);
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'");

try {
    $db = cj_db();
    $categories = $db->query('SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order,name')->fetchAll();
    $slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        http_response_code(404);
        $category = null;
    } else {
        $stmt = $db->prepare('SELECT * FROM categories WHERE slug=? AND is_active=1 LIMIT 1');
        $stmt->execute([$slug]);
        $category = $stmt->fetch() ?: null;
        if (!$category) {
            http_response_code(404);
        }
    }
    $page = max(1, min(10000, (int) ($_GET['page'] ?? 1)));
    $perPage = 24;
    $total = 0;
    $articles = [];
    if ($category) {
        $count = $db->prepare("SELECT COUNT(*) FROM articles WHERE category_slug=? AND status='published' AND published_at<=NOW()");
        $count->execute([$slug]);
        $total = (int) $count->fetchColumn();
        $stmt = $db->prepare(
            cj_article_select_sql() . " WHERE a.category_slug=? AND a.status='published' AND a.published_at<=NOW()
             AND c.is_active=1 ORDER BY a.is_featured DESC,a.published_at DESC,a.id DESC LIMIT $perPage OFFSET " . (($page - 1) * $perPage)
        );
        $stmt->execute([$slug]);
        $articles = $stmt->fetchAll();
    }
    $title = $category ? $category['name'] . ' Articles | Cyber Junction' : 'Category Not Found | Cyber Junction';
    $description = $category ? 'Latest published ' . $category['name'] . ' updates from Cyber Junction.' : 'The requested category could not be found.';
    $canonical = cj_public_url('category/' . rawurlencode($slug) . '/');
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="<?= cj_h($description) ?>">
      <meta name="robots" content="<?= $category ? 'index,follow' : 'noindex,follow' ?>">
      <link rel="canonical" href="<?= cj_h($canonical) ?>">
      <meta property="og:site_name" content="Cyber Junction"><meta property="og:title" content="<?= cj_h($title) ?>">
      <meta property="og:description" content="<?= cj_h($description) ?>"><meta property="og:url" content="<?= cj_h($canonical) ?>">
      <title><?= cj_h($title) ?></title>
      <link rel="icon" type="image/svg+xml" href="/customer-portal/cyber-help.svg">
      <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/article-page.css">
    </head>
    <body>
      <?php cj_site_header($categories); ?>
      <main class="public-page">
        <nav class="public-breadcrumb" aria-label="Breadcrumb"><a href="/index.html#home">Home</a> / <?= cj_h($category['name'] ?? 'Category not found') ?></nav>
        <?php if (!$category): ?>
          <section class="article-body not-found-card"><h1>404</h1><h2>Category not found</h2><p>This category is unavailable or has been removed.</p><a href="/index.html#home">Back to Cyber Junction</a></section>
        <?php else: ?>
          <header class="category-page-header"><span class="article-category"><?= cj_h($category['name']) ?></span><h1><?= cj_h($category['name']) ?></h1><p><?= cj_h($description) ?></p></header>
          <?php if ($articles): ?><div class="public-article-grid"><?php foreach ($articles as $article) { cj_render_article_card($article); } ?></div>
          <?php else: ?><section class="article-body not-found-card"><h2>No published articles yet</h2><p>New updates in this category will appear here.</p></section><?php endif; ?>
          <?php if ($total > $perPage): ?><nav class="category-pagination" aria-label="Category pages">
            <?php if ($page > 1): ?><a href="?page=<?= $page - 1 ?>">← Newer</a><?php endif; ?>
            <span>Page <?= $page ?> of <?= (int) ceil($total / $perPage) ?></span>
            <?php if ($page * $perPage < $total): ?><a href="?page=<?= $page + 1 ?>">Older →</a><?php endif; ?>
          </nav><?php endif; ?>
        <?php endif; ?>
      </main>
      <?php cj_site_footer(); ?>
    </body>
    </html>
    <?php
} catch (Throwable $error) {
    error_log('Cyber Junction category page error: ' . $error->getMessage());
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Category service is temporarily unavailable. Check database configuration and server logs.';
}
