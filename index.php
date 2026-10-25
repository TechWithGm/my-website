<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'");
header('Cache-Control: no-store');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Admin Dashboard | Cyber Junction</title>
  <link rel="stylesheet" href="/admin/admin.css">
  <script src="/admin/admin.js" defer></script>
</head>
<body>
  <main class="admin-shell">
    <section class="auth-card" id="authPanel" aria-labelledby="adminTitle">
      <a class="admin-brand" href="/">CYBER <span>JUNCTION</span></a>
      <p class="eyebrow">CYBER JUNCTION · CONTROL PANEL</p>
      <h1 id="adminTitle">Admin sign in</h1>
      <p class="muted">Sign in to manage your website, homepage content, articles and updates.</p>
      <form id="loginForm" class="stack-form">
        <label>Email<input name="email" type="email" autocomplete="username" required maxlength="254"></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="200"></label>
        <button class="primary-button" type="submit">Sign in</button>
      </form>
      <section id="setupPanel" class="setup-panel" hidden>
        <h2>First-time administrator setup</h2>
        <p>Enter the one-time setup key configured on the server and choose a strong password.</p>
        <form id="setupForm" class="stack-form">
          <label>Setup key<input name="setupKey" type="password" autocomplete="off" required></label>
          <label>Administrator email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <label>Password (12 characters minimum)<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="200"></label>
          <button class="secondary-button" type="submit">Create administrator</button>
        </form>
      </section>
      <p class="notice" id="authMessage" role="status" aria-live="polite"></p>
      <a class="back-link" href="/">← Back to Cyber Junction</a>
    </section>

    <section class="dashboard" id="dashboard" hidden>
      <header class="dashboard-header">
        <a class="admin-brand" href="/">CYBER <span>JUNCTION</span></a>
        <div><span id="signedInAs"></span><button class="quiet-button" id="logoutButton" type="button">Sign out</button></div>
      </header>
      <nav class="dashboard-nav" aria-label="Admin sections">
        <button class="tab-button active" type="button" data-panel="articlesPanel">Articles</button>
        <button class="tab-button" type="button" data-panel="quickLinksPanel">Quick Links</button>
        <button class="tab-button" type="button" data-panel="updatesPanel">Trending Jobs</button>
        <button class="tab-button" type="button" data-panel="categoriesPanel">Categories</button>
        <button class="tab-button" type="button" data-panel="homepagePanel">Homepage</button>
        <button class="tab-button" type="button" data-panel="customerDataPanel">Customer Data</button>
      </nav>
      <p class="notice" id="dashboardMessage" role="status" aria-live="polite"></p>

      <section class="manager-panel" id="articlesPanel">
        <div class="panel-heading">
          <div><p class="eyebrow">PUBLISHING</p><h1>Articles</h1></div>
          <button class="primary-button" id="newArticleButton" type="button">＋ New article</button>
        </div>
        <div class="filters">
          <label class="search-field">Search title<input id="articleQuery" type="search" placeholder="Search articles"></label>
          <label>Category<select id="articleCategoryFilter"><option value="">All categories</option></select></label>
          <label>Status<select id="articleStatusFilter"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="unpublished">Unpublished</option></select></label>
        </div>
        <div class="table-scroll">
          <table><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody id="articleRows"></tbody></table>
        </div>
        <p class="empty-state" id="articleEmpty" hidden>No articles match these filters.</p>
      </section>

      <section class="manager-panel" id="quickLinksPanel" hidden>
        <div class="panel-heading">
          <div><p class="eyebrow">HOMEPAGE BUTTON GRID</p><h1>Quick Links</h1></div>
          <div class="panel-actions">
            <button class="secondary-button" id="manageQuickLinkArticlesButton" type="button">Manage articles</button>
            <button class="primary-button" id="newQuickLinkButton" type="button">＋ New quick link</button>
          </div>
        </div>
        <p class="muted">Manage up to 8 active colorful buttons at the top of the homepage. Choose a managed article to fill its title and URL, or keep a custom link. Use Manage articles to edit any article.</p>
        <div class="table-scroll">
          <table><thead><tr><th>Button</th><th>URL</th><th>Visibility</th><th>Order</th><th>Actions</th></tr></thead><tbody id="quickLinkRows"></tbody></table>
        </div>
        <p class="empty-state" id="quickLinkEmpty" hidden>No quick links yet. Add a link to show a button on the homepage.</p>
        <form class="editor-card compact-form" id="quickLinkForm" hidden>
          <h2 id="quickLinkFormTitle">Add quick link</h2>
          <input name="id" type="hidden">
          <div class="form-grid">
            <label class="wide">Button text<input name="title" required maxlength="300"></label>
            <label class="wide">Link to managed article<select name="articleId"><option value="">Choose an article or keep a custom URL</option></select></label>
            <label class="wide">Link URL (internal path or HTTPS URL)<input name="url" type="text" required maxlength="2048" placeholder="/jobs/ or https://example.com"></label>
            <label>Background color<select name="bgColor"><option value="olive">Olive</option><option value="blue" selected>Blue</option><option value="orange">Orange</option><option value="darkred">Dark red</option><option value="red">Bright red</option><option value="green">Green</option><option value="pink">Pink</option><option value="royalblue">Royal blue</option><option value="purple">Purple</option><option value="teal">Teal</option><option value="slate">Slate</option></select></label>
            <label>Text color<select name="textColor"><option value="white" selected>White</option><option value="dark">Dark</option></select></label>
            <label>Display order<input name="positionOrder" type="number" min="0" value="0"></label>
            <label class="check-label"><input name="isActive" type="checkbox" checked> Active on homepage</label>
          </div>
          <div class="form-actions"><button class="primary-button" type="submit">Save quick link</button><button class="quiet-button" id="cancelQuickLinkButton" type="button">Cancel</button></div>
        </form>
      </section>

      <section class="manager-panel" id="updatesPanel" hidden>
        <div class="panel-heading">
          <div><p class="eyebrow">HOMEPAGE SIDEBAR</p><h1>Trending Jobs</h1></div>
          <button class="primary-button" id="newUpdateButton" type="button">＋ New update</button>
        </div>
        <p class="muted">If no manual updates are published, the latest published articles appear here automatically.</p>
        <div class="table-scroll">
          <table><thead><tr><th>Title</th><th>Display date</th><th>Visibility</th><th>Actions</th></tr></thead><tbody id="updateRows"></tbody></table>
        </div>
        <form class="editor-card compact-form" id="updateForm" hidden>
          <input name="id" type="hidden">
          <h2 id="updateFormTitle">Add trending job</h2>
          <div class="form-grid">
            <label class="wide">Title<input name="title" required maxlength="300"></label>
            <label class="wide">Link URL (internal path or HTTPS URL)<input name="url" type="text" maxlength="2048" placeholder="/article-slug/"></label>
            <label>Display date<input name="displayDate" maxlength="80" placeholder="20 Oct 2026"></label>
            <label>Sort order<input name="sortOrder" type="number" min="0" value="0"></label>
            <label class="wide">Description<input name="description" maxlength="500"></label>
            <label class="check-label"><input name="isPublished" type="checkbox" checked> Published</label>
          </div>
          <div class="form-actions"><button class="primary-button" type="submit">Save update</button><button class="quiet-button" id="cancelUpdateButton" type="button">Cancel</button></div>
        </form>
      </section>

      <section class="manager-panel" id="categoriesPanel" hidden>
        <div class="panel-heading">
          <div><p class="eyebrow">TAXONOMY</p><h1>Categories</h1></div>
          <button class="primary-button" id="newCategoryButton" type="button">＋ New category</button>
        </div>
        <p class="muted">Categories already used by articles can be hidden from the homepage or deactivated, but not deleted. Assign a category to one or more homepage sections here; the existing Article form stays unchanged.</p>
        <div class="category-grid" id="categoryCards"></div>
        <form class="editor-card compact-form" id="categoryForm" hidden>
          <h2 id="categoryFormTitle">Add category</h2>
          <input name="originalSlug" type="hidden">
          <div class="form-grid">
            <label>Name<input name="name" required maxlength="120"></label>
            <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="80"></label>
            <label>Icon<input name="icon" maxlength="24" placeholder="▣"></label>
            <label>Card colour<select name="color"><option>blue</option><option>green</option><option>orange</option><option>purple</option><option>pink</option><option>teal</option><option>red</option></select></label>
            <label>Sort order<input name="sortOrder" type="number" min="0" value="100"></label>
            <label class="check-label"><input name="homeVisible" type="checkbox" checked> Show on homepage</label>
            <label class="check-label"><input name="isActive" type="checkbox" checked> Active</label>
            <fieldset class="wide category-home-tabs">
              <legend>Show articles in homepage sections</legend>
              <p class="muted">Published articles assigned to this category appear in every selected section.</p>
              <div class="category-tab-options" id="categoryHomeTabs"></div>
            </fieldset>
          </div>
          <div class="form-actions"><button class="primary-button" type="submit">Save category</button><button class="quiet-button" id="cancelCategoryButton" type="button">Cancel</button></div>
        </form>
      </section>

      <section class="manager-panel" id="homepagePanel" hidden>
        <div class="panel-heading">
          <div><p class="eyebrow">SITE CONTENT</p><h1>Homepage</h1></div>
          <button class="secondary-button" id="manageHomepageArticlesButton" type="button">Manage articles</button>
        </div>
        <p class="muted">Manage homepage section visibility and order here. Homepage cards show published articles from their assigned categories; manage category-to-section mapping in Categories and article content in Articles.</p>
        <div id="homepageModuleEditor" class="homepage-module-editor"></div>
        <div id="homeLayoutEditor" class="homepage-link-editor"></div>
        <div class="homepage-editor" id="homepageEditor"></div>
        <div class="form-actions"><button class="primary-button" id="saveHomepageButton" type="button">Save homepage</button></div>
      </section>

      <section class="manager-panel" id="customerDataPanel" hidden>
        <div class="panel-heading">
          <div><p class="eyebrow">CUSTOMER DATA</p><h1>Contact messages</h1></div>
          <button class="secondary-button" id="refreshCustomerDataButton" type="button">Refresh</button>
        </div>
        <div class="table-scroll">
          <table><thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Received</th><th>Actions</th></tr></thead><tbody id="contactMessageRows"></tbody></table>
        </div>
        <p class="form-error" id="contactDataError" role="alert"></p>
        <p class="empty-state" id="contactMessageEmpty" hidden>No contact messages.</p>
        <div class="panel-heading">
          <div><p class="eyebrow">EMAIL UPDATES</p><h2>Subscribers</h2></div>
        </div>
        <div class="table-scroll">
          <table><thead><tr><th>Email</th><th>Subscribed</th><th>Actions</th></tr></thead><tbody id="subscriberRows"></tbody></table>
        </div>
        <p class="form-error" id="subscriberDataError" role="alert"></p>
        <p class="empty-state" id="subscriberEmpty" hidden>No subscribers.</p>
      </section>
    </section>
  </main>

  <dialog class="editor-dialog" id="articleDialog">
    <form class="article-form" id="articleForm">
      <header class="dialog-heading">
        <div><p class="eyebrow">ARTICLE EDITOR</p><h1 id="articleFormTitle">New article</h1></div>
        <button class="icon-button" id="closeArticleButton" type="button" aria-label="Close editor">×</button>
      </header>
      <input name="id" type="hidden">
      <fieldset><legend>Article details</legend><div class="form-grid">
        <label class="wide">Article title<input name="title" required maxlength="300"></label>
        <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="180"></label>
        <label>Category<select name="categorySlug" required></select></label>
        <label class="wide">Short description<input name="shortDescription" maxlength="500"></label>
        <label class="wide">Meta description<input name="metaDescription" maxlength="320"></label>
        <label class="wide">Search keywords<input name="keywords" maxlength="500" placeholder="Comma-separated keywords"></label>
        <label class="wide">Featured image URL<input name="featuredImage" type="url" maxlength="2048" placeholder="https://..."></label>
        <label>Author name<input name="authorName" maxlength="120" value="Cyber Junction Team"></label>
        <label>Publication status<select name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option></select></label>
        <label>Published date<input name="publishedAt" type="datetime-local"></label>
        <label>Last updated date<input name="updatedAt" type="datetime-local"></label>
        <label class="check-label"><input name="isFeatured" type="checkbox"> Featured article</label>
      </div></fieldset>
      <fieldset><legend>Article content</legend><div class="form-grid">
        <label class="wide">Main article content<textarea name="mainContent" rows="7" placeholder="Write paragraphs as plain text. Separate paragraphs with a blank line."></textarea></label>
        <label class="wide">Important notice<textarea name="importantNotice" rows="3"></textarea></label>
        <label class="wide">Recruitment overview (one row per line: Label | Value)<textarea name="overview" rows="4" placeholder="Organization | Department name&#10;Total vacancies | As stated in the official notice"></textarea></label>
        <label class="wide">Important dates (one row per line: Event | Date)<textarea name="importantDates" rows="4"></textarea></label>
        <label class="wide">Vacancy details (one row per line: Post/Category | Vacancies)<textarea name="vacancyDetails" rows="4"></textarea></label>
        <label class="wide">Application fee (one row per line: Category | Fee)<textarea name="applicationFee" rows="3"></textarea></label>
        <label class="wide">Educational qualification<textarea name="educationalQualification" rows="4"></textarea></label>
        <label class="wide">Age limit<textarea name="ageLimit" rows="3"></textarea></label>
        <label class="wide">Salary details<textarea name="salaryDetails" rows="3"></textarea></label>
        <label class="wide">Selection process (one step per line)<textarea name="selectionProcess" rows="4"></textarea></label>
        <label class="wide">How to apply (one step per line)<textarea name="howToApply" rows="5"></textarea></label>
        <label class="wide">Required documents (one item per line)<textarea name="requiredDocuments" rows="4"></textarea></label>
        <label class="wide">FAQs (one per line: Question | Answer)<textarea name="faqs" rows="5"></textarea></label>
        <label>Official notification URL<input name="officialNotificationUrl" type="url" maxlength="2048"></label>
        <label>Apply online URL<input name="applyOnlineUrl" type="url" maxlength="2048"></label>
        <label class="wide">Official website URL<input name="officialWebsiteUrl" type="url" maxlength="2048"></label>
        <label class="wide">Disclaimer<textarea name="disclaimer" rows="3" placeholder="Leave blank to use the site-wide default disclaimer."></textarea></label>
      </div></fieldset>
      <p class="form-error" id="articleFormError" role="alert"></p>
      <footer class="dialog-actions">
        <button class="quiet-button" id="previewArticleButton" type="button">Preview</button>
        <span class="action-spacer"></span>
        <button class="quiet-button" id="unpublishArticleButton" type="button">Unpublish</button>
        <button class="secondary-button" id="saveDraftButton" type="button">Save draft</button>
        <button class="primary-button" id="publishArticleButton" type="button">Publish</button>
      </footer>
    </form>
  </dialog>

  <dialog class="preview-dialog" id="previewDialog">
    <div class="preview-content">
      <button class="icon-button preview-close" id="closePreviewButton" type="button" aria-label="Close preview">×</button>
      <p class="eyebrow" id="previewCategory"></p>
      <h1 id="previewTitle"></h1>
      <p class="preview-meta" id="previewMeta"></p>
      <p class="preview-description" id="previewDescription"></p>
      <img id="previewImage" alt="" hidden>
      <div id="previewSections"></div>
    </div>
  </dialog>
</body>
</html>
