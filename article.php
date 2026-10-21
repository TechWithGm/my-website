<?php

declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';
require_once __DIR__ . '/backend/site-render.php';

date_default_timezone_set(cj_config()['timezone']);
$nonce = base64_encode(random_bytes(18));
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self' 'nonce-$nonce'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'");

function cj_article_not_found(PDO $db, array $categories = []): never
{
    http_response_code(404);
    header('Cache-Control: no-store');
    $title = 'Page Not Found | Cyber Junction';
    $description = 'The requested article could not be found.';
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="robots" content="noindex,follow"><title><?= cj_h($title) ?></title>
      <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/article-page.css">
    </head>
    <body>
      <?php cj_site_header($categories); ?>
      <main class="public-page">
        <nav class="public-breadcrumb"><a href="/index.html#home">Home</a> / Page not found</nav>
        <section class="article-body not-found-card"><h1>404</h1><h2>Article not found</h2><p><?= cj_h($description) ?></p><a href="/index.html#home">Back to Cyber Junction</a></section>
      </main>
      <?php cj_site_footer(); ?>
    </body>
    </html>
    <?php
    exit;
}

try {
    date_default_timezone_set(cj_config()['timezone']);
    $db = cj_db();
    $categories = $db->query('SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order,name')->fetchAll();
    $slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        cj_article_not_found($db, $categories);
    }

    $articleRow = cj_public_article_query($db, $slug);
    if (!$articleRow) {
        $redirect = $db->prepare('SELECT new_slug FROM article_redirects WHERE old_slug=? LIMIT 1');
        $redirect->execute([$slug]);
        $newSlug = $redirect->fetchColumn();
        if ($newSlug !== false && $newSlug !== '' && $newSlug !== $slug) {
            header('Location: ' . cj_public_url(rawurlencode($newSlug) . '/'), true, 301);
            exit;
        }
        cj_article_not_found($db, $categories);
    }

    $article = cj_public_article($articleRow);
    $sections = $article['sections'];
    $description = $article['metaDescription'] ?: $article['shortDescription'] ?: $article['title'];
    $canonical = cj_public_url(rawurlencode($article['slug']) . '/');
    $publishedDate = $article['publishedAt'] ? (new DateTimeImmutable($article['publishedAt']))->format(DATE_ATOM) : null;
    $updatedDate = $article['updatedAt'] ? (new DateTimeImmutable($article['updatedAt']))->format(DATE_ATOM) : null;
    $structuredData = [
        '@context' => 'https://schema.org',
        '@type' => 'Article',
        'headline' => $article['title'],
        'description' => $description,
        'mainEntityOfPage' => $canonical,
        'author' => ['@type' => 'Person', 'name' => $article['authorName']],
        'publisher' => ['@type' => 'Organization', 'name' => 'Cyber Junction'],
    ];
    if ($publishedDate) {
        $structuredData['datePublished'] = $publishedDate;
    }
    if ($updatedDate) {
        $structuredData['dateModified'] = $updatedDate;
    }
    if ($article['featuredImage']) {
        $structuredData['image'] = $article['featuredImage'];
    }
    $faqItems = $sections['faqs'] ?? [];
    $faqStructuredData = null;
    if ($faqItems) {
        $faqStructuredData = [
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => array_map(static fn (array $faq): array => [
                '@type' => 'Question',
                'name' => $faq['question'],
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq['answer']],
            ], $faqItems),
        ];
    }

    $toc = [];
    $sectionDefinitions = [
        'overview' => ['Recruitment Overview', $sections['overview'] ?? []],
        'main-content' => ['About This Recruitment', $article['mainContent']],
        'dates' => ['Important Dates', $sections['important_dates'] ?? []],
        'vacancy' => ['Vacancy Details', $sections['vacancy_details'] ?? []],
        'fee' => ['Application Fee', $sections['application_fee'] ?? []],
        'eligibility' => ['Educational Qualification', $sections['educational_qualification'] ?? ''],
        'age' => ['Age Limit', $sections['age_limit'] ?? ''],
        'salary' => ['Salary Details', $sections['salary_details'] ?? ''],
        'selection' => ['Selection Process', $sections['selection_process'] ?? []],
        'apply' => ['How to Apply', $sections['how_to_apply'] ?? []],
        'documents' => ['Required Documents', $sections['required_documents'] ?? []],
        'links' => ['Important Links', array_filter([
            $article['officialNotificationUrl'], $article['applyOnlineUrl'], $article['officialWebsiteUrl'],
        ])],
        'faqs' => ['FAQs', $faqItems],
    ];
    foreach ($sectionDefinitions as $id => [$label, $content]) {
        if (!empty($content)) {
            $toc[$id] = $label;
        }
    }

    $relatedStmt = $db->prepare(
        cj_article_select_sql() . " WHERE a.status='published' AND a.published_at<=NOW()
         AND c.is_active=1 AND a.category_slug=? AND a.id<>?
         ORDER BY a.is_featured DESC,a.published_at DESC,a.id DESC LIMIT 4"
    );
    $relatedStmt->execute([$article['categorySlug'], $article['id']]);
    $related = $relatedStmt->fetchAll();
    if (count($related) < 3) {
        $relatedIds = array_map(static fn (array $row): int => (int) $row['id'], $related);
        $relatedIds[] = $article['id'];
        $placeholders = implode(',', array_fill(0, count($relatedIds), '?'));
        $extra = $db->prepare(
            cj_article_select_sql() . " WHERE a.status='published' AND a.published_at<=NOW()
             AND c.is_active=1 AND a.id NOT IN ($placeholders)
             ORDER BY a.is_featured DESC,a.published_at DESC,a.id DESC LIMIT " . (4 - count($related))
        );
        $extra->execute($relatedIds);
        $related = array_merge($related, $extra->fetchAll());
    }

    $newerStmt = $db->prepare(
        cj_article_select_sql() . " WHERE a.status='published' AND a.published_at<=NOW() AND c.is_active=1
         AND (a.published_at>? OR (a.published_at=? AND a.id>?))
         ORDER BY a.published_at ASC,a.id ASC LIMIT 1"
    );
    $newerStmt->execute([$article['publishedAt'], $article['publishedAt'], $article['id']]);
    $newer = $newerStmt->fetch() ?: null;
    $olderStmt = $db->prepare(
        cj_article_select_sql() . " WHERE a.status='published' AND a.published_at<=NOW() AND c.is_active=1
         AND (a.published_at<? OR (a.published_at=? AND a.id<?))
         ORDER BY a.published_at DESC,a.id DESC LIMIT 1"
    );
    $olderStmt->execute([$article['publishedAt'], $article['publishedAt'], $article['id']]);
    $older = $olderStmt->fetch() ?: null;
    $latest = $db->query(
        "SELECT a.slug,a.title,c.name AS category_name FROM articles a
         JOIN categories c ON c.slug=a.category_slug
         WHERE a.status='published' AND a.published_at<=NOW() AND c.is_active=1
         ORDER BY a.published_at DESC,a.id DESC LIMIT 6"
    )->fetchAll();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="<?= cj_h($description) ?>">
      <meta name="robots" content="index,follow,max-image-preview:large">
      <link rel="canonical" href="<?= cj_h($canonical) ?>">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="Cyber Junction">
      <meta property="og:title" content="<?= cj_h($article['title']) ?>">
      <meta property="og:description" content="<?= cj_h($description) ?>">
      <meta property="og:url" content="<?= cj_h($canonical) ?>">
      <?php if ($article['featuredImage']): ?><meta property="og:image" content="<?= cj_h($article['featuredImage']) ?>"><?php endif; ?>
      <title><?= cj_h($article['title']) ?> | Cyber Junction</title>
      <link rel="icon" type="image/svg+xml" href="/customer-portal/cyber-help.svg">
      <link rel="stylesheet" href="/style.css">
      <link rel="stylesheet" href="/article-page.css">
      <script type="application/ld+json" nonce="<?= cj_h($nonce) ?>"><?= json_encode($structuredData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
      <?php if ($faqStructuredData): ?><script type="application/ld+json" nonce="<?= cj_h($nonce) ?>"><?= json_encode($faqStructuredData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script><?php endif; ?>
    </head>
    <body>
      <?php cj_site_header($categories); ?>
      <main class="public-page">
        <nav class="public-breadcrumb" aria-label="Breadcrumb"><a href="/index.html#home">Home</a> / <a href="/category/<?= cj_h(rawurlencode($article['categorySlug'])) ?>/"><?= cj_h($article['category']) ?></a> / <?= cj_h($article['title']) ?></nav>
        <div class="article-layout">
          <article class="article-body">
            <span class="article-category"><?= cj_h($article['category']) ?></span>
            <h1 class="article-title"><?= cj_h($article['title']) ?></h1>
            <div class="article-meta">
              <?php if ($article['publishedAt']): ?><span>Published: <?= cj_h(cj_format_date($article['publishedAt'])) ?></span><?php endif; ?>
              <?php if ($article['updatedAt']): ?><span>Last updated: <?= cj_h(cj_format_date($article['updatedAt'])) ?></span><?php endif; ?>
            </div>
            <?php if ($article['authorName'] !== ''): ?>
              <div class="article-byline"><span class="article-author-icon" aria-hidden="true"><?= cj_h(mb_strtoupper(mb_substr($article['authorName'], 0, 1))) ?></span><div><strong><?= cj_h($article['authorName']) ?></strong><small>Cyber Junction · Government and Education Updates</small></div></div>
            <?php endif; ?>
            <?php if ($article['featuredImage']): ?><img class="article-featured-image" src="<?= cj_h($article['featuredImage']) ?>" alt="<?= cj_h($article['title']) ?>" fetchpriority="high"><?php endif; ?>
            <?php if ($article['shortDescription'] !== ''): ?><p class="article-intro"><?= cj_h($article['shortDescription']) ?></p><?php endif; ?>
            <?php if ($article['importantNotice'] !== ''): ?><aside class="article-notice"><strong>Important Notice:</strong> <?= nl2br(cj_h($article['importantNotice']), false) ?></aside><?php endif; ?>
            <?php if ($toc): ?>
              <nav class="article-toc" aria-label="Table of contents"><h2>Table of Contents</h2><ol>
                <?php foreach ($toc as $id => $label): ?><li><a href="#<?= cj_h($id) ?>"><?= cj_h($label) ?></a></li><?php endforeach; ?>
              </ol></nav>
            <?php endif; ?>

            <?php if (!empty($sections['overview'])): ?><section class="article-section" id="overview"><h2>Recruitment Overview</h2><?php cj_render_table($sections['overview']); ?></section><?php endif; ?>
            <?php if ($article['mainContent'] !== ''): ?><section class="article-section" id="main-content"><h2>About This Recruitment</h2><?php cj_render_text($article['mainContent']); ?></section><?php endif; ?>
            <?php if (!empty($sections['important_dates'])): ?><section class="article-section" id="dates"><h2>Important Dates</h2><?php cj_render_table($sections['important_dates']); ?></section><?php endif; ?>
            <?php if (!empty($sections['vacancy_details'])): ?><section class="article-section" id="vacancy"><h2>Vacancy Details</h2><?php cj_render_table($sections['vacancy_details']); ?></section><?php endif; ?>
            <?php if (!empty($sections['application_fee'])): ?><section class="article-section" id="fee"><h2>Application Fee</h2><?php cj_render_table($sections['application_fee']); ?></section><?php endif; ?>
            <?php if (!empty($sections['educational_qualification'])): ?><section class="article-section" id="eligibility"><h2>Educational Qualification</h2><?php cj_render_text($sections['educational_qualification']); ?></section><?php endif; ?>
            <?php if (!empty($sections['age_limit'])): ?><section class="article-section" id="age"><h2>Age Limit</h2><?php cj_render_text($sections['age_limit']); ?></section><?php endif; ?>
            <?php if (!empty($sections['salary_details'])): ?><section class="article-section" id="salary"><h2>Salary Details</h2><?php cj_render_text($sections['salary_details']); ?></section><?php endif; ?>
            <?php if (!empty($sections['selection_process'])): ?><section class="article-section" id="selection"><h2>Selection Process</h2><?php cj_render_list($sections['selection_process']); ?></section><?php endif; ?>
            <?php if (!empty($sections['how_to_apply'])): ?><section class="article-section" id="apply"><h2>How to Apply</h2><?php cj_render_list($sections['how_to_apply']); ?></section><?php endif; ?>
            <?php if (!empty($sections['required_documents'])): ?><section class="article-section" id="documents"><h2>Required Documents</h2><?php cj_render_list($sections['required_documents']); ?></section><?php endif; ?>
            <?php
              $officialLinks = array_filter([
                  'Official Notification' => $article['officialNotificationUrl'],
                  'Apply Online' => $article['applyOnlineUrl'],
                  'Official Website' => $article['officialWebsiteUrl'],
              ]);
            ?>
            <?php if ($officialLinks): ?><section class="article-section" id="links"><h2>Important Links</h2><div class="article-links">
              <?php foreach ($officialLinks as $label => $url): ?><a href="<?= cj_h($url) ?>" target="_blank" rel="noopener noreferrer"><?= cj_h($label) ?><span>Visit ↗</span></a><?php endforeach; ?>
            </div></section><?php endif; ?>
            <?php if ($faqItems): ?><section class="article-section article-faq" id="faqs"><h2>Frequently Asked Questions</h2>
              <?php foreach ($faqItems as $faq): ?><details><summary><?= cj_h($faq['question'] ?? '') ?></summary><p><?= nl2br(cj_h($faq['answer'] ?? ''), false) ?></p></details><?php endforeach; ?>
            </section><?php endif; ?>
            <?php if (!empty($sections['disclaimer'])): ?><aside class="article-disclaimer"><strong>Disclaimer:</strong> <?= nl2br(cj_h($sections['disclaimer']), false) ?></aside>
            <?php else: ?><aside class="article-disclaimer"><strong>Disclaimer:</strong> Cyber Junction is an independent information portal and is not a government website. Verify all dates, eligibility, fees and instructions in the official notification before applying.</aside><?php endif; ?>

            <?php if ($newer || $older): ?><nav class="article-pagination" aria-label="Previous and next articles">
              <?php if ($older): ?><a href="/<?= cj_h(rawurlencode($older['slug'])) ?>/"><small>Previous article</small><strong><?= cj_h($older['title']) ?></strong></a><?php else: ?><span></span><?php endif; ?>
              <?php if ($newer): ?><a href="/<?= cj_h(rawurlencode($newer['slug'])) ?>/"><small>Next article</small><strong><?= cj_h($newer['title']) ?></strong></a><?php endif; ?>
            </nav><?php endif; ?>

            <?php if ($related): ?><section class="article-related"><h2>Related Articles</h2><div class="public-article-grid"><?php foreach ($related as $row) { cj_render_article_card($row); } ?></div></section><?php endif; ?>
          </article>
          <aside class="article-sidebar">
            <section class="public-aside-card"><h2>Latest Updates</h2>
              <?php foreach ($latest as $item): ?><a href="/<?= cj_h(rawurlencode($item['slug'])) ?>/"><?= cj_h($item['title']) ?></a><?php endforeach; ?>
              <?php if (!$latest): ?><p class="muted">No published updates yet.</p><?php endif; ?>
            </section>
            <section class="public-aside-card"><h2>Quick Navigation</h2>
              <a href="/category/<?= cj_h(rawurlencode($article['categorySlug'])) ?>/">More in <?= cj_h($article['category']) ?></a>
              <a href="/index.html#home">Cyber Junction Home</a>
            </section>
          </aside>
        </div>
      </main>
      <?php cj_site_footer(); ?>
    </body>
    </html>
    <?php
} catch (Throwable $error) {
    error_log('Cyber Junction article page error: ' . $error->getMessage());
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Article service is temporarily unavailable. Check database configuration and server logs.';
}
