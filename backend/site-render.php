<?php

declare(strict_types=1);

function cj_h(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function cj_site_header(): void
{
    ?>
    <header class="site-header">
      <div class="top-header container">
        <a class="brand" href="/index.html#home">
          <img class="brand-logo" src="/Untitled-1%20copy.jpg" alt="Cyber Junction Logo">
          <div><h1>CYBER <span>JUNCTION</span></h1><p>Latest Government Updates</p></div>
        </a>
        <div class="header-right">
          <div class="header-actions">
            <div class="mini-links"><span>सही जानकारी</span><span>|</span><span>समय पर अपडेट</span><span>|</span><span>आपके लिए</span></div>
          </div>
          <div class="search">
            <input id="searchInput" type="search" placeholder="Search Jobs, Results, Admit Card, Scheme..." aria-label="Search this website" autocomplete="off" aria-controls="searchResults">
            <button id="searchBtn" type="button" aria-label="Search">⌕</button>
          </div>
          <div class="search-results" id="searchResults" role="listbox" aria-live="polite" hidden></div>
        </div>
      </div>
    </header>
    <nav class="main-nav" aria-label="Homepage sections">
      <div class="container nav-inner">
        <div class="nav-primary-links">
          <a href="/index.html#home">Home</a>
          <a href="/index.html#bihar-bhoomi">Bihar Bhoomi</a>
          <a href="/index.html#homeQuickLinks">Quick Links</a>
          <a href="/index.html#homeResultsTitle">Result</a>
        </div>
        <div class="nav-more">
          <button class="nav-more-toggle" type="button" aria-label="More sections" aria-expanded="false" aria-controls="navMoreLinks">
            <span></span><span></span><span></span>
          </button>
          <div class="nav-more-menu" id="navMoreLinks" hidden>
            <a href="/index.html#homeAdmitTitle">Admit Card</a>
            <a href="/index.html#homeJobsTitle">Latest Job</a>
            <a href="/index.html#homeScholarshipTitle">Scholarships</a>
            <a href="/index.html#homeAnswerKeyTitle">Answer Key</a>
            <a href="/index.html#homeSyllabusTitle">Syllabus</a>
            <a href="/index.html#homeAdmissionTitle">Admission</a>
            <a href="/index.html#homeCertificateTitle">Certificate</a>
            <a href="/index.html#homeOfflineOutsourcingJobTitle">Offline/Outsourcing Job</a>
            <a href="/index.html#homeImportantTitle">Important</a>
          </div>
        </div>
      </div>
    </nav>
    <?php
}

function cj_site_footer(): void
{
    ?>
    <footer class="footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <img class="brand-logo" src="/Untitled-1%20copy.jpg" alt="Cyber Junction Logo">
          <div><h2>CYBER JUNCTION</h2><p>Latest Government Updates</p></div>
        </div>
        <div class="footer-quick-links-column">
          <h3>Quick Links</h3>
          <a href="/index.html#home">Home</a>
          <a href="/index.html#bihar-bhoomi">Bihar Bhoomi Services</a>
          <a href="/index.html#homeQuickLinks">Important Updates</a>
          <a href="/about-us/">About Us</a>
          <a href="/contact-us/">Contact Us</a>
          <a href="/terms-and-conditions/">Terms &amp; Conditions</a>
          <a href="/privacy-policy/">Privacy Policy</a>
        </div>
        <div class="footer-important-pages-column">
          <h3>Important Pages</h3>
          <a href="/index.html#homeResultsTitle">Results</a>
          <a href="/index.html#homeAdmitTitle">Admit Card</a>
          <a href="/index.html#homeJobsTitle">Latest Jobs</a>
          <a href="/index.html#homeScholarshipTitle">Scholarships</a>
          <a href="/index.html#homeAnswerKeyTitle">Answer Key</a>
          <a href="/index.html#homeSyllabusTitle">Syllabus</a>
          <a href="/index.html#homeAdmissionTitle">Admission</a>
          <a href="/index.html#homeCertificateTitle">Certificate</a>
          <a href="/index.html#homeOfflineOutsourcingJobTitle">Offline/Outsourcing Jobs</a>
          <a href="/index.html#homeImportantTitle">Important</a>
        </div>
        <div class="footer-social-column">
          <h3>Follow Us</h3>
          <div class="footer-socials">
            <a class="social-link facebook" href="https://www.facebook.com/share/19aoTGscrA/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.8l.4-3.2h-3.2V7.3c0-.9.3-1.6 1.7-1.6H17V2.7c-.4-.1-1.6-.2-3-.2-3 0-5 1.8-5 5.2v2.9H6.5V14h2.5v8h4.5z"/></svg></a>
            <a class="social-link youtube" href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 7.2a3.1 3.1 0 0 0-2.2-2.2C19.4 4.5 12 4.5 12 4.5s-7.4 0-9.3.5A3.1 3.1 0 0 0 .5 7.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 4.8 3.1 3.1 0 0 0 2.2 2.2c1.9.5 9.3.5 9.3.5s7.4 0 9.3-.5a3.1 3.1 0 0 0 2.2-2.2A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-4.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg></a>
            <a class="social-link x" href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2h3.4l-7.5 8.6L23 22h-6.8l-5.3-7.4L4.7 22H1.3l8-9.2L1 2h7l4.8 6.8L18.9 2zm-1.2 18h1.9L7.2 3.9H5.2L17.7 20z"/></svg></a>
            <a class="social-link instagram" href="https://www.instagram.com/mr__abhi_612?stkn=MWVkcnE3Y3R4ZmV3MQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.4A5.6 5.6 0 1 1 6.4 13 5.6 5.6 0 0 1 12 7.4zm0 2A3.6 3.6 0 1 0 15.6 13 3.6 3.6 0 0 0 12 9.4zm5.8-3.3a1.3 1.3 0 1 1-1.3-1.3 1.3 1.3 0 0 1 1.3 1.3z"/></svg></a>
            <a class="social-link email" href="mailto:akr325f@gmail.com" aria-label="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11zm2 .3 7 5.2 7-5.2H5zm14.5 2.2-6.8 5.1a1 1 0 0 1-1.4 0L4.5 9v8.5c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5V9z"/></svg></a>
          </div>
        </div>
        <div class="footer-subscribe-column"><h3>Subscribe for Updates</h3><form class="subscribe"><input type="email" name="email" placeholder="Enter your email" aria-label="Email for updates" autocomplete="email" required><button type="submit">Subscribe</button></form><p class="subscribe-result" role="status" aria-live="polite"></p></div>
      </div>
      <div class="copyright"><div class="container"><span>© <?= date('Y') ?> Cyber Junction. All Rights Reserved.</span><span>Designed for a better tomorrow</span></div></div>
    </footer>
    <button id="topBtn" type="button" aria-label="Back to top" title="Back to top">↑</button>
    <script src="/site-shell.js" defer></script>
    <script src="/navigation.js?v=20261024-customer-data" defer></script>
    <script src="/newsletter.js?v=20261024-customer-data" defer></script>
    <?php
}

function cj_render_text(string $text): void
{
    $paragraphs = preg_split('/\R\s*\R/u', trim($text)) ?: [];
    foreach ($paragraphs as $paragraph) {
        if (trim($paragraph) !== '') {
            echo '<p>' . nl2br(cj_h(trim($paragraph)), false) . '</p>';
        }
    }
}

function cj_render_list(array $items): void
{
    if (!$items) {
        return;
    }
    echo '<ul>';
    foreach ($items as $item) {
        echo '<li>' . cj_h($item) . '</li>';
    }
    echo '</ul>';
}

function cj_render_table(array $rows): void
{
    if (!$rows) {
        return;
    }
    echo '<div class="article-table-wrap"><table><tbody>';
    foreach ($rows as $row) {
        echo '<tr><th scope="row">' . cj_h($row['label'] ?? '') . '</th><td>' . cj_h($row['value'] ?? '') . '</td></tr>';
    }
    echo '</tbody></table></div>';
}

function cj_render_article_card(array $article): void
{
    ?>
    <article class="public-article-card">
      <?php if ($article['featured_image'] !== ''): ?>
        <a class="public-card-image" href="/<?= cj_h(rawurlencode($article['slug'])) ?>/"><img src="<?= cj_h($article['featured_image']) ?>" alt="" loading="lazy"></a>
      <?php endif; ?>
      <div class="public-card-copy">
        <span class="category"><?= cj_h($article['category_name']) ?></span>
        <h2><a href="/<?= cj_h(rawurlencode($article['slug'])) ?>/"><?= cj_h($article['title']) ?></a></h2>
        <?php if ($article['short_description'] !== ''): ?><p><?= cj_h($article['short_description']) ?></p><?php endif; ?>
        <small><?= cj_h(cj_format_date($article['published_at'])) ?><?php if ($article['author_name'] !== ''): ?> · <?= cj_h($article['author_name']) ?><?php endif; ?></small>
      </div>
    </article>
    <?php
}
