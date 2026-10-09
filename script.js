const latestPosts = [
  ["UPSC Civil Services Prelims 2025 – Admit Card Released","28 Sep 2025"],
  ["Bihar Police Constable Recruitment 2025 – Apply Online","27 Sep 2025"],
  ["SSC GD Constable Result 2025 – Check Now","26 Sep 2025"],
  ["JEE Main 2025 Session 2 Result – Download Score Card","25 Sep 2025"],
  ["PM Kisan 20th Installment – Beneficiary List Released","24 Sep 2025"],
  ["Bihar Board Exam 2025 – Latest Important Notice","22 Sep 2025"]
];

const latestList = document.getElementById("latestList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
const contactForm = document.getElementById("contactForm");
const contactApiUrl =
  window.location.protocol === "file:" ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    window.location.port !== "5000")
    ? "http://localhost:5000/api/contact"
    : "/api/contact";
const siteContentApiUrl = contactApiUrl.replace(/\/api\/contact$/, "/api/site-content");
const knownSiteCategoryIds = new Set([
  "jobs", "results", "admit", "admission", "scholarship", "yojana",
  "bihar", "career", "latest-news", "important-links", "popular-searches"
]);

async function submitContactForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const resultElement = form.querySelector("#contactResult");
  const payload = Object.fromEntries(new FormData(form).entries());

  submitButton.disabled = true;
  resultElement.textContent = "जानकारी भेजी जा रही है...";

  try {
    const response = await fetch(contactApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      resultElement.textContent = result.message || "जानकारी सेव नहीं हो सकी। कृपया दोबारा प्रयास करें।";
      return;
    }

    resultElement.textContent = "आपकी जानकारी सेव हो गई है";
    form.reset();
  } catch (error) {
    resultElement.textContent = "सर्वर से संपर्क नहीं हो सका। कृपया बाद में दोबारा प्रयास करें।";
  } finally {
    submitButton.disabled = false;
  }
}

contactForm.addEventListener("submit", submitContactForm);

function renderPosts(posts = latestPosts) {
  latestList.innerHTML = "";
  posts.forEach(([title, date]) => {
    const item = document.createElement("div");
    item.className = "latest-item";
    item.innerHTML = `<span class="title">${title}</span><span class="date">${date}</span>`;
    latestList.appendChild(item);
  });
}

function appendSafeLink(container, { title, url = "", displayDate = "", description = "" }) {
  const link = document.createElement("a");
  link.textContent = title;
  link.href = url || "#";
  if (/^https?:\/\//i.test(url)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  if (displayDate) {
    const date = document.createElement("small");
    date.textContent = displayDate;
    link.appendChild(date);
  }
  if (description) link.title = description;
  container.appendChild(link);
}

function renderManagedCategory(category, items) {
  if (category.id === "latest-updates") {
    latestList.replaceChildren();
    items.forEach((post) => {
      const item = document.createElement(post.url ? "a" : "div");
      item.className = "latest-item";
      if (post.url) {
        item.href = post.url;
        if (/^https?:\/\//i.test(post.url)) {
          item.target = "_blank";
          item.rel = "noopener noreferrer";
        }
      }
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = post.title;
      const date = document.createElement("span");
      date.className = "date";
      date.textContent = post.displayDate;
      item.append(title, date);
      latestList.appendChild(item);
    });
    return;
  }

  const cardGrid = document.querySelector(".card-grid");
  let card = Array.from(cardGrid.querySelectorAll(":scope > [data-managed-category]"))
    .find((element) => element.dataset.managedCategory === category.id);
  if (!card) {
    card = Array.from(cardGrid.children).find((element) => element.id === category.id);
  }
  if (!card && (category.homeVisible || category.navVisible)) {
    card = document.createElement("article");
    card.id = category.id;
    card.dataset.managedCategory = category.id;
    card.dataset.homeVisible = String(category.homeVisible);
    card.className = `update-card ${category.color}-card`;
    card.dataset.navView = category.id;
    const heading = document.createElement("div");
    heading.className = "card-head";
    const title = document.createElement("span");
    heading.appendChild(title);
    const list = document.createElement("ul");
    list.className = "post-list";
    card.append(heading, list);
    cardGrid.appendChild(card);
  }
  if (card) {
    card.dataset.managedCategory = category.id;
    card.dataset.homeVisible = String(category.homeVisible);
  }

  const sideCard = document.querySelector(`.right-sidebar [data-nav-view="${category.id}"]`);
  const container = card?.querySelector(".post-list") || (category.homeVisible ? null : sideCard);
  if (!container) return;

  if (container.classList.contains("post-list")) {
    const title = card.querySelector(".card-head span");
    if (title) title.textContent = `${category.icon} ${category.name}`;
    container.replaceChildren();
    items.forEach((post) => {
      const entry = document.createElement("li");
      if (post.url) appendSafeLink(entry, post);
      else entry.textContent = post.title;
      if (post.description) entry.title = post.description;
      container.appendChild(entry);
    });
    return;
  }

  Array.from(container.querySelectorAll("a")).forEach((link) => link.remove());
  items.forEach((post) => appendSafeLink(container, post));
}

