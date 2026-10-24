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
  let articleCatalog = [];
  let updates = [];
  let quickLinks = [];
  let homepageContent = {};
  let currentUpdateId = null;
  let currentQuickLinkId = null;
  let currentCategorySlug = null;
  let refreshTimer;
  const homepageTabs = [
    ["latest-updates", "Trending Jobs"],
    ["jobs", "Government Jobs"],
    ["scholarship", "Scholarships"],
    ["admit", "Admit Card"],
    ["results", "Results"],
    ["answer-key", "Answer Key"],
    ["syllabus", "Syllabus"],
    ["admission", "Admissions"],
    ["certificate", "Certificate"],
    ["offline-outsourcing-job", "Offline/Outsourcing Jobs"],
    ["important", "Important"],
  ];
  const homepageModuleGroups = [
    {
      id: "primary",
      title: "Main page section order",
      items: [
        ["hero", "Hero banner"],
        ["biharBhoomi", "Bihar Bhoomi card"],
        ["quickLinks", "Quick Links"],
        ["content", "Main content"],
      ]
    },
    {
      id: "content",
      title: "Main content order",
      items: [
        ["homeUpdates", "Article category sections"],
        ["categoryCards", "Category cards"],
        ["about", "About Cyber Junction"],
      ]
    },
    {
      id: "articleSections",
      title: "Article section cards",
      items: [
        ["results", "Results"],
        ["admit", "Admit Card"],
        ["jobs", "Latest Job"],
        ["scholarship", "Scholarships"],
        ["answerKey", "Answer Key"],
        ["syllabus", "Syllabus"],
        ["admission", "Admission"],
        ["certificate", "Certificate"],
        ["offlineOutsourcingJob", "Offline/Outsourcing Jobs"],
        ["important", "Important"],
      ]
    },
  ];

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

  function fillArticleCategorySelect(selectedSlug = categorySelect.value) {
    categorySelect.replaceChildren();
    const activeCategories = categories.filter((category) => Number(category.is_active));
    const inactiveCategories = categories.filter((category) => !Number(category.is_active));

    if (activeCategories.length) {
      const activeGroup = document.createElement("optgroup");
      activeGroup.label = "Active categories";
      activeCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = category.name;
        activeGroup.appendChild(option);
      });
      categorySelect.appendChild(activeGroup);
    }

    if (inactiveCategories.length) {
      const inactiveGroup = document.createElement("optgroup");
      inactiveGroup.label = "Inactive categories - activate in Categories to use for new articles";
      inactiveCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = `${category.name} (inactive)`;
        option.disabled = true;
        inactiveGroup.appendChild(option);
      });
      categorySelect.appendChild(inactiveGroup);
    }

    if (selectedSlug && categories.some((category) => category.slug === selectedSlug)) {
      categorySelect.value = selectedSlug;
    }
  }

  function selectArticleCategory(slug) {
    const option = Array.from(categorySelect.options).find((item) => item.value === slug);
    if (!option) return false;
    const category = categories.find((item) => item.slug === slug);
    if (category && !Number(category.is_active)) {
      option.disabled = false;
      option.textContent = `${category.name} (inactive - existing article)`;
    }
    categorySelect.value = slug;
    return categorySelect.value === slug;
  }

  async function loadDashboard() {
    await loadArticleCatalog();
    await Promise.all([loadCategories(), loadArticles(), loadUpdates(), loadQuickLinks(), loadHomepage()]);
  }

  async function loadCategories() {
    const result = await request("categories");
    categories = result.data;
    fillArticleCategorySelect();
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

  async function loadArticleCatalog() {
    const result = await request("articles");
    articleCatalog = result.data;
    refreshQuickLinkArticleSelect();
  }

  async function loadUpdates() {
    const result = await request("latest-updates");
    updates = result.data;
    renderUpdates();
  }

  async function loadQuickLinks() {
    const result = await request("quick-links");
    quickLinks = result.data;
    renderQuickLinks();
  }

  async function loadHomepage() {
    const result = await request("homepage");
    homepageContent = result.data;
    renderHomepageLayoutEditor();
    renderHomepageEditor();
  }

  async function loadCustomerData() {
    const [contactsResult, subscribersResult] = await Promise.allSettled([
      request("customer-data/contacts"),
      request("customer-data/subscribers")
    ]);
    const contactError = document.getElementById("contactDataError");
    const subscriberError = document.getElementById("subscriberDataError");
    if (contactsResult.status === "fulfilled") {
      contactError.textContent = "";
      renderCustomerRows(
        document.getElementById("contactMessageRows"),
        document.getElementById("contactMessageEmpty"),
        contactsResult.value.data,
        ["name", "email", "message", "created_at"],
        "contacts"
      );
    } else {
      document.getElementById("contactMessageRows").replaceChildren();
      document.getElementById("contactMessageEmpty").hidden = true;
      contactError.textContent = contactsResult.reason.message;
    }
    if (subscribersResult.status === "fulfilled") {
      subscriberError.textContent = "";
      renderCustomerRows(
        document.getElementById("subscriberRows"),
        document.getElementById("subscriberEmpty"),
        subscribersResult.value.data,
        ["email", "subscribed_at"],
        "subscribers"
      );
    } else {
      document.getElementById("subscriberRows").replaceChildren();
      document.getElementById("subscriberEmpty").hidden = true;
      subscriberError.textContent = subscribersResult.reason.message;
    }
  }

  function renderCustomerRows(tbody, emptyState, records, columns, type) {
    const rows = Array.isArray(records) ? records : [];
    tbody.replaceChildren();
    rows.forEach((record) => {
      const row = document.createElement("tr");
      columns.forEach((key) => {
        const cell = document.createElement("td");
        cell.textContent = String(record[key] ?? "");
        row.appendChild(cell);
      });
      const actions = document.createElement("td");
      const remove = makeAction("Delete", async () => {
        if (!window.confirm(`Delete this ${type === "contacts" ? "contact message" : "subscriber"}?`)) return;
        try {
          await request(`customer-data/${type}/${encodeURIComponent(record.id)}`, { method: "DELETE" });
          await loadCustomerData();
          showMessage(dashboardMessage, "Customer record deleted.", false);
        } catch (error) {
          showMessage(dashboardMessage, error.message);
        }
      }, "danger-button");
      remove.setAttribute("aria-label", `Delete ${type} record`);
      actions.appendChild(remove);
      row.appendChild(actions);
      tbody.appendChild(row);
    });
    emptyState.hidden = rows.length > 0;
  }

  function ensureHomepageLayout() {
    if (!homepageContent.homeLayout || typeof homepageContent.homeLayout !== "object") {
      homepageContent.homeLayout = {};
    }
    const layout = homepageContent.homeLayout;
    if (!layout.titles || typeof layout.titles !== "object") layout.titles = {};
    const sectionKeys = [
      "results", "admit", "jobs", "scholarship", "answerKey", "syllabus",
      "admission", "certificate", "offlineOutsourcingJob", "important"
    ];
    ["quickLinks", ...sectionKeys].forEach((key) => {
      if (typeof layout.titles[key] !== "string") layout.titles[key] = "";
    });
    if (!Array.isArray(layout.quickLinks)) layout.quickLinks = [];
    if (!layout.useCustomLists || typeof layout.useCustomLists !== "object") layout.useCustomLists = {};
    if (!layout.columns || typeof layout.columns !== "object") layout.columns = {};
    if (!layout.moduleOrder || typeof layout.moduleOrder !== "object") layout.moduleOrder = {};
    if (!layout.moduleVisibility || typeof layout.moduleVisibility !== "object") layout.moduleVisibility = {};
    homepageModuleGroups.forEach((group) => {
      const ids = group.items.map(([id]) => id);
      const configured = Array.isArray(layout.moduleOrder[group.id]) ? layout.moduleOrder[group.id] : [];
      layout.moduleOrder[group.id] = [
        ...new Set(configured.filter((id) => ids.includes(id))),
        ...ids.filter((id) => !configured.includes(id))
      ];
      ids.forEach((id) => {
        if (typeof layout.moduleVisibility[id] !== "boolean") layout.moduleVisibility[id] = true;
      });
    });
    sectionKeys.forEach((key) => {
      layout.useCustomLists[key] = layout.useCustomLists[key] === true;
      if (!Array.isArray(layout.columns[key])) layout.columns[key] = [];
    });
    return layout;
  }

  function createHomepageLinkInput(title, value, placeholder, onInput) {
    const label = document.createElement("label");
    label.textContent = title;
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder;
    input.maxLength = title === "Link URL" ? 2048 : 300;
    input.addEventListener("input", () => onInput(input.value));
    label.appendChild(input);
    return label;
  }

  function articlePath(article) {
    return `/${encodeURIComponent(article.slug)}/`;
  }

  function articleForUrl(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      const path = decodeURIComponent(parsed.pathname).replace(/\/+$/, "");
      return articleCatalog.find((article) => articlePath(article).replace(/\/+$/, "") === path) || null;
    } catch {
      return null;
    }
  }

  function createArticlePicker(currentUrl, onSelect) {
    const label = document.createElement("label");
    label.className = "homepage-article-picker";
    label.textContent = "Managed article";
    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Choose an article or keep a custom URL";
    select.appendChild(empty);
    articleCatalog.forEach((article) => {
      const option = document.createElement("option");
      option.value = String(article.id);
      option.textContent = `${article.title} (${article.status})`;
      select.appendChild(option);
    });
    const current = articleForUrl(currentUrl);
    if (current) select.value = String(current.id);
    select.addEventListener("change", () => {
      const selected = articleCatalog.find((article) => String(article.id) === select.value) || null;
      if (selected) onSelect(selected);
    });
    label.appendChild(select);
    return label;
  }

  function refreshQuickLinkArticleSelect() {
    const form = document.getElementById("quickLinkForm");
    if (!form) return;
    const select = form.elements.articleId;
    const selectedArticle = articleForUrl(form.elements.url.value);
    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Choose an article or keep a custom URL";
    select.appendChild(empty);
    articleCatalog.forEach((article) => {
      const option = document.createElement("option");
      option.value = String(article.id);
      option.textContent = `${article.title} (${article.status})`;
      select.appendChild(option);
    });
    if (selectedArticle) select.value = String(selectedArticle.id);
  }

  function appendManageArticleAction(actions, url) {
    const article = articleForUrl(url);
    if (!article) return;
    actions.appendChild(makeAction("Manage article", () => openManagedArticle(article)));
  }

  function renderHomepageLinkList(parent, { key, title, description, categoryId = "" }) {
    const layout = ensureHomepageLayout();
    const section = document.createElement("section");
    section.className = "homepage-link-section";
    const heading = document.createElement("div");
    heading.className = "homepage-link-section-heading";
    const headingCopy = document.createElement("div");
    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = title;
    const titleInput = createHomepageLinkInput(
      categoryId ? "Card heading" : "Section heading",
      layout.titles[key],
      title,
      (value) => { layout.titles[key] = value; }
    );
    const sectionDescription = document.createElement("p");
    sectionDescription.textContent = description;
    headingCopy.append(sectionTitle, titleInput, sectionDescription);
    heading.appendChild(headingCopy);

    const list = categoryId ? layout.columns[key] : layout.quickLinks;
    const automatic = categoryId && layout.useCustomLists[key] === false;
    if (categoryId) {
      const automaticLabel = document.createElement("label");
      automaticLabel.className = "homepage-auto-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = automatic;
      checkbox.addEventListener("change", () => {
        layout.useCustomLists[key] = !checkbox.checked;
        renderHomepageLayoutEditor();
      });
      const labelText = document.createElement("span");
      labelText.textContent = "Automatically show published articles from this category";
      automaticLabel.append(checkbox, labelText);
      heading.appendChild(automaticLabel);
    }
    section.appendChild(heading);

    const entries = document.createElement("div");
    entries.className = "homepage-link-entries";
    entries.hidden = Boolean(automatic);
    list.forEach((item, index) => {
      if (!item || typeof item !== "object") list[index] = { title: "", url: "" };
      const current = list[index];
      const entry = document.createElement("div");
      entry.className = "homepage-link-entry";
      const fields = document.createElement("div");
      fields.className = "homepage-link-fields";
      const titleInput = createHomepageLinkInput("Link title", typeof current.title === "string" ? current.title : "", "Enter link text", (value) => {
        current.title = value;
      });
      const urlInput = createHomepageLinkInput("Link URL", typeof current.url === "string" ? current.url : "", "https://... or /internal-path", (value) => {
        current.url = value;
      });
      fields.append(
        titleInput,
        urlInput,
        createArticlePicker(current.url, (article) => {
          current.title = article.title;
          current.url = articlePath(article);
          renderHomepageLayoutEditor();
        })
      );

      const actions = document.createElement("div");
      actions.className = "homepage-json-item-actions";
      const moveUp = makeAction("↑", () => {
        [list[index - 1], list[index]] = [list[index], list[index - 1]];
        renderHomepageLayoutEditor();
      }, "quiet-button");
      moveUp.setAttribute("aria-label", `Move ${title} item ${index + 1} up`);
      moveUp.disabled = index === 0;
      const moveDown = makeAction("↓", () => {
        [list[index], list[index + 1]] = [list[index + 1], list[index]];
        renderHomepageLayoutEditor();
      }, "quiet-button");
      moveDown.setAttribute("aria-label", `Move ${title} item ${index + 1} down`);
      moveDown.disabled = index === list.length - 1;
      const remove = makeAction("Remove", () => {
        list.splice(index, 1);
        renderHomepageLayoutEditor();
      }, "quiet-button");
      appendManageArticleAction(actions, current.url);
      actions.append(moveUp, moveDown, remove);
      entry.append(fields, actions);
      entries.appendChild(entry);
    });

    const add = makeAction(`＋ Add ${categoryId ? "link" : "quick link"}`, () => {
      if (categoryId) layout.useCustomLists[key] = true;
      list.push({ title: "", url: "" });
      renderHomepageLayoutEditor();
    }, "secondary-button");
    entries.appendChild(add);
    section.appendChild(entries);
    parent.appendChild(section);
  }

  function renderHomepageLayoutEditor() {
    const editor = document.getElementById("homeLayoutEditor");
    if (!editor) return;
    editor.replaceChildren();
    renderHomepageModuleEditor();
    [
      ["results", "Result", "results"],
      ["admit", "Admit Card", "admit"],
      ["jobs", "Latest Job", "jobs"],
      ["scholarship", "Scholarships", "scholarship"],
      ["answerKey", "Answer Key", "answer-key"],
      ["syllabus", "Syllabus", "syllabus"],
      ["admission", "Admission", "admission"],
      ["certificate", "Certificate", "certificate"],
      ["offlineOutsourcingJob", "Offline/Outsourcing Job", "offline-outsourcing-job"],
      ["important", "Important", "important"],
    ].forEach(([key, title, categoryId]) => {
      renderHomepageLinkList(editor, {
        key,
        title,
        categoryId,
        description: `Links shown in the ${title} homepage card.`
      });
    });
  }

  function renderHomepageModuleEditor() {
    const editor = document.getElementById("homepageModuleEditor");
    if (!editor) return;
    const layout = ensureHomepageLayout();
    editor.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = "Homepage sections";
    editor.appendChild(heading);
    homepageModuleGroups.forEach((group) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "homepage-module-group";
      const legend = document.createElement("legend");
      legend.textContent = group.title;
      fieldset.appendChild(legend);
      group.items.forEach(([id, label]) => {
        const row = document.createElement("div");
        row.className = "homepage-module-row";
        const visibleLabel = document.createElement("label");
        visibleLabel.className = "check-label";
        const visible = document.createElement("input");
        visible.type = "checkbox";
        visible.checked = layout.moduleVisibility[id];
        visible.addEventListener("change", () => {
          layout.moduleVisibility[id] = visible.checked;
        });
        const visibleText = document.createElement("span");
        visibleText.textContent = label;
        visibleLabel.append(visible, visibleText);

        const actions = document.createElement("div");
        actions.className = "homepage-json-item-actions";
        const order = layout.moduleOrder[group.id];
        const index = order.indexOf(id);
        const moveUp = makeAction("↑", () => {
          [order[index - 1], order[index]] = [order[index], order[index - 1]];
          renderHomepageModuleEditor();
        }, "quiet-button");
        moveUp.setAttribute("aria-label", `Move ${label} up`);
        moveUp.disabled = index === 0;
        const moveDown = makeAction("↓", () => {
          [order[index], order[index + 1]] = [order[index + 1], order[index]];
          renderHomepageModuleEditor();
        }, "quiet-button");
        moveDown.setAttribute("aria-label", `Move ${label} down`);
        moveDown.disabled = index === order.length - 1;
        actions.append(moveUp, moveDown);
        row.append(visibleLabel, actions);
        fieldset.appendChild(row);
      });
      editor.appendChild(fieldset);
    });
  }

  function homepageFieldLabel(key) {
    return key.replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function blankHomepageValue(value) {
    if (Array.isArray(value)) return [];
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, blankHomepageValue(child)]));
    }
    if (typeof value === "boolean") return false;
    if (typeof value === "number") return 0;
    return "";
  }

  function blankHomepageItem(values, key, path) {
    if (values.length) return blankHomepageValue(values[0]);
    const normalizedPath = path.filter((part) => typeof part !== "number").join(".");
    const templates = {
      "socialLinks": { label: "", url: "" },
      "rtps.services": { id: "", title: "", url: "", options: [] },
      "rtps.services.options": { title: "", url: "" },
      "pages.terms.sections": { title: "", body: "" },
      "bhoomiServices": {
        id: "", icon: "", title: "", description: "", category: "", categoryName: "", href: "", keywords: ""
      },
      "navigation.moreLinks": { view: "", title: "", url: "" },
      "rightSidebar.latestNews": { title: "", displayDate: "", url: "" },
    };
    if (Object.hasOwn(templates, normalizedPath)) return templates[normalizedPath];
    if (["items", "services", "options", "importantLinks", "popularSearches", "quickLinks", "importantPages", "trustPoints"].includes(key)) {
      return ["importantLinks", "popularSearches", "quickLinks", "importantPages", "services", "options"].includes(key)
        ? { title: "", url: "" }
        : "";
    }
    return "";
  }

  function setHomepageValue(path, value) {
    let target = homepageContent;
    path.slice(0, -1).forEach((key) => {
      target = target[key];
    });
    target[path[path.length - 1]] = value;
  }

  function renderHomepageField(parent, key, value, path) {
    if (Array.isArray(value)) {
      const group = document.createElement("details");
      group.className = "homepage-json-group homepage-json-array";
      group.open = path.length === 1;
      const summary = document.createElement("summary");
      summary.textContent = `${homepageFieldLabel(key)} (${value.length})`;
      group.appendChild(summary);
      const items = document.createElement("div");
      items.className = "homepage-json-items";
      value.forEach((item, index) => {
        const entry = document.createElement("div");
        entry.className = "homepage-json-entry";
        const heading = document.createElement("div");
        heading.className = "homepage-json-entry-heading";
        const itemTitle = document.createElement("strong");
        itemTitle.textContent = `${homepageFieldLabel(key)} ${index + 1}`;
        const actions = document.createElement("div");
        actions.className = "homepage-json-item-actions";
        const moveUp = document.createElement("button");
        moveUp.type = "button";
        moveUp.className = "quiet-button";
        moveUp.textContent = "↑";
        moveUp.setAttribute("aria-label", `Move ${homepageFieldLabel(key)} ${index + 1} up`);
        moveUp.disabled = index === 0;
        moveUp.addEventListener("click", () => {
          let target = homepageContent;
          path.slice(0, -1).forEach((part) => { target = target[part]; });
          [target[index - 1], target[index]] = [target[index], target[index - 1]];
          renderHomepageEditor();
        });
        const moveDown = document.createElement("button");
        moveDown.type = "button";
        moveDown.className = "quiet-button";
        moveDown.textContent = "↓";
        moveDown.setAttribute("aria-label", `Move ${homepageFieldLabel(key)} ${index + 1} down`);
        moveDown.disabled = index === value.length - 1;
        moveDown.addEventListener("click", () => {
          let target = homepageContent;
          path.slice(0, -1).forEach((part) => { target = target[part]; });
          [target[index], target[index + 1]] = [target[index + 1], target[index]];
          renderHomepageEditor();
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "quiet-button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
          let target = homepageContent;
          path.slice(0, -1).forEach((part) => { target = target[part]; });
          target.splice(index, 1);
          renderHomepageEditor();
        });
        actions.append(moveUp, moveDown, remove);
        heading.append(itemTitle, actions);
        entry.appendChild(heading);
        if (item && typeof item === "object" && !Array.isArray(item)) {
          Object.entries(item).forEach(([childKey, child]) => {
            renderHomepageField(entry, childKey, child, [...path, index, childKey]);
          });
        } else {
          renderHomepageField(entry, "value", item, [...path, index]);
        }
        items.appendChild(entry);
      });
      const add = document.createElement("button");
      add.type = "button";
      add.className = "quiet-button";
      add.textContent = `＋ Add ${homepageFieldLabel(key).replace(/s$/, "")}`;
      add.addEventListener("click", () => {
        let target = homepageContent;
        path.slice(0, -1).forEach((part) => { target = target[part]; });
        target.push(blankHomepageItem(target, path[path.length - 1], path));
        renderHomepageEditor();
      });
      group.append(items, add);
      parent.appendChild(group);
      return;
    }

    if (value && typeof value === "object") {
      const group = document.createElement("details");
      group.className = "homepage-json-group";
      group.open = path.length === 1;
      const summary = document.createElement("summary");
      summary.textContent = homepageFieldLabel(key);
      group.appendChild(summary);
      const fields = document.createElement("div");
      fields.className = "homepage-json-fields";
      Object.entries(value).forEach(([childKey, child]) => {
        renderHomepageField(fields, childKey, child, [...path, childKey]);
      });
      group.appendChild(fields);
      parent.appendChild(group);
      return;
    }

    const label = document.createElement("label");
    label.className = typeof value === "boolean" ? "check-label" : "";
    const title = document.createElement("span");
    title.textContent = homepageFieldLabel(key);
    let input;
    if (typeof value === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = value;
      input.addEventListener("change", () => setHomepageValue(path, input.checked));
      label.append(input, title);
    } else if (typeof value === "number") {
      input = document.createElement("input");
      input.type = "number";
      input.value = String(value);
      input.addEventListener("input", () => setHomepageValue(path, Number(input.value) || 0));
      label.append(title, input);
    } else {
      input = document.createElement("textarea");
      input.rows = String(value).length > 100 || String(value).includes("\n") ? 3 : 1;
      input.value = String(value ?? "");
      input.addEventListener("input", () => setHomepageValue(path, input.value));
      label.append(title, input);
    }
    parent.appendChild(label);
  }

  function renderHomepageEditor() {
    const editor = document.getElementById("homepageEditor");
    editor.replaceChildren();
    Object.entries(homepageContent).forEach(([key, value]) => {
      if (key === "homeLayout") return;
      renderHomepageField(editor, key, value, [key]);
    });
  }

  async function saveHomepage() {
    try {
      const result = await request("homepage", {
        method: "PUT",
        body: JSON.stringify({ content: homepageContent })
      });
      homepageContent = result.data;
      renderHomepageLayoutEditor();
      renderHomepageEditor();
      showMessage(dashboardMessage, "Homepage content saved.", false);
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
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

  function renderQuickLinks() {
    const rows = document.getElementById("quickLinkRows");
    const empty = document.getElementById("quickLinkEmpty");
    rows.replaceChildren();
    empty.hidden = quickLinks.length > 0;
    const activeCount = quickLinks.filter((link) => Number(link.is_active) === 1).length;
    quickLinks.forEach((link, index) => {
      const row = document.createElement("tr");
      const previewCell = document.createElement("td");
      const preview = document.createElement("span");
      preview.className = `quick-link-preview tone-${link.bg_color} text-${link.text_color}`;
      preview.textContent = link.title;
      previewCell.appendChild(preview);
      const url = document.createElement("td");
      url.textContent = link.url;
      const visibility = document.createElement("td");
      const pill = document.createElement("span");
      const active = Number(link.is_active) === 1;
      pill.className = `status-pill ${active ? "published" : "unpublished"}`;
      pill.textContent = active ? "Active" : "Hidden";
      visibility.appendChild(pill);
      const order = document.createElement("td");
      order.textContent = String(index + 1);
      const actionCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const moveUp = makeAction("↑", () => moveQuickLink(index, -1));
      moveUp.setAttribute("aria-label", `Move ${link.title} up`);
      moveUp.disabled = index === 0;
      const moveDown = makeAction("↓", () => moveQuickLink(index, 1));
      moveDown.setAttribute("aria-label", `Move ${link.title} down`);
      moveDown.disabled = index === quickLinks.length - 1;
      const toggle = makeAction(active ? "Hide" : "Activate", () => toggleQuickLink(link));
      toggle.disabled = !active && activeCount >= 8;
      if (toggle.disabled) toggle.title = "Only 8 quick links can be active on the homepage.";
      actions.append(
        moveUp,
        moveDown,
        makeAction("Edit", () => editQuickLink(link)),
        toggle,
        makeAction("Delete", () => deleteQuickLink(link), "delete-action")
      );
      appendManageArticleAction(actions, link.url);
      actionCell.appendChild(actions);
      row.append(previewCell, url, visibility, order, actionCell);
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
      const mappedTabs = homepageTabs
        .filter(([slug]) => Array.isArray(category.home_tabs) && category.home_tabs.includes(slug))
        .map(([, label]) => label);
      summary.textContent = `/${category.slug}/ · ${Number(category.is_active) ? "Active" : "Inactive"} · Homepage: ${mappedTabs.join(", ") || "None"}`;
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.appendChild(makeAction("Edit", () => editCategory(category)));
      card.append(title, summary, actions);
      container.appendChild(card);
    });
  }

  function clearArticleForm() {
    articleForm.reset();
    fillArticleCategorySelect();
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
      if (name === "categorySlug") selectArticleCategory(String(value ?? ""));
      else if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = value ?? "";
    });
  }

  async function editArticle(id) {
    try {
      const article = articleCatalog.find((item) => item.id === id) || articles.find((item) => item.id === id);
      if (!article) throw new Error("Article not found in the article catalog.");
      fillArticleCategorySelect(article.categorySlug);
      articleToForm(article);
      document.getElementById("articleFormTitle").textContent = "Edit article";
      document.getElementById("unpublishArticleButton").hidden = false;
      articleDialog.showModal();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  function activatePanel(panelId) {
    document.querySelectorAll(".tab-button").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.panel === panelId);
    });
    document.querySelectorAll(".manager-panel").forEach((panel) => {
      panel.hidden = panel.id !== panelId;
    });
  }

  async function openManagedArticle(article) {
    activatePanel("articlesPanel");
    document.getElementById("articleQuery").value = "";
    document.getElementById("articleCategoryFilter").value = "";
    document.getElementById("articleStatusFilter").value = "";
    try {
      await loadArticles();
      await editArticle(article.id);
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function openArticleManager() {
    activatePanel("articlesPanel");
    document.getElementById("articleQuery").value = "";
    document.getElementById("articleCategoryFilter").value = "";
    document.getElementById("articleStatusFilter").value = "";
    try {
      await loadArticles();
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
      let message = status === "published" ? "Article published." : status === "unpublished" ? "Article unpublished." : "Draft saved.";
      let isError = false;
      if (result.emailNotification?.status === "sent") {
        message += ` Email notification sent to ${result.emailNotification.sentCount} subscriber(s).`;
      } else if (result.emailNotification?.status === "failed") {
        message += ` ${result.emailNotification.message}`;
        isError = true;
      } else if (result.emailNotification?.status === "skipped") {
        message += ` ${result.emailNotification.message}`;
      }
      showMessage(dashboardMessage, message, isError);
      await Promise.all([loadArticles(), loadArticleCatalog()]);
      renderHomepageLayoutEditor();
      renderQuickLinks();
    } catch (error) {
      showMessage(errorElement, error.message);
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Delete "${article.title}" permanently? This cannot be undone.`)) return;
    try {
      await request(`articles/${article.id}`, { method: "DELETE" });
      showMessage(dashboardMessage, "Article deleted.", false);
      await Promise.all([loadArticles(), loadArticleCatalog()]);
      renderHomepageLayoutEditor();
      renderQuickLinks();
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
    document.getElementById("updateFormTitle").textContent = "Edit trending job";
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
      showMessage(dashboardMessage, "Trending job saved.", false);
      await loadUpdates();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function deleteUpdate(update) {
    if (!window.confirm(`Delete "${update.title}" from Trending Jobs?`)) return;
    try {
      await request(`latest-updates/${update.id}`, { method: "DELETE" });
      showMessage(dashboardMessage, "Trending job deleted.", false);
      await loadUpdates();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  function editQuickLink(link) {
    const form = document.getElementById("quickLinkForm");
    form.hidden = false;
    currentQuickLinkId = Number(link.id);
    form.elements.id.value = link.id;
    form.elements.title.value = link.title;
    form.elements.url.value = link.url;
    refreshQuickLinkArticleSelect();
    form.elements.bgColor.value = link.bg_color;
    form.elements.textColor.value = link.text_color;
    form.elements.positionOrder.value = Number(link.position_order);
    form.elements.isActive.checked = Number(link.is_active) === 1;
    document.getElementById("quickLinkFormTitle").textContent = "Edit quick link";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetQuickLinkForm() {
    const form = document.getElementById("quickLinkForm");
    form.reset();
    form.elements.id.value = "";
    form.elements.articleId.value = "";
    form.elements.bgColor.value = "blue";
    form.elements.textColor.value = "white";
    form.elements.positionOrder.value = quickLinks.length
      ? Math.max(...quickLinks.map((link) => Number(link.position_order))) + 1
      : 0;
    form.elements.isActive.checked = quickLinks.filter((link) => Number(link.is_active) === 1).length < 8;
    currentQuickLinkId = null;
    form.hidden = true;
  }

  async function saveQuickLink(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    data.positionOrder = Number(data.positionOrder || 0);
    data.isActive = form.elements.isActive.checked;
    delete data.articleId;
    try {
      await request(currentQuickLinkId ? `quick-links/${currentQuickLinkId}` : "quick-links", {
        method: currentQuickLinkId ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      resetQuickLinkForm();
      await loadQuickLinks();
      showMessage(dashboardMessage, "Quick link saved.", false);
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function toggleQuickLink(link) {
    const data = {
      title: link.title,
      url: link.url,
      bgColor: link.bg_color,
      textColor: link.text_color,
      positionOrder: Number(link.position_order),
      isActive: Number(link.is_active) !== 1
    };
    try {
      await request(`quick-links/${link.id}`, { method: "PUT", body: JSON.stringify(data) });
      await loadQuickLinks();
      showMessage(dashboardMessage, `Quick link ${data.isActive ? "activated" : "hidden"}.`, false);
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function deleteQuickLink(link) {
    if (!window.confirm(`Delete "${link.title}" from the homepage quick links?`)) return;
    try {
      await request(`quick-links/${link.id}`, { method: "DELETE" });
      showMessage(dashboardMessage, "Quick link deleted.", false);
      await loadQuickLinks();
    } catch (error) {
      showMessage(dashboardMessage, error.message);
    }
  }

  async function moveQuickLink(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= quickLinks.length) return;
    [quickLinks[index], quickLinks[nextIndex]] = [quickLinks[nextIndex], quickLinks[index]];
    renderQuickLinks();
    try {
      await request("quick-links/order", {
        method: "PUT",
        body: JSON.stringify({ ids: quickLinks.map((link) => Number(link.id)) })
      });
      await loadQuickLinks();
      showMessage(dashboardMessage, "Quick link order saved.", false);
    } catch (error) {
      await loadQuickLinks();
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
    form.elements.isActive.checked = Boolean(Number(category.is_active));
    renderCategoryHomeTabs(category.home_tabs || []);
    document.getElementById("categoryFormTitle").textContent = `Edit ${category.name}`;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetCategoryForm() {
    const form = document.getElementById("categoryForm");
    form.reset();
    form.elements.slug.disabled = false;
    form.elements.sortOrder.value = 100;
    renderCategoryHomeTabs([]);
    currentCategorySlug = null;
    form.hidden = true;
  }

  async function saveCategory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    if (currentCategorySlug) data.slug = currentCategorySlug;
    data.homeVisible = form.elements.homeVisible.checked;
    data.navVisible = currentCategorySlug
      ? Boolean(Number(categories.find((category) => category.slug === currentCategorySlug)?.nav_visible))
      : true;
    data.isActive = form.elements.isActive.checked;
    data.homeTabs = Array.from(form.querySelectorAll("input[name='homeTabs']:checked"), (input) => input.value);
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

  function renderCategoryHomeTabs(selectedTabs) {
    const container = document.getElementById("categoryHomeTabs");
    if (!container) return;
    const selected = new Set(selectedTabs);
    container.replaceChildren();
    homepageTabs.forEach(([slug, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "check-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "homeTabs";
      checkbox.value = slug;
      checkbox.checked = selected.has(slug);
      const text = document.createElement("span");
      text.textContent = label;
      wrapper.append(checkbox, text);
      container.appendChild(wrapper);
    });
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
    document.getElementById("updateFormTitle").textContent = "Add trending job";
  });
  document.getElementById("cancelUpdateButton").addEventListener("click", resetUpdateForm);
  document.getElementById("updateForm").addEventListener("submit", saveUpdate);
  document.getElementById("newQuickLinkButton").addEventListener("click", () => {
    resetQuickLinkForm();
    document.getElementById("quickLinkForm").hidden = false;
    document.getElementById("quickLinkFormTitle").textContent = "Add quick link";
  });
  document.getElementById("manageQuickLinkArticlesButton").addEventListener("click", openArticleManager);
  document.getElementById("manageHomepageArticlesButton").addEventListener("click", openArticleManager);
  document.getElementById("cancelQuickLinkButton").addEventListener("click", resetQuickLinkForm);
  document.getElementById("quickLinkForm").addEventListener("submit", saveQuickLink);
  document.getElementById("quickLinkForm").elements.articleId.addEventListener("change", (event) => {
    const article = articleCatalog.find((item) => String(item.id) === event.currentTarget.value);
    if (!article) return;
    const form = document.getElementById("quickLinkForm");
    form.elements.title.value = article.title;
    form.elements.url.value = articlePath(article);
  });
  document.getElementById("quickLinkForm").elements.url.addEventListener("input", refreshQuickLinkArticleSelect);
  document.getElementById("newCategoryButton").addEventListener("click", () => {
    resetCategoryForm();
    renderCategoryHomeTabs(["latest-updates"]);
    document.getElementById("categoryForm").hidden = false;
    document.getElementById("categoryFormTitle").textContent = "Add category";
  });
  document.getElementById("cancelCategoryButton").addEventListener("click", resetCategoryForm);
  document.getElementById("categoryForm").addEventListener("submit", saveCategory);
  document.getElementById("saveHomepageButton").addEventListener("click", saveHomepage);
  document.getElementById("refreshCustomerDataButton").addEventListener("click", () => {
    loadCustomerData().catch((error) => showMessage(dashboardMessage, error.message));
  });
  document.getElementById("articleQuery").addEventListener("input", () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => loadArticles().catch((error) => showMessage(dashboardMessage, error.message)), 250);
  });
  document.getElementById("articleCategoryFilter").addEventListener("change", () => loadArticles().catch((error) => showMessage(dashboardMessage, error.message)));
  document.getElementById("articleStatusFilter").addEventListener("change", () => loadArticles().catch((error) => showMessage(dashboardMessage, error.message)));
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      activatePanel(button.dataset.panel);
      if (button.dataset.panel === "customerDataPanel") {
        loadCustomerData().catch((error) => showMessage(dashboardMessage, error.message));
      }
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
