(() => {
  "use strict";

  const apiRoot = "/api/admin";
  const authPanel = document.getElementById("authPanel");
  const dashboard = document.getElementById("dashboard");
  const authMessage = document.getElementById("authMessage");
  const dashboardMessage = document.getElementById("dashboardMessage");
  const articleDialog = document.getElementById("articleDialog");
  const articleForm = document.getElementById("articleForm");
  const articleRows = document.getElementById("articleRows");
  const articleEmpty = document.getElementById("articleEmpty");
  const categorySelect = articleForm.elements.categorySlug;
  let csrfToken = "";
  let categories = [];
  let articles = [];
  let updates = [];
  let currentUpdateId = null;
  let currentCategorySlug = null;
  let refreshTimer;

  function showMessage(element, message, isError = true) {
    element.textContent = message || "";
    element.classList.toggle("success-message", Boolean(message) && !isError);
    if (element === dashboardMessage) {
      window.clearTimeout(refreshTimer);
      if (message) refreshTimer = window.setTimeout(() => showMessage(element, ""), 5000);
    }
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (csrfToken && options.method && options.method !== "GET") {
      headers.set("X-CSRF-Token", csrfToken);
    }
    const response = await fetch(`${apiRoot}/${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) setAuthenticated(false);
      throw new Error(result.error || `Request failed (${response.status}).`);
    }
    return result;
  }

  function setAuthenticated(authenticated, email = "") {
    authPanel.hidden = authenticated;
    dashboard.hidden = !authenticated;
    if (authenticated) {
      document.getElementById("signedInAs").textContent = email;
      showMessage(authMessage, "");
    }
  }

  async function initialize() {
    try {
      const [session, setup] = await Promise.all([
        request("session"),
        request("setup-status")
      ]);
      csrfToken = session.csrfToken;
      document.getElementById("setupPanel").hidden = !setup.needsAdmin || !setup.setupEnabled;
      setAuthenticated(session.authenticated, session.email);
      if (session.authenticated) await loadDashboard();
    } catch (error) {
      showMessage(authMessage, `${error.message} Start the PHP server and configure the database first.`);
    }
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function fillSelect(select, options, includeAll = false) {
    const selected = select.value;
    select.replaceChildren();
    if (includeAll) {
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "All categories";
      select.appendChild(all);
    }
    options.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name;
      select.appendChild(option);
    });
    if (options.some((category) => category.slug === selected)) select.value = selected;
  }

  async function loadDashboard() {
    await Promise.all([loadCategories(), loadArticles(), loadUpdates()]);
  }

  async function loadCategories() {
    const result = await request("categories");
    categories = result.data;
    fillSelect(categorySelect, categories.filter((category) => Number(category.is_active)));
    fillSelect(document.getElementById("articleCategoryFilter"), categories, true);
    renderCategories();
  }

  async function loadArticles() {
    const query = new URLSearchParams();
    const text = document.getElementById("articleQuery").value.trim();
    const category = document.getElementById("articleCategoryFilter").value;
    const status = document.getElementById("articleStatusFilter").value;
    if (text) query.set("q", text);
    if (category) query.set("category", category);
    if (status) query.set("status", status);
    const result = await request(`articles?${query}`);
    articles = result.data;
    renderArticles();
  }

  async function loadUpdates() {
    const result = await request("latest-updates");
    updates = result.data;
    renderUpdates();
  }

  function makeAction(label, handler, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", handler);
    return button;
  }

  function renderArticles() {
    articleRows.replaceChildren();
    articleEmpty.hidden = articles.length > 0;
    articles.forEach((article) => {
      const row = document.createElement("tr");
      const titleCell = document.createElement("td");
      titleCell.className = "title-cell";
      titleCell.append(document.createTextNode(article.title));
      if (article.isFeatured) {
        const featured = document.createElement("span");
        featured.className = "featured-mark";
        featured.textContent = "★";
        featured.title = "Featured";
        titleCell.appendChild(featured);
      }
      const slug = document.createElement("small");
      slug.className = "slug-line";
      slug.textContent = `/${article.slug}/`;
      titleCell.appendChild(slug);

      const categoryCell = document.createElement("td");
      categoryCell.textContent = article.category;
      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = `status-pill ${article.status}`;
      status.textContent = article.status;
      statusCell.appendChild(status);
      const dateCell = document.createElement("td");
      dateCell.textContent = article.updatedAt || article.publishedAt || "—";
      const actionCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.append(
        makeAction("Edit", () => editArticle(article.id)),
        makeAction("Preview", () => previewArticle(article)),
        makeAction("Delete", () => deleteArticle(article), "delete-action")
      );
      if (article.status === "published") {
        const view = document.createElement("a");
        view.href = article.url;
        view.target = "_blank";
        view.rel = "noopener noreferrer";
        view.textContent = "View";
        actions.appendChild(view);
      }
      actionCell.appendChild(actions);
      row.append(titleCell, categoryCell, statusCell, dateCell, actionCell);
      articleRows.appendChild(row);
    });
  }

  function renderUpdates() {
    const rows = document.getElementById("updateRows");
    rows.replaceChildren();
    updates.forEach((update) => {
      const row = document.createElement("tr");
      const title = document.createElement("td");
      title.className = "title-cell";
      title.textContent = update.title;
      const date = document.createElement("td");
      date.textContent = update.display_date || "—";
      const visibility = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `status-pill ${Number(update.is_published) ? "published" : "unpublished"}`;
      pill.textContent = Number(update.is_published) ? "Published" : "Hidden";
      visibility.appendChild(pill);
      const actionCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.append(
        makeAction("Edit", () => editUpdate(update)),
        makeAction("Delete", () => deleteUpdate(update), "delete-action")
      );
      actionCell.appendChild(actions);
      row.append(title, date, visibility, actionCell);
      rows.appendChild(row);
    });
  }

  function renderCategories() {
    const container = document.getElementById("categoryCards");
    container.replaceChildren();
    categories.forEach((category) => {
      const card = document.createElement("article");
      card.className = "category-card";
      const title = document.createElement("h3");
      title.textContent = `${category.icon || ""} ${category.name}`.trim();
      const summary = document.createElement("p");
      summary.textContent = `/${category.slug}/ · ${Number(category.is_active) ? "Active" : "Inactive"}`;
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.appendChild(makeAction("Edit", () => editCategory(category)));
      card.append(title, summary, actions);
      container.appendChild(card);
    });
  }

  function clearArticleForm() {
    articleForm.reset();
    articleForm.elements.id.value = "";
    articleForm.elements.authorName.value = "Cyber Junction Team";
    articleForm.elements.status.value = "draft";
    articleForm.elements.isFeatured.checked = false;
    articleForm.elements.categorySlug.value = categories.find((category) => Number(category.is_active))?.slug || "";
    document.getElementById("articleFormTitle").textContent = "New article";
    document.getElementById("unpublishArticleButton").hidden = true;
    showMessage(document.getElementById("articleFormError"), "");
    articleDialog.showModal();
  }

  function tableText(rows) {
    return (rows || []).map((row) => `${row.label} | ${row.value}`).join("\n");
  }

  function listText(items) {
    return Array.isArray(items) ? items.join("\n") : "";
  }

  function articleToFormValues(article) {
    const sections = article.sections || {};
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      categorySlug: article.categorySlug,
      shortDescription: article.shortDescription,
      metaDescription: article.metaDescription,
      keywords: article.keywords,
      featuredImage: article.featuredImage,
      authorName: article.authorName,
      status: article.status,
      publishedAt: article.publishedAt?.replace(" ", "T").slice(0, 16) || "",
      updatedAt: article.updatedAt?.replace(" ", "T").slice(0, 16) || "",
      isFeatured: article.isFeatured,
      mainContent: article.mainContent,
      importantNotice: article.importantNotice,
      overview: tableText(sections.overview),
      importantDates: tableText(sections.important_dates),
      vacancyDetails: tableText(sections.vacancy_details),
      applicationFee: tableText(sections.application_fee),
      educationalQualification: sections.educational_qualification,
      ageLimit: sections.age_limit,
      salaryDetails: sections.salary_details,
      selectionProcess: listText(sections.selection_process),
      howToApply: listText(sections.how_to_apply),
      requiredDocuments: listText(sections.required_documents),
      faqs: (sections.faqs || []).map((faq) => `${faq.question} | ${faq.answer}`).join("\n"),
      officialNotificationUrl: article.officialNotificationUrl,
      applyOnlineUrl: article.applyOnlineUrl,
      officialWebsiteUrl: article.officialWebsiteUrl,
      disclaimer: sections.disclaimer || ""
    };
  }

  function articleToForm(article) {
    const form = articleForm;
    const values = articleToFormValues(article);
    Object.entries(values).forEach(([name, value]) => {
      const input = form.elements[name];
      if (!input) return;
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = value ?? "";
    });
  }

  async function editArticle(id) {
    try {
      const article = articles.find((item) => item.id === id);
      if (!article) throw new Error("Article not found in the current list.");
      articleToForm(article);
      document.getElementById("articleFormTitle").textContent = "Edit article";
      document.getElementById("unpublishArticleButton").hidden = false;
      articleDialog.showModal();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  function formToArticle(status = articleForm.elements.status.value) {
    const fields = formObject(articleForm);
    return {
      ...fields,
      status,
      isFeatured: articleForm.elements.isFeatured.checked,
      categorySlug: articleForm.elements.categorySlug.value
    };
  }

  async function saveArticle(status) {
    const errorElement = document.getElementById("articleFormError");
    showMessage(errorElement, "");
    articleForm.elements.status.value = status;
    if (!articleForm.reportValidity()) return;
    const id = articleForm.elements.id.value;
    try {
      const result = await request(id ? `articles/${id}` : "articles", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(formToArticle(status))
      });
      articleToForm(result.data);
      document.getElementById("articleFormTitle").textContent = "Edit article";
      document.getElementById("unpublishArticleButton").hidden = false;
      showMessage(dashboardMessage, status === "published" ? "Article published." : status === "unpublished" ? "Article unpublished." : "Draft saved.", false);
      await loadArticles();
    } catch (error) {
      showMessage(errorElement, error.message);
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Delete "${article.title}" permanently? This cannot be undone.`)) return;
    try {
      await request(`articles/${article.id}`, { method: "DELETE" });
      showMessage(dashboardMessage, "Article deleted.", false);
      await loadArticles();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  function appendPreviewText(parent, tagName, text, className = "") {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text || "";
    parent.appendChild(element);
    return element;
  }

  function previewArticle(article = formToArticle()) {
    if (article.sections && typeof article.sections === "object") {
      article = articleToFormValues(article);
    }
    const title = article.title || "Untitled article";
    const sections = article.sections || {};
    document.getElementById("previewCategory").textContent =
      categories.find((category) => category.slug === article.categorySlug)?.name || "Article preview";
    document.getElementById("previewTitle").textContent = title;
    document.getElementById("previewMeta").textContent =
      `${article.authorName || "Cyber Junction Team"} · ${article.publishedAt || "Publication date not set"}${article.updatedAt ? ` · Updated ${article.updatedAt}` : ""}`;
    document.getElementById("previewDescription").textContent = article.shortDescription || "";
    const image = document.getElementById("previewImage");
    const imageUrl = article.featuredImage || "";
    if (/^https?:\/\//i.test(imageUrl)) {
      image.src = imageUrl;
      image.hidden = false;
    } else {
      image.removeAttribute("src");
      image.hidden = true;
    }
    const content = document.getElementById("previewSections");
    content.replaceChildren();
    const addTextSection = (heading, value) => {
      if (!value) return;
      appendPreviewText(content, "h2", heading);
      value.split(/\n\s*\n/).filter(Boolean).forEach((paragraph) => appendPreviewText(content, "p", paragraph));
    };
    const addListSection = (heading, value) => {
      if (!value.trim()) return;
      appendPreviewText(content, "h2", heading);
      const list = document.createElement("ul");
      value.split(/\n/).filter(Boolean).forEach((item) => appendPreviewText(list, "li", item));
      content.appendChild(list);
    };
    addTextSection("Important notice", article.importantNotice);
    addTextSection("Article content", article.mainContent);
    [
      ["Recruitment overview", article.overview],
      ["Important dates", article.importantDates],
      ["Vacancy details", article.vacancyDetails],
      ["Application fee", article.applicationFee]
    ].forEach(([heading, text]) => {
      if (!text.trim()) return;
      appendPreviewText(content, "h2", heading);
      const table = document.createElement("table");
      text.split(/\n/).forEach((line) => {
        const columns = line.split("|", 2).map((part) => part.trim());
        if (columns.length !== 2 || !columns[0] || !columns[1]) return;
        const row = table.insertRow();
        appendPreviewText(row, "th", columns[0]);
        appendPreviewText(row, "td", columns[1]);
      });
      if (table.rows.length) content.appendChild(table);
    });
    addTextSection("Educational qualification", article.educationalQualification);
    addTextSection("Age limit", article.ageLimit);
    addTextSection("Salary details", article.salaryDetails);
    addListSection("Selection process", article.selectionProcess || "");
    addListSection("How to apply", article.howToApply || "");
    addListSection("Required documents", article.requiredDocuments || "");
    if (article.faqs.trim()) {
      appendPreviewText(content, "h2", "Frequently asked questions");
      article.faqs.split(/\n/).forEach((line) => {
        const parts = line.split("|", 2).map((part) => part.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) return;
        appendPreviewText(content, "h3", parts[0]);
        appendPreviewText(content, "p", parts[1]);
      });
    }
    document.getElementById("previewDialog").showModal();
  }

  function editUpdate(update) {
    const form = document.getElementById("updateForm");
    form.hidden = false;
    currentUpdateId = update.id;
    form.elements.id.value = update.id;
    form.elements.title.value = update.title;
    form.elements.url.value = update.url || "";
    form.elements.description.value = update.description || "";
    form.elements.displayDate.value = update.display_date || "";
    form.elements.sortOrder.value = update.sort_order || 0;
    form.elements.isPublished.checked = Boolean(Number(update.is_published));
    document.getElementById("updateFormTitle").textContent = "Edit latest update";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetUpdateForm() {
    const form = document.getElementById("updateForm");
    form.reset();
    form.elements.id.value = "";
    form.elements.sortOrder.value = 0;
    form.elements.isPublished.checked = true;
    currentUpdateId = null;
    form.hidden = true;
  }

  async function saveUpdate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    data.sortOrder = Number(data.sortOrder || 0);
    data.isPublished = form.elements.isPublished.checked;
    try {
      await request(currentUpdateId ? `latest-updates/${currentUpdateId}` : "latest-updates", {
        method: currentUpdateId ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      resetUpdateForm();
      showMessage(dashboardMessage, "Latest update saved.", false);
      await loadUpdates();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function deleteUpdate(update) {
    if (!window.confirm(`Delete "${update.title}" from Latest Updates?`)) return;
    try {
      await request(`latest-updates/${update.id}`, { method: "DELETE" });
      showMessage(dashboardMessage, "Latest update deleted.", false);
      await loadUpdates();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  function editCategory(category) {
    const form = document.getElementById("categoryForm");
    currentCategorySlug = category.slug;
    form.hidden = false;
    form.elements.originalSlug.value = category.slug;
    form.elements.slug.value = category.slug;
    form.elements.slug.disabled = true;
    form.elements.name.value = category.name;
    form.elements.icon.value = category.icon || "";
    form.elements.color.value = category.color || "blue";
    form.elements.sortOrder.value = category.sort_order;
    form.elements.homeVisible.checked = Boolean(Number(category.home_visible));
    form.elements.navVisible.checked = Boolean(Number(category.nav_visible));
    form.elements.isActive.checked = Boolean(Number(category.is_active));
    document.getElementById("categoryFormTitle").textContent = `Edit ${category.name}`;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetCategoryForm() {
    const form = document.getElementById("categoryForm");
    form.reset();
    form.elements.slug.disabled = false;
    form.elements.sortOrder.value = 100;
    currentCategorySlug = null;
    form.hidden = true;
  }

  async function saveCategory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    if (currentCategorySlug) data.slug = currentCategorySlug;
    data.homeVisible = form.elements.homeVisible.checked;
    data.navVisible = form.elements.navVisible.checked;
    data.isActive = form.elements.isActive.checked;
    data.sortOrder = Number(data.sortOrder || 0);
    delete data.originalSlug;
    try {
      await request(currentCategorySlug ? `categories/${currentCategorySlug}` : "categories", {
        method: currentCategorySlug ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      resetCategoryForm();
      showMessage(dashboardMessage, "Category saved.", false);
      await loadCategories();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    showMessage(authMessage, "");
    try {
      await request("login", { method: "POST", body: JSON.stringify(formObject(form)) });
      form.reset();
      await initialize();
      showMessage(dashboardMessage, "Signed in.", false);
    } catch (error) {
      showMessage(authMessage, error.message);
    }
  }

  async function submitSetup(event) {
    event.preventDefault();
    const form = event.currentTarget;
    showMessage(authMessage, "");
    try {
      await request("setup", { method: "POST", body: JSON.stringify(formObject(form)) });
      form.reset();
      document.getElementById("setupPanel").hidden = true;
      showMessage(authMessage, "Administrator created. Sign in with the new account.", false);
    } catch (error) {
      showMessage(authMessage, error.message);
    }
  }

  async function logout() {
    try {
      await request("logout", { method: "POST", body: "{}" });
      csrfToken = "";
      setAuthenticated(false);
      await initialize();
      showMessage(authMessage, "Signed out.", false);
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  document.getElementById("loginForm").addEventListener("submit", submitLogin);
  document.getElementById("setupForm").addEventListener("submit", submitSetup);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("newArticleButton").addEventListener("click", clearArticleForm);
  document.getElementById("closeArticleButton").addEventListener("click", () => articleDialog.close());
  document.getElementById("saveDraftButton").addEventListener("click", () => saveArticle("draft"));
  document.getElementById("publishArticleButton").addEventListener("click", () => saveArticle("published"));
  document.getElementById("unpublishArticleButton").addEventListener("click", () => saveArticle("unpublished"));
  document.getElementById("previewArticleButton").addEventListener("click", () => previewArticle());
  document.getElementById("closePreviewButton").addEventListener("click", () => document.getElementById("previewDialog").close());
  document.getElementById("newUpdateButton").addEventListener("click", () => {
    resetUpdateForm();
    document.getElementById("updateForm").hidden = false;
    document.getElementById("updateFormTitle").textContent = "Add latest update";
  });
  document.getElementById("cancelUpdateButton").addEventListener("click", resetUpdateForm);
  document.getElementById("updateForm").addEventListener("submit", saveUpdate);
  document.getElementById("newCategoryButton").addEventListener("click", () => {
    resetCategoryForm();
    document.getElementById("categoryForm").hidden = false;
    document.getElementById("categoryFormTitle").textContent = "Add category";
  });
  document.getElementById("cancelCategoryButton").addEventListener("click", resetCategoryForm);
  document.getElementById("categoryForm").addEventListener("submit", saveCategory);
  document.getElementById("articleQuery").addEventListener("input", () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => loadArticles().catch((error) => showMessage(dashboardMessage, error.message)), 250);
  });
  document.getElementById("articleCategoryFilter").addEventListener("change", () => loadArticles().catch((error) => showMessage(dashboardMessage, error.message)));
  document.getElementById("articleStatusFilter").addEventListener("change", () => loadArticles().catch((error) => showMessage(dashboardMessage, error.message)));
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".manager-panel").forEach((panel) => {
        panel.hidden = panel.id !== button.dataset.panel;
      });
    });
  });

  articleForm.elements.title.addEventListener("input", () => {
    if (articleForm.elements.id.value || articleForm.elements.slug.dataset.edited === "true") return;
    articleForm.elements.slug.value = articleForm.elements.title.value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 180);
  });
  articleForm.elements.slug.addEventListener("input", () => {
    articleForm.elements.slug.dataset.edited = "true";
  });
  articleForm.addEventListener("reset", () => {
    delete articleForm.elements.slug.dataset.edited;
  });
  articleDialog.addEventListener("click", (event) => {
    if (event.target === articleDialog) articleDialog.close();
  });

  initialize();
})();