function bindNavigationLink(link) {
  if (link.dataset.navigationBound) return;
  link.dataset.navigationBound = "true";
  link.addEventListener("click", () => {
    setNavigationView(link.dataset.navView);
    mainNav.classList.remove("open");
  });
}

function renderManagedNavigation(categories, pages) {
  const moreMenu = document.getElementById("moreMenu");
  const pageNames = new Map(pages.map((page) => [page.slug, page.title]));
  moreMenu.querySelectorAll("[data-nav-view]").forEach((link) => {
    const title = pageNames.get(link.dataset.navView);
    if (title) link.textContent = title;
  });

  categories.forEach((category) => {
    const existing = document.querySelector(
      `.nav-inner [data-nav-view="${category.id}"], .more-menu [data-nav-view="${category.id}"]`
    );
    if (!category.navVisible) {
      if (existing) existing.hidden = true;
      return;
    }
    if (existing) {
      existing.hidden = false;
      existing.textContent = `${category.icon} ${category.name}`;
      return;
    }
    const link = document.createElement("a");
    link.href = `#${category.id}`;
    link.dataset.navView = category.id;
    link.textContent = `${category.icon} ${category.name}`;
    moreMenu.appendChild(link);
  });

  categories.forEach(({ id }) => navigationViews.add(id));
  document.querySelectorAll(".nav-inner [data-nav-view], .more-menu [data-nav-view]")
    .forEach(bindNavigationLink);
}

function applyManagedPages(pages) {
  pages.forEach((page) => {
    if (!page.isCustomized) return;
    const section = document.querySelector(`[data-page-view="${page.slug}"]`);
    if (!section) return;
    const card = section.querySelector(".page-card");
    const eyebrow = card.querySelector(".page-eyebrow");
    card.replaceChildren();
    if (eyebrow) card.appendChild(eyebrow);
    const heading = document.createElement("h1");
    heading.textContent = page.title;
    card.appendChild(heading);
    if (page.intro) {
      const intro = document.createElement("p");
      intro.textContent = page.intro;
      card.appendChild(intro);
    }
    if (page.body) {
      page.body.split(/\n\s*\n/).filter(Boolean).forEach((paragraph) => {
        const body = document.createElement("p");
        body.textContent = paragraph;
        card.appendChild(body);
      });
    }
    if (page.slug !== "contact-us") return;

    const form = document.createElement("form");
    form.className = "contact-form";
    form.id = "contactForm";
    form.action = "#";
    form.method = "post";
    [
      ["Name", "contactName", "name", "text", "name"],
      ["Email", "contactEmail", "email", "email", "email"]
    ].forEach(([labelText, id, name, type, autocomplete]) => {
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = labelText;
      const input = document.createElement("input");
      input.id = id;
      input.name = name;
      input.type = type;
      input.autocomplete = autocomplete;
      input.required = true;
      form.append(label, input);
    });
    const messageLabel = document.createElement("label");
    messageLabel.htmlFor = "contactMessage";
    messageLabel.textContent = "Message";
    const messageInput = document.createElement("textarea");
    messageInput.id = "contactMessage";
    messageInput.name = "message";
    messageInput.rows = 6;
    messageInput.required = true;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit";
    const result = document.createElement("p");
    result.className = "form-notice";
    result.id = "contactResult";
    result.setAttribute("role", "status");
    result.setAttribute("aria-live", "polite");
    form.append(messageLabel, messageInput, submit, result);
    card.appendChild(form);
    form.addEventListener("submit", submitContactForm);
  });
}

async function loadManagedSiteContent() {
  try {
    const response = await fetch(siteContentApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Site content request failed (${response.status}).`);
    const result = await response.json();
    const content = result.data;
    if (!content || !Array.isArray(content.categories) || !Array.isArray(content.items)) {
      throw new Error("The site content response is invalid.");
    }

    const { categories, items, pages, settings } = content;
    const categoryIds = new Set(categories.map((category) => category.id));
    knownSiteCategoryIds.forEach((id) => {
      if (categoryIds.has(id)) return;
      document.querySelectorAll(`[data-nav-view="${id}"]`).forEach((element) => {
        element.hidden = true;
      });
      const staleCard = Array.from(document.querySelectorAll(".card-grid > article"))
        .find((element) => element.id === id);
      if (staleCard) staleCard.hidden = true;
    });
    const hero = document.querySelector(".hero-blue");
    hero.querySelector("h2").textContent = settings.heroTitle || "";
    hero.querySelector("p").textContent = settings.heroSubtitle || "";
    const heroButton = hero.querySelector(".yellow-btn");
    heroButton.textContent = settings.heroButtonLabel || "";
    heroButton.href = settings.heroButtonUrl || "#jobs";
    const aboutIntro = document.querySelector(".about > div > p");
    if (aboutIntro && settings.aboutIntro) aboutIntro.textContent = settings.aboutIntro;

    renderManagedNavigation(categories, pages || []);
    applyManagedPages(pages || []);
    categories.forEach((category) => {
      const existingCard = Array.from(document.querySelectorAll(".card-grid > article"))
        .find((element) => element.id === category.id);
      if (existingCard) {
        existingCard.dataset.managedCategory = category.id;
        existingCard.dataset.homeVisible = String(category.homeVisible);
      }
      const categoryItems = items.filter((item) => item.categoryId === category.id);
      if (categoryItems.length || category.managedContent) {
        renderManagedCategory(category, categoryItems);
      }
    });
    const cardGrid = document.querySelector(".card-grid");
    categories
      .filter((category) => category.homeVisible)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .forEach((category) => {
        const card = Array.from(cardGrid.children).find((element) => element.id === category.id);
        if (card) cardGrid.appendChild(card);
      });
    setNavigationView(window.location.hash.slice(1));
  } catch (error) {
    console.error("Could not load managed site content:", error);
  }
}

function getSearchText(element) {
  const values = [
    element.textContent,
    element.getAttribute("title"),
    element.getAttribute("aria-label"),
    element.getAttribute("data-search"),
    element.getAttribute("data-keywords"),
    element.getAttribute("alt")
  ];

  element.querySelectorAll("a[title], a[aria-label]").forEach((link) => {
    values.push(link.getAttribute("title"), link.getAttribute("aria-label"));
  });

  return values.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function getSearchContext(element) {
  const section = element.closest(".update-card, .side-card, .promo, .hero, .about, .footer-grid > div, nav");
  if (!section || section === element) return "";

  const heading = section.querySelector("h1, h2, h3, h4, h5, h6, .card-head, .side-title, .eyebrow");
  return heading ? heading.textContent.trim() : "";
}

function getSearchIndex() {
  const candidates = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, a, button, img[alt], .card-head, .side-title, .latest-item, [data-search], [data-keywords]"
  );

  return Array.from(candidates)
    .filter((element) => {
      if (element.closest("li") && element.tagName === "A") return false;
      if (element.tagName === "A" && element.querySelector("li")) return false;
      return true;
    })
    .map((element) => {
      const text = getSearchText(element);
      const context = getSearchContext(element);
      return { element, text, context, searchableText: `${context} ${text}`.toLocaleLowerCase() };
    })
    .filter(({ text }) => text.length > 0);
}

function highlightText(container, text, terms) {
  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const expression = new RegExp(`(${escapedTerms.join("|")})`, "gi");

  text.split(expression).forEach((part) => {
    if (terms.some((term) => part.toLocaleLowerCase() === term)) {
      const mark = document.createElement("mark");
      mark.textContent = part;
      container.appendChild(mark);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });
}

function makeSnippet(text, terms) {
  const lowerText = text.toLocaleLowerCase();
  const matchPositions = terms
    .map((term) => lowerText.indexOf(term))
    .filter((position) => position >= 0);
  if (!matchPositions.length) return text.slice(0, 140);

  const start = Math.max(0, Math.min(...matchPositions) - 45);
  const end = Math.min(text.length, start + 140);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function showSearchResults() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  searchResults.replaceChildren();
  searchResults.hidden = !query;
  if (!query) return;

  const terms = query.split(/\s+/).filter(Boolean);
  const matches = getSearchIndex().filter(({ searchableText }) =>
    terms.every((term) => searchableText.includes(term))
  );

  if (!matches.length) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "search-empty";
    emptyMessage.textContent = "No results found";
    searchResults.appendChild(emptyMessage);
    return;
  }

  matches.forEach(({ element, text, context }) => {
    const result = document.createElement("button");
    result.className = "search-result";
    result.type = "button";
    result.setAttribute("role", "option");

    const title = document.createElement("strong");
    highlightText(title, text.slice(0, 90), terms);
    result.appendChild(title);

    const snippet = makeSnippet(`${context ? `${context} · ` : ""}${text}`, terms);
    if (snippet.toLocaleLowerCase() !== text.slice(0, 90).toLocaleLowerCase()) {
      const description = document.createElement("small");
      highlightText(description, snippet, terms);
      result.appendChild(description);
    }

    result.addEventListener("click", () => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      searchResults.hidden = true;
    });
    searchResults.appendChild(result);
  });
}

searchInput.addEventListener("input", showSearchResults);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    showSearchResults();
  } else if (event.key === "Escape") {
    searchInput.value = "";
    showSearchResults();
  }
});
searchBtn.addEventListener("click", showSearchResults);

menuBtn.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

const moreToggle = document.getElementById("moreToggle");
const moreMenu = document.getElementById("moreMenu");
const navigationViews = new Set([
  "home",
  "jobs",
  "results",
  "admit",
  "admission",
  "scholarship",
  "yojana",
  "bihar",
  "career",
  "latest-news",
  "important-links",
  "popular-searches",
  "about",
  "about-us",
  "contact-us",
  "terms-and-conditions"
]);

function setNavigationView(view) {
  const selectedView = navigationViews.has(view) ? view : "home";
  const homeSectionViews = ["about-us", "contact-us", "terms-and-conditions"];
  const activeView = homeSectionViews.includes(selectedView) ? "home" : selectedView;
  document.body.dataset.navView = activeView;
  const customCard = Array.from(document.querySelectorAll(".card-grid > [data-managed-category]"))
    .find((card) => card.dataset.managedCategory === selectedView);
  document.querySelectorAll(".card-grid > [data-managed-category]").forEach((card) => {
    card.style.display = customCard
      ? card === customCard ? "block" : "none"
      : "";
  });

  document.querySelectorAll(".nav-inner [data-nav-view]").forEach((link) => {
    const isActive = link.dataset.navView === selectedView;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const moreIsActive = ["latest-news", "important-links", "popular-searches", "about", "about-us", "contact-us", "terms-and-conditions"].includes(selectedView);
  moreToggle.classList.toggle("is-active", moreIsActive);
  moreMenu.hidden = true;
  moreToggle.setAttribute("aria-expanded", "false");
}

document.querySelectorAll(".nav-inner [data-nav-view]").forEach((link) => {
  link.addEventListener("click", () => {
    setNavigationView(link.dataset.navView);
    mainNav.classList.remove("open");
  });
});

moreToggle.addEventListener("click", () => {
  const isExpanded = moreToggle.getAttribute("aria-expanded") === "true";
  moreMenu.hidden = isExpanded;
  moreToggle.setAttribute("aria-expanded", String(!isExpanded));
});

window.addEventListener("hashchange", () => {
  setNavigationView(window.location.hash.slice(1));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-right")) searchResults.hidden = true;
});

renderPosts();
setNavigationView(window.location.hash.slice(1));
loadManagedSiteContent();
